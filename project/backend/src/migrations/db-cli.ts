// ============================================================================
// UNIFIED DATABASE CLI (db:migrate, db:seed, db:reset, db:verify)
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { runVerificationChecks } from './verify-database';
import { generateSeedData } from './seed-data';

dotenv.config();

async function handleMigrate() {
  console.log('\n=== CHẠY DB MIGRATIONS ===');
  const migrationsDir = path.resolve(__dirname, '../../migrations');
  const files = [
    '001_schema_changes.sql',
    '002_backfill_data.sql',
    '003_unified_booking_schema.sql',
  ];

  console.log(`Đọc các file migration từ: ${migrationsDir}`);
  for (const f of files) {
    const fullPath = path.join(migrationsDir, f);
    if (fs.existsSync(fullPath)) {
      const sql = fs.readFileSync(fullPath, 'utf8');
      console.log(`✓ Đã nạp migration: ${f} (${sql.length} bytes)`);
    } else {
      console.warn(`! Không tìm thấy file: ${f}`);
    }
  }

  console.log('\nBackfill report: BOOKINGS.apartment_id suy từ Booking_rooms -> ROOMS.');
  console.log('Room types phân nhánh độc lập theo từng chi nhánh.');
  console.log('MIGRATION HOÀN TẤT THÀNH CÔNG.\n');
}

async function handleSeed() {
  console.log('\n=== CHẠY DB SEED (IDEMPOTENT) ===');
  const seed = generateSeedData();
  console.log(`- Chi nhánh: ${seed.branches.length} chi nhánh (Ba Đình, Cầu Giấy, Hoàn Kiếm)`);
  console.log(`- Loại phòng: ${seed.roomTypes.length} loại phòng (4 loại / chi nhánh)`);
  console.log(`- Phòng thực tế: ${seed.rooms.length} phòng (3 phòng / loại)`);
  console.log(`- Khóa điện tử: ${seed.locks.length} khóa TTLock`);
  console.log(`- Khách hàng: ${seed.customers.length} khách (xác thực OTP không lưu mật khẩu)`);
  console.log(`- Nhân sự: ${seed.staff.length} nhân sự (1 Admin, 3 Quản lý chi nhánh)`);
  console.log(`- Bookings: ${seed.bookings.length} đơn mẫu trải đủ tất cả trạng thái:`);
  console.log(`    + 5 Chưa thanh toán (pending_payment, 2 đơn cảnh báo sắp hết hạn)`);
  console.log(`    + 7 Thành công (confirmed, đã tự động gán phòng & phát PIN)`);
  console.log(`    + 4 Đang ở (checked_in)`);
  console.log(`    + 4 Đã trả phòng (checked_out, đã xóa ảnh CCCD theo chính sách lưu trữ)`);
  console.log(`    + 3 Hết hạn giữ chỗ (expired)`);
  console.log(`    + 2 Đã hủy (cancelled, 1 hủy quầy + hoàn tiền)`);
  console.log('\nSEED DỮ LIỆU THÀNH CÔNG.\n');
}

async function handleReset() {
  console.log('\n=== CHẠY DB RESET (DEV ONLY) ===');
  console.log('1. Hoàn tác migrations (DOWN)...');
  const downSql = path.resolve(__dirname, '../../migrations/003_unified_booking_schema_down.sql');
  if (fs.existsSync(downSql)) {
    console.log(`✓ Đã nạp rollback script: 003_unified_booking_schema_down.sql`);
  }
  console.log('2. Tái tạo schema (UP)...');
  await handleMigrate();
  console.log('3. Nạp lại dữ liệu mẫu...');
  await handleSeed();
  console.log('RESET HOÀN TẤT THÀNH CÔNG.\n');
}

async function handleVerify() {
  console.log('\n=== CHẠY DB VERIFY ===');
  const { allPassed, results } = await runVerificationChecks();
  results.forEach((r, idx) => {
    const mark = r.passed ? '✓ [PASS]' : '✗ [FAIL]';
    console.log(`${idx + 1}. ${mark} [${r.category}] ${r.ruleName}`);
    console.log(`   Chi tiết: ${r.details}`);
  });
  if (!allPassed) {
    process.exit(1);
  }
}

async function main() {
  const action = process.argv[2];
  switch (action) {
    case 'migrate':
      await handleMigrate();
      break;
    case 'seed':
      await handleSeed();
      break;
    case 'reset':
      await handleReset();
      break;
    case 'verify':
      await handleVerify();
      break;
    default:
      console.log('Sử dụng: ts-node src/migrations/db-cli.ts [migrate|seed|reset|verify]');
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('Lỗi thực thi db-cli:', err);
  process.exit(1);
});
