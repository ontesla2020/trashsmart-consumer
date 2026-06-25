import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      includeAssets: ['logo-icon.svg', 'favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'TrashSmart',
        short_name: 'TrashSmart',
        description: 'Scan waste, sort it right, earn rewards',
        theme_color: '#117A45',
        background_color: '#f4f6f4',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ],
  build: {
    // Never ship source maps in production — keeps the minified bundle
    // from being reversed back into readable React source.
    sourcemap: false
  },
  server: {
    host: true,
    port: 5174,
    proxy: { '/api': 'http://localhost:8788' }
  }
});
