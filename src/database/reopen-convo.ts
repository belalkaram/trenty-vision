import { pool } from './client';

async function run() {
  try {
    await pool.query("UPDATE conversations SET status = 'open' WHERE id = '8d964ec8-6842-48fb-9936-594a1c8d6385'");
    console.log('CONVO_OPENED_SUCCESS');
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await pool.end();
  }
}

run();
