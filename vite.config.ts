/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base ('./') works for project sites served from /<repo>/ and for root/custom domains.
// Override with VITE_BASE (e.g. "/my-repo/") if an absolute base is preferred.
export default defineConfig({
  base: process.env.VITE_BASE ?? './',
  plugins: [react()],
  test: { include: ['src/test/**/*.test.ts'], environment: 'node' },
})
