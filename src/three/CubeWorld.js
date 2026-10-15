import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/**
 * CubeWorld — a small imperative three.js engine for unit-cube scenes.
 *
 * Everything in the app (rulers, tiles, unit cubes, crates) is drawn from four
 * declarative lists, which React passes in through <World />:
 *   cells    – unit cubes / tiles, drawn with ONE InstancedMesh (per-cube colour)
 *   outlines – box edges (crates), with optional translucent "glass" faces
 *   solids   – plain boxes (ruler bar, tick marks)
 *   labels   – text sprites that always face the camera
 *   lines    – thin line segments (floor grids)
 *
 * Cells are diffed by key, so new cubes "grow" in, colours fade smoothly and
 * nothing is ever rebuilt at the origin (the old Merge Highlight bug).
 */

const GROW_TIME = 0.45; // seconds for a new cube to grow in
const DEFAULT_DIR = new THREE.Vector3(0.78, 0.62, 1).normalize();

const tmpObj = new THREE.Object3D();
const tmpVec = new THREE.Vector3();

function easeOutBack(t) {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function nextPow2(n) {
  let p = 64;
  while (p < n) p *= 2;
  return p;
}

export class CubeWorld {
  constructor(container) {
    this.container = container;
    this.disposed = false;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.touchAction = "none";
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 4000);
    camera.position.set(10, 9, 12);
    this.camera = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.minDistance = 2;
    controls.maxDistance = 400;
    controls.addEventListener("start", () => {
      this.userMoved = true;
      this.tween = null;
    });
    this.controls = controls;

    scene.add(new THREE.HemisphereLight(0xdbe3ff, 0x1a2147, 1.25));
    const sun = new THREE.DirectionalLight(0xffffff, 1.7);
    sun.position.set(8, 16, 11);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x8fb0ff, 0.45);
    rim.position.set(-10, 6, -8);
    scene.add(rim);

    this.grid = null;
    this.gridSize = 0;
    this.ensureGrid(40);

    // Instanced unit cubes
    this.cubeGeo = new THREE.BoxGeometry(1, 1, 1);
    this.cubeMat = new THREE.MeshStandardMaterial({ roughness: 0.48, metalness: 0.12 });
    this.mesh = null;
    this.capacity = 0;
    this.cells = new Map(); // key -> state
    this.order = [];
    this.needsMatrix = false;
    this.needsColor = false;

    this.outlineGroup = new THREE.Group();
    this.solidGroup = new THREE.Group();
    this.labelGroup = new THREE.Group();
    this.lineGroup = new THREE.Group();
    scene.add(this.outlineGroup, this.solidGroup, this.labelGroup, this.lineGroup);
    this.textureCache = new Map();

    this.bounds = new THREE.Box3(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 1, 1));
    this.lastBoundsKey = "";
    this.userMoved = false;
    this.tween = null;
    this.firstFit = true;

    this.clock = new THREE.Clock();
    this.time = 0;

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  /* ---------------- grid ---------------- */
  ensureGrid(size) {
    const s = Math.max(40, Math.ceil(size / 10) * 10);
    if (this.grid && s === this.gridSize) return;
    if (this.grid) {
      this.scene.remove(this.grid);
      this.grid.geometry.dispose();
      this.grid.material.dispose();
    }
    this.grid = new THREE.GridHelper(s, s, 0x2a3a7a, 0x1a2757);
    this.grid.position.set(0, -0.012, 0);
    this.scene.add(this.grid);
    this.gridSize = s;
  }

  /* ---------------- cells ---------------- */
  ensureCapacity(n) {
    if (n <= this.capacity && this.mesh) {
      this.mesh.count = n;
      return;
    }
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.dispose();
    }
    this.capacity = nextPow2(n);
    const mesh = new THREE.InstancedMesh(this.cubeGeo, this.cubeMat, this.capacity);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.capacity * 3), 3);
    mesh.frustumCulled = false;
    mesh.count = n;
    this.mesh = mesh;
    this.scene.add(mesh);
    this.needsMatrix = true;
    this.needsColor = true;
  }

  /**
   * @param {Array<{key:string,p:number[],s:number[],color:string,delay?:number,grow?:boolean}>} list
   */
  setCells(list) {
    const now = this.time;
    const seen = new Set();
    const next = new Map();
    // Stagger delays are relative to the earliest *new* cube, so adding one
    // layer on top of a tall stack still appears immediately.
    let minDelay = Infinity;
    for (const c of list) {
      if (!this.cells.has(c.key)) minDelay = Math.min(minDelay, c.delay || 0);
    }
    if (!Number.isFinite(minDelay)) minDelay = 0;
    for (const c of list) {
      if (seen.has(c.key)) continue;
      seen.add(c.key);
      let st = this.cells.get(c.key);
      if (!st) {
        const grow = c.grow !== false;
        st = {
          pos: new THREE.Vector3(),
          size: new THREE.Vector3(),
          color: new THREE.Color(c.color),
          target: new THREE.Color(c.color),
          born: grow ? now + (c.delay || 0) - minDelay : -999,
        };
      } else {
        st.target.set(c.color);
      }
      st.pos.set(c.p[0], c.p[1], c.p[2]);
      st.size.set(c.s[0], c.s[1], c.s[2]);
      next.set(c.key, st);
    }
    this.cells = next;
    this.order = Array.from(next.values());
    this.ensureCapacity(this.order.length);
    this.needsMatrix = true;
    this.needsColor = true;
    this.updateBounds();
  }

  writeCells() {
    if (!this.mesh) return;
    const now = this.time;
    let animating = false;
    let colorAnimating = false;
    for (let i = 0; i < this.order.length; i++) {
      const st = this.order[i];
      let k = 1;
      if (now < st.born + GROW_TIME) {
        const t = Math.max(0, (now - st.born) / GROW_TIME);
        k = Math.max(0.0001, easeOutBack(t));
        animating = true;
      }
      if (this.needsMatrix || animating) {
        tmpObj.position.copy(st.pos);
        tmpObj.scale.set(st.size.x * k, st.size.y * k, st.size.z * k);
        tmpObj.updateMatrix();
        this.mesh.setMatrixAt(i, tmpObj.matrix);
      }
      if (!st.color.equals(st.target)) {
        st.color.lerp(st.target, 0.16);
        if (Math.abs(st.color.r - st.target.r) + Math.abs(st.color.g - st.target.g) + Math.abs(st.color.b - st.target.b) < 0.004) {
          st.color.copy(st.target);
        }
        colorAnimating = true;
      }
      if (this.needsColor || colorAnimating) {
        this.mesh.setColorAt(i, st.color);
      }
    }
    this.mesh.count = this.order.length;
    if (this.needsMatrix || animating) this.mesh.instanceMatrix.needsUpdate = true;
    if ((this.needsColor || colorAnimating) && this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.needsMatrix = animating;
    this.needsColor = colorAnimating;
  }

  /* ---------------- outlines / solids / lines / labels ---------------- */
  clearGroup(group) {
    for (const child of [...group.children]) {
      group.remove(child);
      child.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material && !o.userData.sharedMaterial) o.material.dispose();
      });
    }
  }

  setOutlines(list) {
    this.clearGroup(this.outlineGroup);
    for (const o of list) {
      const box = new THREE.BoxGeometry(o.size[0], o.size[1], o.size[2]);
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(box),
        new THREE.LineBasicMaterial({ color: o.color || "#8ea2ff", transparent: true, opacity: o.opacity ?? 1 })
      );
      edges.position.set(o.center[0], o.center[1], o.center[2]);
      this.outlineGroup.add(edges);
      if (o.fill) {
        const glass = new THREE.Mesh(
          box,
          new THREE.MeshBasicMaterial({
            color: o.fill,
            transparent: true,
            opacity: o.fillOpacity ?? 0.08,
            depthWrite: false,
            side: THREE.DoubleSide,
          })
        );
        glass.position.copy(edges.position);
        glass.renderOrder = 2;
        this.outlineGroup.add(glass);
      } else {
        box.dispose();
      }
    }
    this.updateBounds();
  }

  setSolids(list) {
    this.clearGroup(this.solidGroup);
    for (const s of list) {
      const mat = s.basic
        ? new THREE.MeshBasicMaterial({ color: s.color })
        : new THREE.MeshStandardMaterial({ color: s.color, roughness: 0.5, metalness: 0.15 });
      const m = new THREE.Mesh(new THREE.BoxGeometry(s.size[0], s.size[1], s.size[2]), mat);
      m.position.set(s.center[0], s.center[1], s.center[2]);
      this.solidGroup.add(m);
      if (s.edges) {
        const e = new THREE.LineSegments(
          new THREE.EdgesGeometry(m.geometry),
          new THREE.LineBasicMaterial({ color: s.edges })
        );
        e.position.copy(m.position);
        this.solidGroup.add(e);
      }
    }
    this.updateBounds();
  }

  setLines(list) {
    this.clearGroup(this.lineGroup);
    for (const l of list) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(l.points.flat(), 3));
      const seg = new THREE.LineSegments(
        geo,
        new THREE.LineBasicMaterial({ color: l.color || "#9fb2ff", transparent: true, opacity: l.opacity ?? 0.9 })
      );
      this.lineGroup.add(seg);
    }
  }

  labelTexture(text, color, bg) {
    const key = `${text}|${color}|${bg}`;
    const hit = this.textureCache.get(key);
    if (hit) {
      hit.used = true;
      return hit;
    }
    const fontPx = 64;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const font = `700 ${fontPx}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
    ctx.font = font;
    const padX = bg ? 26 : 8;
    const padY = bg ? 14 : 6;
    const w = Math.ceil(ctx.measureText(text).width + padX * 2);
    const h = fontPx + padY * 2;
    canvas.width = w;
    canvas.height = h;
    ctx.font = font;
    if (bg) {
      ctx.fillStyle = bg;
      const r = h / 2.4;
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.arcTo(w, 0, w, h, r);
      ctx.arcTo(w, h, 0, h, r);
      ctx.arcTo(0, h, 0, 0, r);
      ctx.arcTo(0, 0, w, 0, r);
      ctx.closePath();
      ctx.fill();
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (!bg) {
      ctx.lineWidth = 10;
      ctx.strokeStyle = "rgba(8,12,32,0.85)";
      ctx.strokeText(text, w / 2, h / 2 + 3);
    }
    ctx.fillStyle = color;
    ctx.fillText(text, w / 2, h / 2 + 3);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const entry = { tex, aspect: w / h, used: true };
    this.textureCache.set(key, entry);
    return entry;
  }

  setLabels(list) {
    for (const child of [...this.labelGroup.children]) {
      this.labelGroup.remove(child);
      child.material.dispose();
    }
    for (const v of this.textureCache.values()) v.used = false;
    for (const l of list) {
      const entry = this.labelTexture(l.text, l.color || "#e5e9ff", l.bg || null);
      // sizeAttenuation:false keeps labels the same size on screen however far
      // the camera zooms (l.size 0.42 ≈ 28 px; a little smaller on phones).
      const mat = new THREE.SpriteMaterial({
        map: entry.tex,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        sizeAttenuation: false,
      });
      const sp = new THREE.Sprite(mat);
      sp.userData.px = (l.size || 0.5) * 66;
      sp.userData.aspect = entry.aspect;
      sp.position.set(l.p[0], l.p[1], l.p[2]);
      sp.renderOrder = 20;
      this.labelGroup.add(sp);
    }
    this.scaleLabels();
    for (const [k, v] of this.textureCache) {
      if (!v.used) {
        v.tex.dispose();
        this.textureCache.delete(k);
      }
    }
    this.updateBounds();
  }

  scaleLabels() {
    const H = this.container.clientHeight || 600;
    const k = Math.min(1, Math.max(0.75, H / 730));
    const ndc = 1 / Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    for (const sp of this.labelGroup.children) {
      const h = (sp.userData.px * k * 2) / (ndc * H);
      sp.scale.set(h * sp.userData.aspect, h, 1);
    }
  }

  /* ---------------- camera framing ---------------- */
  computeBounds() {
    const b = new THREE.Box3();
    for (const st of this.order) {
      tmpVec.copy(st.size).multiplyScalar(0.5);
      b.expandByPoint(tmpVec.clone().add(st.pos));
      b.expandByPoint(st.pos.clone().sub(tmpVec));
    }
    for (const g of [this.outlineGroup, this.solidGroup]) {
      if (g.children.length) b.union(new THREE.Box3().setFromObject(g));
    }
    for (const sp of this.labelGroup.children) b.expandByPoint(sp.position);
    if (b.isEmpty()) b.set(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 1, 1));
    return b;
  }

  updateBounds() {
    const b = this.computeBounds();
    const key = [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].map((v) => v.toFixed(2)).join(",");
    if (key === this.lastBoundsKey) return;
    this.lastBoundsKey = key;
    this.bounds.copy(b);
    const size = b.getSize(new THREE.Vector3());
    this.ensureGrid(Math.max(size.x, size.z) * 2 + 20);
    this.frame(this.firstFit ? "instant" : "soft");
    this.firstFit = false;
  }

  /**
   * Smallest camera distance (looking along `dir` at the bounds centre) at
   * which every corner of the content box is inside the view. Tighter than a
   * bounding sphere, so long rulers and tall towers fill the stage.
   */
  fitDistance(dir) {
    const b = this.bounds;
    const center = b.getCenter(new THREE.Vector3());
    const back = dir.clone().normalize();
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), back);
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
    right.normalize();
    const up = new THREE.Vector3().crossVectors(back, right).normalize();
    const tanV = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    const tanH = tanV * this.camera.aspect;
    let d = 0;
    const q = new THREE.Vector3();
    for (let i = 0; i < 8; i++) {
      q.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).sub(center);
      const z = q.dot(back);
      d = Math.max(d, z + Math.abs(q.dot(right)) / tanH, z + Math.abs(q.dot(up)) / tanV);
    }
    return { center, dist: Math.max(4, d * 1.12 + 0.6) };
  }

  setDefaultDir(v) {
    if (!v) return;
    this.defaultDir = new THREE.Vector3(v[0], v[1], v[2]).normalize();
  }

  /**
   * mode: "instant" | "soft" | "reset"
   *  soft  – glide the orbit target to the new centre and only zoom out when
   *          the content no longer fits (or zoom in if it is now tiny)
   *  reset – glide back to the default viewing angle
   */
  frame(mode = "soft") {
    const cam = this.camera;
    const target = this.controls.target;
    const dir =
      mode === "soft" && this.userMoved
        ? cam.position.clone().sub(target).normalize()
        : (this.defaultDir || DEFAULT_DIR).clone();
    const { center, dist } = this.fitDistance(dir);
    let d = dist;
    if (mode === "soft" && this.userMoved) {
      const cur = cam.position.distanceTo(target);
      d = cur < dist ? dist : cur > dist * 2.2 ? dist * 1.25 : cur;
    }
    const toTarget = center.clone();
    const toPos = center.clone().add(dir.multiplyScalar(d));
    if (mode === "instant") {
      target.copy(toTarget);
      cam.position.copy(toPos);
      this.controls.update();
      this.tween = null;
      return;
    }
    if (mode === "reset") this.userMoved = false;
    this.tween = {
      t: 0,
      fromT: target.clone(),
      fromP: cam.position.clone(),
      toT: toTarget,
      toP: toPos,
    };
  }

  resetView() {
    this.frame("reset");
  }

  /* ---------------- loop ---------------- */
  resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.scaleLabels();
    if (this.order) this.frame(this.userMoved ? "soft" : "instant");
  }

  loop() {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.1);
    this.time += dt;

    if (this.tween) {
      const tw = this.tween;
      tw.t = Math.min(1, tw.t + dt / 0.6);
      const e = 1 - Math.pow(1 - tw.t, 3);
      this.controls.target.lerpVectors(tw.fromT, tw.toT, e);
      this.camera.position.lerpVectors(tw.fromP, tw.toP, e);
      if (tw.t >= 1) this.tween = null;
    }
    this.controls.update();
    this.writeCells();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    for (const g of [this.outlineGroup, this.solidGroup, this.lineGroup]) this.clearGroup(g);
    for (const child of [...this.labelGroup.children]) child.material.dispose();
    for (const v of this.textureCache.values()) v.tex.dispose();
    this.textureCache.clear();
    if (this.mesh) this.mesh.dispose();
    this.cubeGeo.dispose();
    this.cubeMat.dispose();
    if (this.grid) {
      this.grid.geometry.dispose();
      this.grid.material.dispose();
    }
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

