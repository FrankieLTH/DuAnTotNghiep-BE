// ============================================================================
// REACT HOOK: useRealtimeSync
// Tự động lắng nghe sự kiện miền từ SSE stream hoặc Polling fallback
// Kích hoạt re-fetch dữ liệu tức thì phía Client & Admin (Zero PII payload)
// ============================================================================

import { useEffect, useRef } from 'react';
import { realtimeSync, RealtimeMessage, RealtimeEventHandler } from '../services/realtimeSync';
import { RealtimeEventType } from '@shared/constants';

interface UseRealtimeSyncOptions {
  apartmentId?: number;
  customerId?: number;
  isStaff?: boolean;
  eventTypes?: RealtimeEventType[];
  onEvent?: (event: RealtimeMessage) => void;
  onRefresh?: () => void;
}

export function useRealtimeSync(options: UseRealtimeSyncOptions = {}) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    // Kết nối đến SSE stream (hoặc polling)
    realtimeSync.connect({
      apartmentId: options.apartmentId,
      customerId: options.customerId,
      isStaff: options.isStaff,
    });

    const handler: RealtimeEventHandler = (event) => {
      const currentOpts = optionsRef.current;

      // Lọc event theo loại nếu được cấu hình
      if (currentOpts.eventTypes && !currentOpts.eventTypes.includes(event.type)) {
        return;
      }

      // Gọi handler tùy chỉnh nếu có
      if (currentOpts.onEvent) {
        currentOpts.onEvent(event);
      }

      // Kích hoạt hàm làm mới dữ liệu
      if (currentOpts.onRefresh) {
        currentOpts.onRefresh();
      }
    };

    const unsubscribe = realtimeSync.subscribe(handler);

    return () => {
      unsubscribe();
    };
  }, [options.apartmentId, options.customerId, options.isStaff]);
}
