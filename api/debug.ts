export default async function handler(req: any, res: any) {
  const results: any = {
    node: process.version,
    cwd: process.cwd(),
    env: {
      VERCEL: process.env.VERCEL,
      NODE_ENV: process.env.NODE_ENV,
      DEPLOYMENT_MODE: process.env.DEPLOYMENT_MODE,
      DATABASE_URL_DEFINED: !!process.env.DATABASE_URL,
    },
    imports: {},
  };

  try {
    await import('fastify');
    results.imports.fastify = 'OK';
  } catch (e: any) {
    results.imports.fastify = e.message;
  }

  try {
    await import('../src/config/index');
    results.imports.config = 'OK';
  } catch (e: any) {
    results.imports.config = e.message;
  }

  try {
    await import('../src/database/client');
    results.imports.db = 'OK';
  } catch (e: any) {
    results.imports.db = e.message;
  }

  try {
    await import('../src/app');
    results.imports.app = 'OK';
  } catch (e: any) {
    results.imports.app = e.message;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(results, null, 2));
}
