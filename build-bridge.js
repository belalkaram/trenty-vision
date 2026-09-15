const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

async function buildBridge() {
  console.log('1. Bundling Baileys Bridge with esbuild...');

  // Ensure output dir exists
  const outDir = path.resolve(__dirname, 'dist/bridge');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  await esbuild.build({
    entryPoints: ['baileys-bridge/server.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: 'dist/bridge/bridge-bundle.js',
    loader: {
      '.html': 'text',
    },
    define: {
      'process.env.DEPLOYMENT_MODE': '"local"',
    },
    external: [
      'canvas',
      'sharp',
      'cpu-features',
      'utf-8-validate',
      'bufferutil',
    ],
    minify: false, // Keep readable for pkg
  });

  console.log('✅ esbuild bundle complete: dist/bridge/bridge-bundle.js');
}

buildBridge().catch((err) => {
  console.error('Build error:', err);
  process.exit(1);
});
