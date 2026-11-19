// Used only by explicit migration/administration commands, never by a build.
function connectionOptions() {
  const ca = process.env.DB_SSL_CA;
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    timezone: '+07:00',
    ssl: process.env.DB_SSL === 'true'
      ? { rejectUnauthorized: true, ...(ca ? { ca: ca.replace(/\\n/g, '\n') } : {}) }
      : undefined,
  };
}
async function connect() {
  const db = await require('mysql2/promise').createConnection(connectionOptions());
  await db.query("SET SESSION time_zone = '+07:00'");
  return db;
}
module.exports = { connectionOptions, connect };
