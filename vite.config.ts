/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  // onnxruntime-web ships prebuilt ESM + wasm. Let it be used as-is instead of
  // being pre-bundled/transformed by Vite, which otherwise rewrites its runtime
  // .mjs/.wasm loader and breaks WASM instantiation.
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
  // Unit tests only live in src/. tests/ holds the Playwright end-to-end specs.
  test: {
    include: ['src/**/*.test.ts'],
  },
})
