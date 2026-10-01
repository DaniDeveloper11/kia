import { resolve } from 'node:path'

import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Relative paths: the build works served from any subfolder or CDN.
  base: './',
  plugins: [tailwindcss()],
  build: {
    rollupOptions: {
      // Multi-page build: the landing plus the two standalone legal pages.
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        privacy: resolve(import.meta.dirname, 'privacy.html'),
        terms: resolve(import.meta.dirname, 'terms.html'),
        esIndex: resolve(import.meta.dirname, 'es/index.html'),
        esPrivacidad: resolve(import.meta.dirname, 'es/privacidad.html'),
        esTerminos: resolve(import.meta.dirname, 'es/terminos.html'),
      },
    },
  },
})
