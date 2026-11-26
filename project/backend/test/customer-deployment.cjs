// Read-only deployment smoke test: SMTP authentication only, never sends email.
require('dotenv').config({ path: require('node:path').join(__dirname, '../.env'), quiet: true });
const assert = require('node:assert/strict');
const nodemailer = require('nodemailer');
(async () => {
  for (const route of ['/tra-cuu', '/api/apartments']) {
    const response = await fetch('http://127.0.0.1:5174' + route, { signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200, route);
  }
  const protectedRoute = await fetch('http://127.0.0.1:5174/api/customer/bookings', { signal: AbortSignal.timeout(15000) });
  assert.equal(protectedRoute.status, 401, 'Guest/account bookings require verified authentication');
  const secure = process.env.SMTP_SECURE === 'true';
  assert.ok(process.env.SMTP_USER && process.env.SMTP_PASS, 'SMTP credentials are required');
  const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT), secure, requireTLS: !secure, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }, connectionTimeout: 8000, socketTimeout: 15000 });
  try { await transport.verify(); } finally { transport.close(); }
  console.log('PASS: deployed lookup, API proxy, protected bookings and SMTP authentication. No email sent.');
})().catch(() => { console.error('Deployment check failed. Check web/API health and SMTP settings.'); process.exitCode = 1; });
