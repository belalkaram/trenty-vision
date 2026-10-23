const path = require('path');
const esbuild = require('esbuild');

const stubPlugin = {
  name: 'stub-modules',
  setup(build) {
    // Stub @whiskeysockets/baileys with a lightweight serverless-friendly mock
    build.onResolve({ filter: /^@whiskeysockets\/baileys$/ }, () => {
      return { path: path.resolve(__dirname, 'src/stubs/baileys.stub.ts') };
    });

    // Stub session.manager in Vercel serverless build
    build.onResolve({ filter: /[/\\]session\.manager(\.ts)?$/ }, () => {
      return { path: path.resolve(__dirname, 'src/stubs/session-manager.stub.ts') };
    });
  },
};

esbuild.build({
  entryPoints: ['src/vercel-handler.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'api/index.js',
  define: {
    'process.env.VERCEL': '"1"',
  },
  plugins: [stubPlugin],
  external: [
    'canvas',
    'sharp',
    'cpu-features',
    'utf-8-validate',
    'bufferutil',
  ],
  minify: true,
}).then(() => {
  console.log('Build succeeded: api/index.js');
}).catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
