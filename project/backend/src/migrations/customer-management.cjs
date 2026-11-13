// Customer workflow migration. Preserves requests before removing the redundant table.
require('dotenv').config({ quiet: true });
const mysql = require('mysql2/promise');
(async () => {
  const db = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE });
  try {
    const [columns] = await db.query('SHOW COLUMNS FROM CUSTOMER');
    const existing = new Set(columns.map(column => column.Field));
    for (const [name, definition] of [['password_hash', 'VARCHAR(255) NULL'], ['account_created_at', 'DATETIME NULL'], ['email_verified_at', 'DATETIME NULL']]) {
      if (!existing.has(name)) await db.query(`ALTER TABLE CUSTOMER ADD COLUMN ${name} ${definition}`);
    }
    const [bookingColumns] = await db.query('SHOW COLUMNS FROM BOOKINGS');
    for (const [name, definition] of [['checkout_data', 'JSON NULL'], ['stay_type', 'VARCHAR(32) NULL'], ['start_at', 'DATETIME NULL'], ['end_at', 'DATETIME NULL']]) {
      if (!bookingColumns.some(column => column.Field === name)) await db.query(`ALTER TABLE BOOKINGS ADD COLUMN ${name} ${definition}`);
    }
    const [roomColumns] = await db.query('SHOW COLUMNS FROM Booking_rooms');
    if (!roomColumns.some(column => column.Field === 'unit_price')) await db.query('ALTER TABLE Booking_rooms ADD COLUMN unit_price DECIMAL(12,2) NOT NULL DEFAULT 0');
    // Counter receipts can live in TRANSACTION without a payments row; refunds
    // still reference the booking and must not require a fabricated payment.
    const [refundColumns] = await db.query('SHOW COLUMNS FROM refunds');
    if (refundColumns.find(c => c.Field === 'payment_id')?.Null === 'NO') await db.query('ALTER TABLE refunds MODIFY payment_id INT NULL');
    const [legacyTable] = await db.query('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?', ['booking_requests']);
    if (legacyTable.length) {
      await db.beginTransaction();
      try {
        const [rows] = await db.query('SELECT * FROM booking_requests ORDER BY id FOR UPDATE');
        for (const row of rows) {
          const [bookings] = await db.query('SELECT id,checkout_data FROM BOOKINGS WHERE id=? FOR UPDATE', [row.booking_id]);
          if (!bookings.length) throw new Error('Legacy request has no booking');
          const saved = typeof bookings[0].checkout_data === 'string' ? JSON.parse(bookings[0].checkout_data) : bookings[0].checkout_data || {};
          const requests = saved.requests || [];
          if (requests.some(r => r.legacy_request_id === row.id)) continue;
          const [log] = await db.query('INSERT INTO Audit_logs (actor,action,entity_type,entity_id,old_value,new_value) VALUES (?,?,?,?,?,?)', [`customer:${row.customer_id}`, 'CUSTOMER_BOOKING_REQUEST', 'BOOKINGS', row.booking_id, JSON.stringify(row), JSON.stringify({ migrated_from: 'booking_requests', legacy_id: row.id })]);
          requests.push({ ...row, id: log.insertId, legacy_request_id: row.id });
          await db.query('UPDATE BOOKINGS SET checkout_data=? WHERE id=?', [JSON.stringify({ ...saved, requests }), row.booking_id]);
        }
        await db.commit();
      } catch (err) { await db.rollback(); throw err; }
      // All legacy rows have a complete copy in the booking and in Audit_logs.
      await db.query('DROP TABLE booking_requests');
    }
    console.log('Customer workflow ready on existing BOOKING/refunds tables; legacy requests preserved.');
  } finally { await db.end(); }
})().catch(() => { console.error('Customer-management migration failed. Check database access/schema.'); process.exitCode = 1; });
