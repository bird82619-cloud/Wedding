import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    base: './', // Ensures relative paths for assets on GitHub Pages
    build: {
      outDir: 'dist',
    },
    define: {
      // Polyfill process.env.API_KEY so it is available in the browser code.
      // Use fallback to empty string to prevent 'undefined' replacement which can crash syntax.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      // Polyfill remaining process.env to prevent 'process is not defined' error
      'process.env': {}
    }
  };
});