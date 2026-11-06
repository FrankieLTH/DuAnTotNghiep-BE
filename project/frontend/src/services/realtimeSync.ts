// ============================================================================
// REALTIME SYNC CLIENT (SSE Stream with Auto-Reconnect & Polling Fallback)
// Payload chứa ID-only (Zero PII leak) -> Kích hoạt re-fetch dữ liệu
// ============================================================================

import { REALTIME_EVENTS, RealtimeEventType } from '@shared/constants';

export interface RealtimeMessage {
  id: string;
  type: RealtimeEventType;
  apartment_id?: number | null;
  customer_id?: number | null;
  entity_id: number;
  timestamp: string;
}

export type RealtimeEventHandler = (event: RealtimeMessage) => void;

class RealtimeSyncManager {
  private eventSource: EventSource | null = null;
  private pollingTimer: any = null;
  private listeners: Set<RealtimeEventHandler> = new Set();
  private lastTimestamp: string = new Date().toISOString();
  private isConnected: boolean = false;
  private apartmentId?: number;
  private customerId?: number;
  private isStaff: boolean = false;

  /**
   * Khởi động kết nối Realtime (Ưu tiên SSE, fallback sang Polling nếu mạng chặn)
   */
  public connect(options?: {
    apartmentId?: number;
    customerId?: number;
    isStaff?: boolean;
  }) {
    this.apartmentId = options?.apartmentId;
    this.customerId = options?.customerId;
    this.isStaff = options?.isStaff || false;

    this.disconnect();
    this.initSSE();
  }

  /**
   * Đăng ký nhận sự kiện realtime
   */
  public subscribe(handler: RealtimeEventHandler): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  private initSSE() {
    try {
      const queryParams = new URLSearchParams();
      if (this.apartmentId) queryParams.set('apartment_id', String(this.apartmentId));
      if (this.customerId) queryParams.set('customer_id', String(this.customerId));

      const sseUrl = `/api/admin/events/stream?${queryParams.toString()}`;
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.stopPollingFallback();
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data: RealtimeMessage = JSON.parse(event.data);
          this.lastTimestamp = data.timestamp;
          this.notifyListeners(data);
        } catch {
          // Ignore parse errors on heartbeat
        }
      };

      this.eventSource.onerror = () => {
        this.isConnected = false;
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        // Tự động chuyển sang chế độ Polling fallback mỗi 20 giây
        this.startPollingFallback();
      };
    } catch {
      this.startPollingFallback();
    }
  }

  private startPollingFallback() {
    if (this.pollingTimer) return;

    this.pollingTimer = setInterval(async () => {
      try {
        const queryParams = new URLSearchParams();
        queryParams.set('since', this.lastTimestamp);
        if (this.apartmentId) queryParams.set('apartment_id', String(this.apartmentId));
        if (this.customerId) queryParams.set('customer_id', String(this.customerId));

        const res = await fetch(`/api/admin/events/poll?${queryParams.toString()}`);
        if (res.ok) {
          const events: RealtimeMessage[] = await res.json();
          if (Array.isArray(events)) {
            for (const ev of events) {
              this.lastTimestamp = ev.timestamp;
              this.notifyListeners(ev);
            }
          }
        }
      } catch {
        // Silent polling error
      }
    }, 20000); // 20s interval
  }

  private stopPollingFallback() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private notifyListeners(event: RealtimeMessage) {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in realtime event listener:', err);
      }
    });
  }

  public disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.stopPollingFallback();
    this.isConnected = false;
  }
}

export const realtimeSync = new RealtimeSyncManager();
