import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// NOTE: Do not inject secret keys into the client bundle.
// Keep GEMINI_API_KEY only in server env and use server endpoints (api/genai.ts).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    // Remove any direct secret injection to client bundle.
    // If you need small non-secret flags, add them here.
    define: {
      // Example: 'process.env.NODE_ENV': JSON.stringify(env.NODE_ENV)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
