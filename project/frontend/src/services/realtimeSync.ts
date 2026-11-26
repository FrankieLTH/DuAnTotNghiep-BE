// ============================================================================
// REALTIME SYNC CLIENT (authenticated polling)
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
  private pollingTimer: any = null;
  private listeners: Set<RealtimeEventHandler> = new Set();
  private lastTimestamp: string = new Date().toISOString();
  private apartmentId?: number;
  private customerId?: number;

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

    this.disconnect();
    // Native EventSource cannot attach Authorization headers. Use the protected
    // polling endpoint so the JWT stays in a header instead of the URL.
    this.startPollingFallback();
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

  private startPollingFallback() {
    if (this.pollingTimer) return;

    this.pollingTimer = setInterval(async () => {
      try {
        const token = sessionStorage.getItem('homestay_admin_token');
        if (!token) return; // Chỉ thực hiện polling khi đang đăng nhập quyền quản trị viên (Admin)

        const queryParams = new URLSearchParams();
        queryParams.set('since', this.lastTimestamp);
        if (this.apartmentId) queryParams.set('apartment_id', String(this.apartmentId));
        if (this.customerId) queryParams.set('customer_id', String(this.customerId));

        const res = await fetch(`/api/admin/events/poll?${queryParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
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
    this.stopPollingFallback();
  }
}

export const realtimeSync = new RealtimeSyncManager();
