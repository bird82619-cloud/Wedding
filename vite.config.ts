import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    base: '/Wedding/', // Ensures correct paths for assets on GitHub Pages
    build: {
      outDir: 'dist',
    },
    define: {
      // Safely inject the API key
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      // Prevent crash if a library blindly accesses process.env (but don't overwrite NODE_ENV)
      'process.env': process.env.NODE_ENV === 'production' ? {} : process.env
    }
  };
});