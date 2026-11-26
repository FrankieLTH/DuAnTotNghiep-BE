import 'reflect-metadata';
import { DataSource, DefaultNamingStrategy } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as users from '../src/entities/user.entity';
import * as rooms from '../src/entities/room.entity';
import * as bookings from '../src/entities/booking.entity';
import { generateSeedData } from '../src/migrations/seed-data';

// Bootstrap only the isolated local database, preserving any existing data.
async function main() {
  if (process.env.DB_DATABASE !== 'duanmoi') {
    throw new Error('Local bootstrap is restricted to the duanmoi database.');
  }
  const ds = new DataSource({
    type: 'mysql', host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD,
    database: 'duanmoi', charset: 'utf8mb4',
    namingStrategy: new class extends DefaultNamingStrategy {
      tableName(targetName: string, userSpecifiedName: string | undefined): string {
        return super.tableName(targetName, userSpecifiedName).toLowerCase();
      }
    }(),
    entities: [...Object.values(users), ...Object.values(rooms), ...Object.values(bookings)],
    synchronize: false,
  });
  await ds.initialize();
  try {
    const tables = await ds.query('SHOW TABLES');
    const tableNames: string[] = tables.map((t: any) => String(Object.values(t)[0]));
    if (!tableNames.includes('room_amenities')) {
      // Resume interrupted setup only while every existing table is empty.
      for (const name of tableNames) {
        const [{ count }] = await ds.query(`SELECT COUNT(*) AS count FROM \`${name.replace(/`/g, '``')}\``);
        if (Number(count) > 0) throw new Error('Refusing schema bootstrap on a database containing data.');
      }
      await ds.synchronize();
      // Admin supports amenities on both physical rooms and room types.
      await ds.query('ALTER TABLE room_amenities DROP PRIMARY KEY, ADD COLUMN id INT NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST, MODIFY room_id INT NULL, ADD COLUMN room_types_id INT NULL');
    }
    const [{ count }] = await ds.query('SELECT COUNT(*) AS count FROM APARTMENT');
    if (Number(count) > 0) {
      console.log('duanmoi already initialized; keeping existing data.');
      return;
    }
    const seed = generateSeedData();
    const password_hash = await bcrypt.hash('duanmoi123', 10);
    await ds.transaction(async manager => {
      await manager.getRepository(users.Role).save(seed.roles.map(r => ({ id: r.role_id, role_name: r.role_name })));
      await manager.getRepository(rooms.Apartment).save(seed.branches);
      await manager.getRepository(rooms.RoomType).save(seed.roomTypes);
      await manager.getRepository(rooms.Room).save(seed.rooms.map(r => ({ ...r, id: r.room_id })));
      await manager.getRepository(users.Staff).save(seed.staff.map(s => ({ ...s, id: s.staff_id, password_hash })));
      await manager.getRepository(users.Customer).save(seed.customers.map(c => ({ ...c, id: c.customer_id })));
      await manager.getRepository(users.User).save({ full_name: 'Admin dự án mới', email: 'admin@duanmoi.local', role_id: 1, password_hash, status: 'active' });
      await manager.getRepository(bookings.Lock).save(seed.locks);
      await manager.getRepository(bookings.PaymentMethod).save({ id: 1, method_name: 'PayOS', provider_code: 'payos', is_active: true });
      await manager.getRepository(rooms.Service).save([
        { name: 'Ăn sáng', description: 'Bữa sáng tại homestay', price: 80000, is_active: true },
        { name: 'Đưa đón sân bay', description: 'Dịch vụ đưa đón theo yêu cầu', price: 300000, is_active: true },
      ]);
      await manager.getRepository(rooms.StayTypeConfig).save([
        { stay_type: 'overnight', name: 'Qua đêm', start_time: '19:00:00', end_time: '12:00:00', price_factor: 0.7 },
        { stay_type: 'daytime', name: 'Trong ngày', start_time: '07:00:00', end_time: '17:00:00', price_factor: 0.7 },
        { stay_type: 'fullday', name: 'Qua ngày', start_time: '14:00:00', end_time: '12:00:00', price_factor: 1 },
      ]);
      const amenity = await manager.getRepository(rooms.Amenity).save({ name: 'Wi-Fi miễn phí', category: 'Tiện nghi' });
      for (const rt of seed.roomTypes) {
        await manager.getRepository(rooms.RoomImage).save({ room_types_id: rt.id, image_url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80' });
        await manager.query('INSERT INTO room_amenities (room_types_id, amenity_id) VALUES (?, ?)', [rt.id, amenity.id]);
      }
    });
    console.log(`duanmoi initialized: ${seed.branches.length} branches, ${seed.roomTypes.length} room types, ${seed.rooms.length} rooms.`);
  } finally {
    await ds.destroy();
  }
}
main().catch(error => { console.error(error); process.exit(1); });
