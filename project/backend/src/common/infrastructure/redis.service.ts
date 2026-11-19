import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;
  readonly shared: boolean;
  private readonly prefix: string;

  constructor(config: ConfigService) {
    this.shared = Boolean(config.get('REDIS_URL')) || config.get('VERCEL') === '1';
    this.prefix = config.get('REDIS_KEY_PREFIX', `duanmoi:${config.get('VERCEL_ENV', 'local')}`);
    this.client = new Redis(config.get('REDIS_URL', 'redis://127.0.0.1:6379'), {
      lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: 3000,
    });
    this.client.on('error', () => { /* Callers report failures without exposing credentials. */ });
  }

  key(name: string) { return `${this.prefix}:${name}`; }
  onModuleDestroy() { this.client.disconnect(); }
}
