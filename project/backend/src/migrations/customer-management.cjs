// Additive local migration. Never synchronizes or resets existing tables.
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
    await db.query(`CREATE TABLE IF NOT EXISTS booking_requests (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      booking_id INT NOT NULL, customer_id INT NOT NULL,
      type ENUM('cancel','refund','extend','change_room') NOT NULL,
      status ENUM('pending','reviewing','resolved','rejected') NOT NULL DEFAULT 'pending',
      reason TEXT NOT NULL, requested_end_date DATE NULL, requested_room_type_id INT NULL,
      staff_reply TEXT NULL, handled_by VARCHAR(255) NULL, handled_at DATETIME NULL,
      created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      INDEX idx_booking_requests_booking_created (booking_id, created_at),
      CONSTRAINT fk_customer_request_booking FOREIGN KEY (booking_id) REFERENCES BOOKINGS(id) ON DELETE CASCADE,
      CONSTRAINT fk_customer_request_customer FOREIGN KEY (customer_id) REFERENCES CUSTOMER(customer_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    console.log('booking_requests ready; existing customer and booking data preserved.');
  } finally { await db.end(); }
})().catch(() => { console.error('Customer-management migration failed. Check database access/schema.'); process.exitCode = 1; });
