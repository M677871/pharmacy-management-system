import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@apollo') || id.includes('node_modules/graphql')) {
            return 'vendor-graphql';
          }

          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react-router-dom') ||
            id.includes('node_modules/@reduxjs') ||
            id.includes('node_modules/react-redux')
          ) {
            return 'vendor-react';
          }

          if (id.includes('node_modules/socket.io-client')) {
            return 'vendor-realtime';
          }
        },
      },
    },
  },
  server: {
    port: 5173,
  },
});
