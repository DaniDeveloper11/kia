import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Relative paths: the build works served from any subfolder or CDN.
  base: './',
  plugins: [tailwindcss()],
})
