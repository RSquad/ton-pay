import { defineConfig } from 'tsup';
import { renameSync, existsSync } from 'fs';
import { join } from 'path';

export default defineConfig({
  entry: ['src/ton-pay-embed.ts'],
  format: ['iife'],
  dts: false,
  outDir: 'dist',
  sourcemap: true,
  clean: false,
  outExtension() {
    return {
      js: '.js',
    };
  },
  onSuccess: async () => {
    const globalFile = join(process.cwd(), 'dist', 'ton-pay-embed.global.js');
    const jsFile = join(process.cwd(), 'dist', 'ton-pay-embed.js');
    if (existsSync(globalFile) && !existsSync(jsFile)) {
      renameSync(globalFile, jsFile);
      const mapFile = globalFile + '.map';
      const jsMapFile = jsFile + '.map';
      if (existsSync(mapFile)) {
        renameSync(mapFile, jsMapFile);
      }
    }
  },
});


