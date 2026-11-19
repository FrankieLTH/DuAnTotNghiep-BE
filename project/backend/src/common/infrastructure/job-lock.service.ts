import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RedisService } from './redis.service';

@Injectable()
export class JobLockService {
  constructor(private readonly redis: RedisService) {}

  async run(name: string, task: () => Promise<unknown>) {
    const key = this.redis.key(`jobs:${name}`);
    const token = randomUUID();
    let acquired: string | null;
    try {
      // Longer than the Vercel Function's 300-second maximum duration.
      acquired = await this.redis.client.set(key, token, 'EX', 360, 'NX');
    } catch {
      throw new ServiceUnavailableException('Không lấy được khóa tác vụ từ Redis.');
    }
    if (!acquired) return { status: 'skipped', reason: 'already_running' };
    try {
      await task();
      return { status: 'completed' };
    } finally {
      await this.redis.client.eval(
        "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
        1, key, token,
      );
    }
  }
}
