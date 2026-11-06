// ============================================================================
// REALTIME SYNC SERVICE (SSE Stream & Polling Fallback)
// Phát sự kiện post-commit: ID-only payload (Zero PII leak)
// ============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { REALTIME_EVENTS, RealtimeEventType } from '@shared/index';

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

  /**
   * Phát sự kiện miền sau khi database transaction commit thành công.
   * Payload chỉ chứa ID và event type để bảo vệ dữ liệu cá nhân (Không chứa PII).
   */
  emitPostCommit(
    type: RealtimeEventType,
    entityId: number,
    options?: { apartment_id?: number | null; customer_id?: number | null }
  ): void {
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
    return this.eventBus$.pipe(
      filter((ev) => {
        // Staff nhận mọi event hoặc theo apartment_id của staff
        if (filters?.isStaff) {
          if (!filters.apartment_id) return true; // Admin thấy tất cả
          return !ev.apartment_id || ev.apartment_id === filters.apartment_id;
        }

        // Kênh công khai: Catalog và Availability theo chi nhánh
        if (ev.type === REALTIME_EVENTS.AVAILABILITY_CHANGED || ev.type === REALTIME_EVENTS.CATALOG_CHANGED) {
          if (!filters?.apartment_id) return true;
          return !ev.apartment_id || ev.apartment_id === filters.apartment_id;
        }

        // Kênh riêng tư khách hàng: Booking & Customer profile
        if (filters?.customer_id && ev.customer_id) {
          return ev.customer_id === filters.customer_id;
        }

        return false;
      }),
      map((data) => ({ data }))
    );
  }

  /**
   * Fallback Polling endpoint cho client khi SSE gặp sự cố mạng (HTTP GET /api/events/poll)
   */
  pollEvents(sinceTimestamp?: string, apartment_id?: number, customer_id?: number): DomainEvent[] {
    let list = this.eventHistory;
    if (sinceTimestamp) {
      const sinceTime = new Date(sinceTimestamp).getTime();
      list = list.filter((e) => new Date(e.timestamp).getTime() > sinceTime);
    }

    return list.filter((ev) => {
      if (customer_id && ev.customer_id === customer_id) return true;
      if (ev.type === REALTIME_EVENTS.AVAILABILITY_CHANGED || ev.type === REALTIME_EVENTS.CATALOG_CHANGED) {
        if (!apartment_id) return true;
        return !ev.apartment_id || ev.apartment_id === apartment_id;
      }
      return false;
    });
  }
}
