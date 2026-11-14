const TOKEN_KEY = 'customer_token';
const LOOKUP_KEY = 'customer_lookup_token';
export type SessionScope = 'account' | 'lookup';
const SESSION_EVENT = 'customer-session-changed';

export function getCustomerToken(scope: SessionScope = 'account'): string | null {
  // Route legacy lookup tokens to their own store; this does not grant permissions.
  // The backend still verifies the JWT signature and Redis session on every request.
  for (const storage of [localStorage, sessionStorage]) {
    const old = storage.getItem(TOKEN_KEY);
    if (old) {
      try {
        const payload = JSON.parse(atob(old.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.scope === 'lookup') { sessionStorage.setItem(LOOKUP_KEY, old); storage.removeItem(TOKEN_KEY); }
      } catch { /* Opaque/invalid tokens are checked by the backend. */ }
    }
  }
  if (scope === 'lookup') return sessionStorage.getItem(LOOKUP_KEY);
  const saved = localStorage.getItem(TOKEN_KEY);
  if (saved) return saved;
  // Preserve sessions created before persistent sign-in was introduced.
  const legacy = sessionStorage.getItem(TOKEN_KEY);
  if (legacy) {
    localStorage.setItem(TOKEN_KEY, legacy);
    sessionStorage.removeItem(TOKEN_KEY);
  }
  return legacy;
}

export function saveCustomerToken(token: string, scope: SessionScope = 'account') {
  if (scope === 'lookup') {
    sessionStorage.setItem(LOOKUP_KEY, token);
    window.dispatchEvent(new Event(SESSION_EVENT)); return;
  }
  localStorage.setItem(TOKEN_KEY, token);
  sessionStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearCustomerToken(expectedToken: string | null | undefined = undefined, scope: SessionScope = 'account') {
  if (expectedToken === undefined) expectedToken = getCustomerToken(scope);
  // A late response from an older session must not clear a new login.
  if (getCustomerToken(scope) !== expectedToken) return;
  if (scope === 'lookup') {
    sessionStorage.removeItem(LOOKUP_KEY);
    window.dispatchEvent(new Event(SESSION_EVENT)); return;
  }
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function subscribeCustomerSession(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === TOKEN_KEY || event.key === LOOKUP_KEY || event.key === null) listener();
  };
  window.addEventListener(SESSION_EVENT, listener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(SESSION_EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
}
