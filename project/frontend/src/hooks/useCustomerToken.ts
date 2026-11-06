import { useCallback, useSyncExternalStore } from 'react';
import { getCustomerToken, subscribeCustomerSession, SessionScope } from '../services/customerSession';

export function useCustomerToken(scope: SessionScope = 'account') {
  const snapshot = useCallback(() => getCustomerToken(scope), [scope]);
  return useSyncExternalStore(subscribeCustomerSession, snapshot, () => null);
}
