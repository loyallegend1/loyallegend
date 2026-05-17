import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,           // pinned so it doesn't collide with other Vite projects (default is 5173)
    strictPort: true,     // fail loudly if 5180 is taken, instead of silently jumping to a new port
  },
});
