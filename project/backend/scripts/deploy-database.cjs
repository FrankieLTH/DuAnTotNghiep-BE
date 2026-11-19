// Run deliberately before deployment; never bootstraps or resets a database.
require('dotenv').config({ path: process.argv[2] || '.env', quiet: true });
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { connect } = require('../src/migrations/connection.cjs');

(async () => {
  const db = await connect();
  try {
    const [[server]] = await db.query('SELECT @@lower_case_table_names AS table_names');
    if (Number(server.table_names) !== 1) throw new Error('This schema requires MySQL lower_case_table_names=1. See VERCEL.md.');
    const [tables] = await db.query("SHOW TABLES LIKE 'apartment'");
    if (!tables.length) throw new Error('Restore database/duanmoi_schema.sql into a new database first. No schema has been created.');
  } finally { await db.end(); }

  for (const name of ['customer-management', 'room-variants', 'room-content', 'room-amenities', 'room-parents']) {
    const result = spawnSync(process.execPath, [path.join(__dirname, '../src/migrations', `${name}.cjs`)], { stdio: 'inherit', env: process.env });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Migration ${name} failed.`);
  }
  console.log('Deployment migrations completed.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
