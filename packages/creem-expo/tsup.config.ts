import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    outDir: 'dist/client',
    format: ['cjs', 'esm'],
    dts: true,
    platform: 'neutral',
    external: ['react', 'react-native', 'react-native-webview', 'expo-web-browser', 'expo-linking'],
  },
  {
    entry: { index: 'src/server/index.ts' },
    outDir: 'dist/server',
    format: ['cjs', 'esm'],
    dts: true,
    platform: 'node',
    external: ['creem', 'express'],
  },
  {
    entry: { index: 'src/plugin/index.ts' },
    outDir: 'dist/plugin',
    format: ['cjs'],
    dts: true,
    platform: 'node',
    external: ['@expo/config-plugins'],
  },
]);
