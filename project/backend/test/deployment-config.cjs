// Run with TEST_REDIS_URL pointing to a disposable local Redis database.
process.env.VERCEL = '1';
require('reflect-metadata');
require('../register-paths.cjs');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { ConfigService } = require('@nestjs/config');
const { Test } = require('@nestjs/testing');
const { firstValueFrom, take, timeout } = require('rxjs');
const { RedisService } = require('../dist/backend/src/common/infrastructure/redis.service');
const { JobLockService } = require('../dist/backend/src/common/infrastructure/job-lock.service');
const { RedisIoAdapter } = require('../dist/backend/src/common/infrastructure/redis-io.adapter');
const { RealtimeSyncService } = require('../dist/backend/src/modules/admin/realtime-sync.service');
const { ScheduledJobsController } = require('../dist/backend/src/modules/cron/scheduled-jobs.controller');
const { CronService } = require('../dist/backend/src/modules/cron/cron.service');
const { PaymentsService } = require('../dist/backend/src/modules/payments/payments.service');
const { REALTIME_EVENTS } = require('../dist/shared/index');
const { AppModule } = require('../dist/backend/src/app.module');
const imports = Reflect.getMetadata('imports', AppModule);
assert.ok(!imports.some(value => value?.module?.name === 'ScheduleModule'), 'Vercel must not start in-process timers');

(async () => {
  assert.ok(process.env.TEST_REDIS_URL, 'Set TEST_REDIS_URL to a disposable Redis instance');
  const config = new ConfigService({ REDIS_URL: process.env.TEST_REDIS_URL, REDIS_KEY_PREFIX: `deployment-test:${randomUUID()}`, CRON_SECRET: randomUUID() });
  const redisA = new RedisService(config), redisB = new RedisService(config);
  let app, socketA, socketB, clientA, clientB, adapterA, adapterB;
  try {
    const writer = new RealtimeSyncService(redisA), reader = new RealtimeSyncService(redisB);
    await writer.emitPostCommit(REALTIME_EVENTS.BOOKING_UPDATED, 101, { apartment_id: 1, customer_id: 10 });
    await writer.emitPostCommit(REALTIME_EVENTS.BOOKING_UPDATED, 202, { apartment_id: 2, customer_id: 20 });
    assert.deepEqual((await reader.pollEvents(undefined, 1, undefined, true)).map(event => event.entity_id), [101]);
    assert.deepEqual(await reader.pollEvents(undefined, 1, 20, true), [], 'Customer filter must not bypass manager branch scope');
    assert.deepEqual(await reader.pollEvents(undefined, undefined, undefined, false), []);
    const stream = firstValueFrom(reader.getEventStream({ apartment_id: 1, isStaff: true }).pipe(take(1), timeout(5000)));
    await writer.emitPostCommit(REALTIME_EVENTS.AVAILABILITY_CHANGED, 303, { apartment_id: 1 });
    assert.equal((await stream).data.apartment_id, 1, 'SSE reads shared Redis history');

    const locksA = new JobLockService(redisA), locksB = new JobLockService(redisB);
    let release, markStarted;
    const started = new Promise(resolve => { markStarted = resolve; });
    const held = new Promise(resolve => { release = resolve; });
    const firstRun = locksA.run('overlap', async () => { markStarted(); await held; });
    await started;
    assert.equal((await locksB.run('overlap', async () => assert.fail('Overlapping task executed'))).status, 'skipped');
    release();
    await firstRun;
    await assert.rejects(locksA.run('failure', async () => { throw new Error('fixture failure'); }));
    assert.equal((await locksB.run('failure', async () => {})).status, 'completed', 'Failed jobs release their lock');

    const calls = [];
    const cron = {
      handleExpireOverdueHolds: async () => { calls.push('expire'); },
      handleAutoCheckOutCron: async () => { calls.push('checkout'); },
      handlePhotoCleanupJob: async () => { calls.push('photos'); },
      handleAnonymizationJob: async () => { calls.push('anonymize'); },
    };
    const module = await Test.createTestingModule({ controllers: [ScheduledJobsController], providers: [
      { provide: ConfigService, useValue: config }, { provide: JobLockService, useValue: locksA },
      { provide: CronService, useValue: cron }, { provide: PaymentsService, useValue: { syncPending: async () => { calls.push('payments'); } } },
    ] }).compile();
    app = module.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const invoke = (task, secret) => fetch(`${base}/api/internal/jobs/${task}`, { method: 'POST', headers: secret ? { Authorization: `Bearer ${secret}` } : {} });
    assert.equal((await invoke('maintenance')).status, 401);
    assert.equal((await invoke('maintenance', 'wrong')).status, 401);
    assert.deepEqual(calls, []);
    for (const task of ['maintenance', 'photo-cleanup', 'anonymization']) {
      const response = await invoke(task, config.get('CRON_SECRET'));
      assert.equal(response.status, 200);
      assert.equal((await response.json()).status, 'completed');
    }
    assert.deepEqual(calls, ['payments', 'expire', 'checkout', 'photos', 'anonymize']);
    config.set('CRON_SECRET', '');
    assert.equal((await invoke('maintenance')).status, 401, 'Missing secret fails closed');

    // Separate Socket.IO instances must deliver broadcasts across Redis.
    const { io } = require('socket.io-client');
    adapterA = new RedisIoAdapter(undefined, redisA); adapterB = new RedisIoAdapter(undefined, redisB);
    await Promise.all([adapterA.connect(), adapterB.connect()]);
    socketA = adapterA.createIOServer(0, {}); socketB = adapterB.createIOServer(0, {});
    const connected = client => new Promise((resolve, reject) => { client.once('connect', resolve); client.once('connect_error', reject); });
    clientA = io(`http://127.0.0.1:${socketA.httpServer.address().port}`, { transports: ['websocket'], reconnection: false, timeout: 5000 });
    clientB = io(`http://127.0.0.1:${socketB.httpServer.address().port}`, { transports: ['websocket'], reconnection: false, timeout: 5000 });
    await Promise.all([connected(clientA), connected(clientB)]);
    const alert = new Promise((resolve, reject) => {
      const watchdog = setTimeout(() => reject(new Error('Cross-instance broadcast timed out')), 5000);
      clientB.once('deployment-check', value => { clearTimeout(watchdog); resolve(value); });
    });
    socketA.emit('deployment-check', { roomId: 42 });
    assert.deepEqual(await alert, { roomId: 42 });
    clientA.close(); clientB.close();
    await Promise.all([adapterA.close(socketA), adapterB.close(socketB)]);
    socketA = socketB = undefined;
    console.log('PASS: serverless timers, job authorization, distributed locking, cross-instance polling/SSE, branch isolation, Socket.IO fan-out.');
  } finally {
    clientA?.close(); clientB?.close();
    if (socketA) await adapterA.close(socketA);
    if (socketB) await adapterB.close(socketB);
    if (app) await app.close();
    await redisA.client.del(redisA.key('realtime:history'));
    redisA.onModuleDestroy(); redisB.onModuleDestroy();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
