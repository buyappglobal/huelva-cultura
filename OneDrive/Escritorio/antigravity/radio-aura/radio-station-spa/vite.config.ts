import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import fs from 'fs';

// A simple plugin to inject a build version/timestamp comment into dist/sw.js on build.
// This forces the browser to detect the file byte difference and prompt the user to update.
const swVersionPlugin = () => {
  return {
    name: 'sw-version-plugin',
    closeBundle() {
      const swPath = path.resolve(__dirname, 'dist/sw.js');
      if (fs.existsSync(swPath)) {
        let content = fs.readFileSync(swPath, 'utf8');
        const timestamp = new Date().toISOString();
        content = `// Build version: ${timestamp}\n` + content;
        fs.writeFileSync(swPath, content);
        console.log(`[sw-version-plugin] Injected build timestamp: ${timestamp}`);
      }
    }
  };
};

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), swVersionPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name]-[hash]-v2.js',
          chunkFileNames: 'assets/[name]-[hash]-v2.js',
          assetFileNames: 'assets/[name]-[hash]-v2.[ext]',
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
