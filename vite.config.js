import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? ''
  const base = mode === 'production' && repoName ? `/${repoName}/` : '/'

  return {
    base,
    plugins: [react(), tailwindcss()],
  }
})
