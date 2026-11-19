// ============================================================================
// REALTIME SYNC SERVICE (SSE Stream & Polling Fallback)
// Phát sự kiện post-commit: ID-only payload (Zero PII leak)
// ============================================================================

import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { Subject, Observable, defer, timer } from 'rxjs';
import { filter, map, exhaustMap, mergeMap } from 'rxjs/operators';
import { REALTIME_EVENTS, RealtimeEventType } from '@shared/index';
import { RedisService } from '../../common/infrastructure/redis.service';

export interface DomainEvent {
  id: string;
  type: RealtimeEventType;
  apartment_id?: number | null;
  customer_id?: number | null;
  entity_id: number;
  timestamp: string;
}

@Injectable()
export class RealtimeSyncService {
  private readonly logger = new Logger(RealtimeSyncService.name);
  private readonly eventBus$ = new Subject<DomainEvent>();
  private readonly eventHistory: DomainEvent[] = [];
  private readonly MAX_HISTORY = 200;
  constructor(private readonly redis: RedisService) {}

  /**
   * Phát sự kiện miền sau khi database transaction commit thành công.
   * Payload chỉ chứa ID và event type để bảo vệ dữ liệu cá nhân (Không chứa PII).
   */
  async emitPostCommit(
    type: RealtimeEventType,
    entityId: number,
    options?: { apartment_id?: number | null; customer_id?: number | null }
  ): Promise<void> {
    const event: DomainEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type,
      apartment_id: options?.apartment_id ?? null,
      customer_id: options?.customer_id ?? null,
      entity_id: entityId,
      timestamp: new Date().toISOString(),
    };

    this.eventHistory.push(event);
    if (this.eventHistory.length > this.MAX_HISTORY) {
      this.eventHistory.shift();
    }

    if (this.redis.shared) {
      try {
        const key = this.redis.key('realtime:history');
        const results = await this.redis.client.multi()
          .lpush(key, JSON.stringify(event)).ltrim(key, 0, this.MAX_HISTORY - 1).expire(key, 3600).exec();
        if (!results || results.some(([error]) => error)) throw new Error('Redis write failed');
      } catch {
        // Booking writes have already committed. Never report them as rolled back.
        this.logger.warn('Could not persist realtime event; clients can refresh to reload current data.');
      }
    }

    this.logger.log(`[Realtime Event Emitted] ${event.type} -> entity_id: ${entityId}, apt: ${event.apartment_id}, cust: ${event.customer_id}`);
    this.eventBus$.next(event);
  }

  /**
   * Luồng SSE theo chi nhánh (kênh công khai) hoặc theo khách hàng (kênh riêng)
   */
  getEventStream(filters?: {
    apartment_id?: number;
    customer_id?: number;
    isStaff?: boolean;
  }): Observable<{ data: DomainEvent }> {
    if (this.redis.shared) {
      return defer(() => {
        const seen = new Set<string>();
        let since = new Date().toISOString();
        return timer(0, 2000).pipe(
          exhaustMap(() => this.readHistory(new Date(Date.parse(since) - 60000).toISOString())),
          mergeMap(events => events.filter(event => {
            if (seen.has(event.id)) return false;
            seen.add(event.id);
            if (seen.size > 500) seen.delete(seen.values().next().value);
            if (event.timestamp > since) since = event.timestamp;
            return this.visibleTo(event, filters);
          }).map(data => ({ data }))),
        );
      });
    }
    return this.eventBus$.pipe(
      filter(ev => this.visibleTo(ev, filters)),
      map((data) => ({ data }))
    );
  }

  /**
   * Fallback Polling endpoint cho client khi SSE gặp sự cố mạng (HTTP GET /api/events/poll)
   */
  async pollEvents(sinceTimestamp?: string, apartment_id?: number, customer_id?: number, isStaff = false): Promise<DomainEvent[]> {
    if (!isStaff) return [];
    const list = await this.readHistory(sinceTimestamp);
    return list.filter(ev => this.visibleTo(ev, { apartment_id, customer_id, isStaff }));
  }

  private async readHistory(sinceTimestamp?: string): Promise<DomainEvent[]> {
    let list = this.eventHistory;
    if (this.redis.shared) {
      try {
        list = (await this.redis.client.lrange(this.redis.key('realtime:history'), 0, this.MAX_HISTORY - 1))
          .map(raw => JSON.parse(raw) as DomainEvent);
      } catch {
        throw new ServiceUnavailableException('Không đọc được sự kiện realtime.');
      }
    }
    const since = sinceTimestamp ? Date.parse(sinceTimestamp) : 0;
    return list.filter(event => Date.parse(event.timestamp) > since)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id));
  }

  private visibleTo(ev: DomainEvent, filters?: { apartment_id?: number; customer_id?: number; isStaff?: boolean }): boolean {
    if (filters?.apartment_id && ev.apartment_id && ev.apartment_id !== filters.apartment_id) return false;
    const catalog = ev.type === REALTIME_EVENTS.AVAILABILITY_CHANGED || ev.type === REALTIME_EVENTS.CATALOG_CHANGED;
    if (filters?.isStaff) return !filters.customer_id || catalog || ev.customer_id === filters.customer_id;
    return catalog || Boolean(filters?.customer_id && ev.customer_id === filters.customer_id);
  }
}
