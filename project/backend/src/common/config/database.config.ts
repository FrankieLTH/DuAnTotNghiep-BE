import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { MysqlDriver } from 'typeorm/driver/mysql/MysqlDriver';

// API connection options; migration CLI uses the same TLS and timezone settings.
export function databaseConnection(config: Pick<ConfigService, 'get'>) {
  const ca = config.get<string>('DB_SSL_CA');
  return {
    type: 'mysql' as const,
    host: config.get<string>('DB_HOST', 'localhost'),
    port: Number(config.get('DB_PORT', 3306)),
    username: config.get<string>('DB_USERNAME', 'root'),
    password: config.get<string>('DB_PASSWORD', ''),
    database: config.get<string>('DB_DATABASE', 'duantotnghiep'),
    timezone: '+07:00',
    charset: 'utf8mb4',
    ssl: String(config.get('DB_SSL', 'false')) === 'true'
      ? { rejectUnauthorized: true, ...(ca ? { ca: ca.replace(/\\n/g, '\n') } : {}) }
      : undefined,
    extra: { connectionLimit: Number(config.get('DB_POOL_SIZE', 5)), connectTimeout: 10000 },
  };
}

export async function initializeDatabase(options: DataSourceOptions): Promise<DataSource> {
  const db = await new DataSource(options).initialize();
  const pool = (db.driver as MysqlDriver).pool;
  // Match the driver's DATETIME conversion even when the provider runs in UTC.
  // mysql2 queues this before handing new connections to callers.
  pool.on('connection', connection => {
    connection.query("SET SESSION time_zone = '+07:00'", error => {
      if (error) connection.destroy();
    });
  });
  await db.query("SET SESSION time_zone = '+07:00'");
  return db;
}
