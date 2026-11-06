import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { createConnection } from 'mysql2/promise';
import { DataSource } from 'typeorm';
import * as users from '../entities/user.entity';
import * as rooms from '../entities/room.entity';
import * as bookings from '../entities/booking.entity';
import { generateSeedData } from './seed-data';

dotenv.config();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('db:init:local is only available for local development.');
  }
  const database = process.env.DB_DATABASE || 'duantotnghiep';
  if (!/^[a-zA-Z0-9_]+$/.test(database)) throw new Error('Invalid database name.');
  const connection = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
  };
  const mysql = await createConnection(connection);
  try {
    await mysql.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  } finally {
    await mysql.end();
  }
  const source = new DataSource({
    type: 'mysql', host: connection.host, port: connection.port,
    username: connection.user, password: connection.password, database,
    entities: [...Object.values(users), ...Object.values(rooms), ...Object.values(bookings)],
    synchronize: false,
  });
  await source.initialize();
  try {
    const [settings] = await source.query('SELECT @@lower_case_table_names AS lowerCaseNames');
    if (Number(settings.lowerCaseNames) === 1) {
      // Windows MySQL stores table names in lowercase; match them during schema inspection.
      for (const entity of source.entityMetadatas) {
        entity.tableName = entity.tableName.toLowerCase();
        entity.tablePath = entity.tablePath.toLowerCase();
      }
    }
    const tables = await source.query('SHOW TABLES');
    if (tables.length) {
      const knownTables = new Set(source.entityMetadatas.map((entity) => entity.tableName.toLowerCase()));
      for (const table of tables) {
        const name = String(Object.values(table)[0]);
        if (!knownTables.has(name.toLowerCase())) throw new Error('Database contains an unknown table; initialization stopped.');
        const [row] = await source.query(`SELECT COUNT(*) AS total FROM \`${name}\``);
        if (Number(row.total) > 0) {
          console.log('Database already contains data; left existing schema and data unchanged.');
          return;
        }
      }
    }
    // Only create schema when every existing application table is empty.
    await source.synchronize();
    const seed = generateSeedData();
    await source.transaction(async (manager) => {
      await manager.getRepository(users.Role).save([
        { id: 1, role_name: 'admin' },
        { id: 2, role_name: 'manager' },
        { id: 3, role_name: 'customer' },
      ]);
      await manager.getRepository(rooms.Apartment).save(seed.branches);
      await manager.getRepository(rooms.RoomType).save(seed.roomTypes);
      await manager.getRepository(rooms.Room).save(seed.rooms.map(({ room_id, status, ...room }) => ({
        ...room, id: room_id, status: status === 'maintenance' ? 'maintenance' as const : 'available' as const,
      })));
      await manager.getRepository(bookings.Lock).save(seed.locks);
      await manager.getRepository(users.Customer).save(seed.customers.map(({ customer_id, ...customer }) => ({ ...customer, id: customer_id })));
    });
    console.log('Local database initialized: 3 branches, 12 room types, 36 rooms and sample customers/locks.');
  } finally {
    await source.destroy();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
