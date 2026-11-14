// Run: node project/frontend/test/customer-session.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const serviceDir = path.resolve(__dirname, '../src/services');
const makeStorage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
};
const localStorage = makeStorage();
const profile = { id: 42, full_name: 'QA Customer', email: 'qa@example.test' };
function runtime(sessionStorage = makeStorage()) {
  const window = new EventTarget();
  const requests = [];
  let adapter = async config => ({ data: config.url === '/auth/login' ? { access_token: 'qa-token', customer: profile, scope: 'account' } : config.url === '/auth/otp/verify' ? { access_token: 'lookup-token', customer: profile, scope: 'lookup' } : { customer: profile, scope: 'account' } });
  const axios = {
    isAxiosError: error => Boolean(error?.isAxiosError),
    create: () => {
      let interceptor;
      const send = async (url, data) => {
        const config = interceptor({ url, data, headers: {} });
        requests.push(config);
        return adapter(config);
      };
      return { interceptors: { request: { use: fn => { interceptor = fn; } } }, get: url => send(url), post: (url, data) => send(url, data) };
    },
  };
  const cache = new Map();
  const context = vm.createContext({ localStorage, sessionStorage, window, Event, console, atob });
  function load(name) {
    if (cache.has(name)) return cache.get(name).exports;
    const module = { exports: {} };
    cache.set(name, module);
    const source = fs.readFileSync(path.join(serviceDir, name + '.ts'), 'utf8').replaceAll('import.meta.env.VITE_API_URL', 'undefined');
    const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, esModuleInterop: true } }).outputText;
    const execute = vm.runInContext(`(function(require,module,exports){${js}\n})`, context);
    execute(dep => dep === 'axios' ? axios : load(dep.replace('./', '')), module, module.exports);
    return module.exports;
  }
  return { session: load('customerSession'), service: load('customerService').customerService, window, requests, setAdapter: next => { adapter = next; } };
}
const unauthorized = () => Object.assign(new Error('Expired'), { isAxiosError: true, response: { status: 401 } });
(async () => {
  const first = runtime();
  await first.service.login(profile.email, 'test-password');
  assert.equal(localStorage.getItem('customer_token'), 'qa-token');
  const lookupStorage = makeStorage();
  const guest = runtime(lookupStorage);
  await guest.service.verifyOtp(profile.email, 'lookup', '123456');
  assert.equal(localStorage.getItem('customer_token'), 'qa-token');
  assert.equal(guest.session.getCustomerToken('lookup'), 'lookup-token');
  assert.equal(runtime(lookupStorage).session.getCustomerToken('lookup'), 'lookup-token');
  await guest.service.me('lookup');
  assert.equal(guest.requests.at(-1).headers.Authorization, 'Bearer lookup-token');
  await guest.service.logout('lookup');
  assert.equal(guest.session.getCustomerToken('lookup'), null);
  assert.equal(localStorage.getItem('customer_token'), 'qa-token');

  // New module instances and new tab storage simulate a complete reload/reopen.
  const reloaded = runtime();
  assert.equal((await reloaded.service.me()).customer.email, profile.email);
  assert.equal(reloaded.requests[0].headers.Authorization, 'Bearer qa-token');
  await reloaded.service.logout();
  assert.equal(runtime().session.getCustomerToken(), null);

  const legacy = makeStorage();
  legacy.setItem('customer_token', 'legacy-token');
  const migrated = runtime(legacy);
  assert.equal(migrated.session.getCustomerToken(), 'legacy-token');
  assert.equal(localStorage.getItem('customer_token'), 'legacy-token');
  assert.equal(legacy.getItem('customer_token'), null);

  migrated.setAdapter(async () => { throw new Error('Network unavailable'); });
  await assert.rejects(migrated.service.me());
  assert.equal(migrated.session.getCustomerToken(), 'legacy-token');
  migrated.setAdapter(async () => { throw unauthorized(); });
  await assert.rejects(migrated.service.me());
  assert.equal(migrated.session.getCustomerToken(), null);

  migrated.session.saveCustomerToken('old-token');
  let rejectOld;
  migrated.setAdapter(() => new Promise((_, reject) => { rejectOld = reject; }));
  const oldRequest = migrated.service.me();
  migrated.session.saveCustomerToken('new-token');
  rejectOld(unauthorized());
  await assert.rejects(oldRequest);
  assert.equal(migrated.session.getCustomerToken(), 'new-token');

  let notifications = 0;
  const unsubscribe = migrated.session.subscribeCustomerSession(() => notifications++);
  migrated.session.clearCustomerToken();
  const oldLookup = 'header.' + Buffer.from(JSON.stringify({ scope: 'lookup' })).toString('base64url') + '.signature';
  localStorage.setItem('customer_token', oldLookup);
  const oldGuest = runtime();
  assert.equal(oldGuest.session.getCustomerToken(), null);
  assert.equal(oldGuest.session.getCustomerToken('lookup'), oldLookup);
  oldGuest.session.clearCustomerToken(undefined, 'lookup');
  migrated.window.dispatchEvent(Object.assign(new Event('storage'), { key: 'customer_token' }));
  assert.equal(notifications, 2);
  unsubscribe();
  migrated.session.saveCustomerToken('ignored-notification');
  assert.equal(notifications, 2);
  migrated.session.clearCustomerToken();
  console.log('PASS: reload/reopen restores identity; logout persists; legacy migration; expiry; network recovery; stale response protection; cross-tab subscription.');
})().catch(error => { console.error(error); process.exitCode = 1; });
