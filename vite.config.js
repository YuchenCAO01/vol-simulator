import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Relative base so the build works at https://<user>.github.io/<repo>/ and
// anywhere else (the app uses hash routes, so no server rewrites are needed).
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
