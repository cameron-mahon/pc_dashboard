import { defineConfig } from 'vite';
import { readdirSync } from 'fs';
import { resolve } from 'path';

const dashDir = resolve(__dirname, 'dashboard');
const htmlFiles = readdirSync(dashDir).filter(f => f.endsWith('.html'));

const input = {};
for (const file of htmlFiles) {
  const name = file.replace('.html', '');
  input[name] = resolve(dashDir, file);
}

export default defineConfig({
  root: 'dashboard',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: { input },
  },
});
