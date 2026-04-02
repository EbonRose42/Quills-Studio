import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';

const rootDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(rootDir, '../..');

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
      },
      preload: {
        input: 'electron/preload.ts',
      },
    }),
  ],
  resolve: {
    alias: {
      '@quills/shared': resolve(workspaceRoot, 'packages/shared/src/index.ts'),
      '@quills/studio-core': resolve(workspaceRoot, 'packages/studio-core/src/index.ts'),
      '@quills/agent-runtime': resolve(workspaceRoot, 'packages/agent-runtime/src/index.ts'),
      '@quills/devtools': resolve(workspaceRoot, 'packages/devtools/src/index.ts'),
      '@quills/mcp': resolve(workspaceRoot, 'packages/mcp/src/index.ts'),
      '@quills/ui': resolve(workspaceRoot, 'packages/ui/src/index.ts'),
    },
  },
  build: {
    outDir: 'dist',
  },
});
