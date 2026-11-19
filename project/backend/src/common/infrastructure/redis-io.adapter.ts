import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

type SocketServer = Parameters<IoAdapter['close']>[0];

export class RedisIoAdapter extends IoAdapter {
  private subscriber: Redis;
  private adapter: ReturnType<typeof createAdapter>;

  constructor(app: INestApplicationContext, private readonly redis: RedisService) { super(app); }

  async connect() {
    this.subscriber = this.redis.client.duplicate({ lazyConnect: true });
    this.subscriber.on('error', () => { /* No connection URLs in logs. */ });
    await Promise.all([
      this.redis.client.status === 'wait' ? this.redis.client.connect() : Promise.resolve(),
      this.subscriber.connect(),
    ]);
    this.adapter = createAdapter(this.redis.client, this.subscriber, { key: this.redis.key('socket.io') });
  }

  createIOServer(port: number, options?: any): SocketServer {
    const server = super.createIOServer(port, {
      ...options,
      // A WebSocket stays on one Function instance; polling would need stickiness.
      ...(process.env.VERCEL === '1' ? { transports: ['websocket'] } : {}),
    });
    server.adapter(this.adapter);
    return server;
  }

  async close(server: SocketServer) {
    await super.close(server);
    this.subscriber?.disconnect();
  }
}
