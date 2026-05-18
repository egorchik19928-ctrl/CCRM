import path from 'node:path'
import { rmSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import pkg from './package.json'

export default defineConfig(({ command }) => {
  rmSync('dist-electron', { recursive: true, force: true })
  const isBuild = command === 'build'
  return {
    resolve: { alias: { '@': path.join(__dirname, 'src') } },
    plugins: [
      react(),
      electron({
        main: {
          entry: 'electron/main/index.ts',
          onstart(args) {
            args.startup()
          },
          vite: {
            build: {
              minify: isBuild,
              outDir: 'dist-electron/main',
              rollupOptions: {
                external: Object.keys(pkg.dependencies ?? {}),
              },
            },
          },
        },
        preload: {
          input: 'electron/preload/index.ts',
          vite: {
            build: {
              minify: isBuild,
              outDir: 'dist-electron/preload',
              rollupOptions: {
                external: Object.keys(pkg.dependencies ?? {}),
              },
            },
          },
        },
        renderer: {},
      }),
    ],
    clearScreen: false,
  }
})
