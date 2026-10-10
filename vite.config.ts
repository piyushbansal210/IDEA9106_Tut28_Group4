import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  plugins: [react()],
  // Production builds are served from GitHub Pages at /IDEA9106_Tut28_Group4/. Override with BASE_PATH to host elsewhere.
  base: command === 'build' || isPreview ? (process.env.BASE_PATH ?? '/IDEA9106_Tut28_Group4/') : '/',
}))
