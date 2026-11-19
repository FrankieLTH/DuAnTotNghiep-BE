require('dotenv').config({ path: process.argv[2] || '.env', quiet: true });
const bcrypt = require('bcrypt');
const { connect } = require('../src/migrations/connection.cjs');

(async () => {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) in the private env file.');
  }
  const db = await connect();
  try {
    const [[existing]] = await db.query('SELECT staff_id FROM STAFF WHERE email=? LIMIT 1', [email]);
    if (existing) throw new Error('This staff account already exists; refusing to overwrite its credentials.');
    const [[role]] = await db.query('SELECT role_id FROM ROLES WHERE role_id=1 AND role_name=\'admin\'');
    if (!role) throw new Error('Import the reference seed containing the admin role first.');
    await db.query('INSERT INTO STAFF (role_id,full_name,email,password_hash,is_blocked) VALUES (1,?,?,?,0)', [
      process.env.ADMIN_NAME || 'Administrator', email, await bcrypt.hash(password, 12),
    ]);
    console.log('Administrator created.');
  } finally { await db.end(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
