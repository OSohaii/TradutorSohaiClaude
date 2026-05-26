import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const backendTarget = env.BACKEND_URL || 'http://localhost:8000';
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: ['.preview.emergentagent.com', 'localhost'],
        // Forward /api/* to the FastAPI BFF during development.
        // Set BACKEND_URL in .env if your backend runs elsewhere.
        proxy: {
          '/api': {
            target: backendTarget,
            changeOrigin: true,
          },
        },
      },
      plugins: [react()],
      // NOTE: process.env.API_KEY is kept here for backwards-compat with the
      // existing geminiService that reads it directly. Phase 1b removes it
      // entirely once the frontend migrates to /api/pipeline.
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
