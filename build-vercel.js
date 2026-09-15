const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/vercel-handler.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'api/[...path].js',
  define: {
    'process.env.VERCEL': '"1"',
  },
  external: [
    '@whiskeysockets/baileys',
    'canvas',
    'sharp',
    'cpu-features',
    'utf-8-validate',
    'bufferutil',
  ],
  minify: true,
}).then(() => {
  console.log('Build succeeded: api/[...path].js');
}).catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
