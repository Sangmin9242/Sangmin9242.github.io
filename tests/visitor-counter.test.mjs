import test from 'node:test';
import assert from 'node:assert/strict';

let counter;
try { counter = await import('../visitor-counter.js'); }
catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }

test('visitor counter exposes its date, validation and network client', () => {
  assert.equal(typeof counter?.koreaDay, 'function', 'visitor counter implementation is missing');
  assert.equal(typeof counter?.parseCount, 'function');
  assert.equal(typeof counter?.createCounterClient, 'function');
});

function storage() {
  const records = new Map();
  return { getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value) };
}

function service() {
  const hits = new Map(), calls = [];
  return {
    calls,
    hits,
    fetch: async input => {
      const url = new URL(input), key = url.searchParams.get('url');
      calls.push({ path: url.pathname, key, tz: url.searchParams.get('tz') });
      if (url.pathname === '/api/hit') hits.set(key, (hits.get(key) ?? 0) + 1);
      return { ok: true, json: async () => ({ total_hits: hits.get(key) ?? 0, today_hits: 999, history: [] }) };
    },
  };
}

function browserLocks() {
  const queues = new Map();
  return { request(name, task) {
    const result = (queues.get(name) ?? Promise.resolve()).then(task);
    queues.set(name, result.catch(() => {}));
    return result;
  } };
}

function delayedResponses(backend) {
  let release, started, requests = 0;
  const gate = new Promise(resolve => { release = resolve; });
  return {
    started: new Promise(resolve => { started = resolve; }),
    release: () => release(),
    fetch: async input => {
      const response = await backend.fetch(input), payload = await response.json();
      if (++requests === 2) started();
      await gate;
      return { ok: true, json: async () => payload };
    },
  };
}

if (counter) {
  test('Korean date changes at 15:00 UTC, including a year boundary', () => {
    assert.equal(counter.koreaDay(new Date('2026-12-31T14:59:59Z')), '2026-12-31');
    assert.equal(counter.koreaDay(new Date('2026-12-31T15:00:00Z')), '2027-01-01');
  });

  test('missing, coerced and unsafe counts never become a displayed zero', () => {
    for (const value of [undefined, null, '', '3', false, -1, 1.2, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      assert.equal(counter.parseCount(value), null);
    }
    assert.equal(counter.parseCount(0), 0);
    assert.equal(counter.parseCount(124), 124);
  });

  test('all pages share a count once per Korean day and refresh with history', async () => {
    const backend = service(), local = storage();
    let date = new Date('2026-10-14T14:59:00Z');
    const options = { fetch: backend.fetch, storage: local, hostname: 'sangmin9242.github.io', now: () => date };
    const first = await counter.createCounterClient(options).load();
    assert.deepEqual(first, { today: { count: 1, status: 'ready' }, total: { count: 1, status: 'ready' } });
    const koreanPage = await counter.createCounterClient(options).load();
    assert.equal(koreanPage.total.count, 1);
    assert.deepEqual(backend.calls.map(call => call.path), ['/api/hit', '/api/hit', '/api/history', '/api/history']);
    assert.equal(backend.calls[0].key, 'https://sangmin9242.github.io/?visitors-day=2026-10-14');
    assert.equal(backend.calls[1].key, 'https://sangmin9242.github.io/');
    assert.equal(backend.calls[0].tz, 'Asia/Seoul');
    date = new Date('2026-10-14T15:00:00Z');
    const nextDay = await counter.createCounterClient(options).load();
    assert.equal(nextDay.today.count, 1);
    assert.equal(nextDay.total.count, 2);
  });

  test('ambiguous failed increments are reserved and never blindly retried', async () => {
    const backend = service(), local = storage();
    const options = {
      storage: local, hostname: 'sangmin9242.github.io', now: () => new Date('2026-10-14T10:00:00Z'),
      fetch: async input => { await backend.fetch(input); throw new Error('Connection lost after server counted'); },
    };
    const failed = await counter.createCounterClient(options).load();
    assert.equal(failed.today.count, null);
    assert.equal(failed.total.status, 'unavailable');
    const recovered = await counter.createCounterClient({ ...options, fetch: backend.fetch }).load();
    assert.equal(recovered.total.count, 1);
    assert.equal(recovered.today.count, 1);
    assert.equal(backend.calls.filter(call => call.path === '/api/hit').length, 2);
  });

  test('partial network failure retains the successful key and reserves both attempts', async () => {
    const backend = service(), local = storage();
    const options = { storage: local, hostname: 'sangmin9242.github.io', now: () => new Date('2026-10-14T10:00:00Z') };
    const partial = await counter.createCounterClient({ ...options, fetch: async input => {
      const result = await backend.fetch(input);
      if (new URL(input).searchParams.get('url').includes('visitors-day')) throw new Error('Daily connection lost');
      return result;
    } }).load();
    assert.equal(partial.today.status, 'unavailable');
    assert.equal(partial.total.count, 1);
    const recovered = await counter.createCounterClient({ ...options, fetch: backend.fetch }).load();
    assert.equal(recovered.today.count, 1);
    assert.equal(recovered.total.count, 1);
    assert.equal(backend.calls.filter(call => call.path === '/api/hit').length, 2);
  });

  test('failed refresh displays a explicitly marked cached count', async () => {
    const backend = service(), local = storage();
    const options = { storage: local, hostname: 'sangmin9242.github.io', now: () => new Date('2026-10-14T10:00:00Z') };
    await counter.createCounterClient({ ...options, fetch: backend.fetch }).load();
    const result = await counter.createCounterClient({ ...options, fetch: async () => { throw new Error('Offline'); } }).load();
    assert.deepEqual(result, { today: { count: 1, status: 'cached' }, total: { count: 1, status: 'cached' } });
  });

  test('private storage failures and nonpublic hosts can only read shared counts', async () => {
    for (const options of [
      { hostname: 'localhost', storage: storage() },
      { hostname: 'sangmin9242.github.io.example.com', storage: storage() },
      { hostname: 'sangmin9242.github.io', storage: { getItem() { throw new Error('Blocked'); }, setItem() { throw new Error('Blocked'); } } },
      { hostname: 'sangmin9242.github.io', storage: { getItem() { return null; }, setItem() { throw new Error('Quota'); } } },
    ]) {
      const backend = service();
      const result = await counter.createCounterClient({ ...options, fetch: backend.fetch }).load();
      assert.equal(result.total.count, 0);
      assert.deepEqual(backend.calls.map(call => call.path), ['/api/history', '/api/history']);
    }
  });

  test('malformed server counts show unavailable, and offline loads do not mutate', async () => {
    const result = await counter.createCounterClient({ hostname: 'localhost', storage: storage(), fetch: async () => ({ ok: true, json: async () => ({ today_hits: 99 }) }) }).load();
    assert.deepEqual(result, { today: { count: null, status: 'unavailable' }, total: { count: null, status: 'unavailable' } });
    const backend = service();
    await counter.createCounterClient({ hostname: 'sangmin9242.github.io', storage: storage(), online: () => false, fetch: backend.fetch }).load();
    assert.deepEqual(backend.calls.map(call => call.path), ['/api/history', '/api/history']);
  });

  test('a stalled request is bounded even if the transport ignores abort', async () => {
    const result = await counter.createCounterClient({ hostname: 'localhost', storage: storage(), timeoutMs: 15, fetch: () => new Promise(() => {}) }).load();
    assert.equal(result.total.status, 'unavailable');
  });

  test('browser locks prevent simultaneous pages from incrementing twice', async () => {
    let queue = Promise.resolve();
    const locks = { request(_name, task) { const result = queue.then(task); queue = result.catch(() => {}); return result; } };
    const backend = service(), local = storage();
    const options = { locks, fetch: backend.fetch, storage: local, hostname: 'sangmin9242.github.io' };
    const results = await Promise.all([counter.createCounterClient(options).load(), counter.createCounterClient(options).load()]);
    assert.deepEqual(results.map(result => result.total.count), [1, 1]);
    assert.equal(backend.calls.filter(call => call.path === '/api/hit').length, 2);
  });

  test('tabs crossing Korean midnight preserve one visit for each day', async () => {
    const backend = service(), local = storage(), delayed = delayedResponses(backend);
    const options = { storage: local, locks: browserLocks(), hostname: 'sangmin9242.github.io' };
    const first = counter.createCounterClient({ ...options, fetch: delayed.fetch,
      now: () => new Date('2026-10-14T14:59:59Z') }).load();
    await delayed.started;
    const nextOptions = { ...options, fetch: backend.fetch, now: () => new Date('2026-10-14T15:00:01Z') };
    const second = counter.createCounterClient(nextOptions).load();
    // Let another lock run to completion while the old day's response is held.
    await new Promise(resolve => setImmediate(resolve));
    delayed.release();
    await Promise.all([first, second]);
    const refreshed = await counter.createCounterClient(nextOptions).load();
    assert.equal(refreshed.today.count, 1);
    assert.equal(refreshed.total.count, 2);
  });

  test('a queued tab uses the Korean date when its lock is acquired', async () => {
    const backend = service(), local = storage(), delayed = delayedResponses(backend);
    let date = new Date('2026-10-14T14:59:59Z');
    const options = { storage: local, locks: browserLocks(), hostname: 'sangmin9242.github.io', now: () => date };
    const first = counter.createCounterClient({ ...options, fetch: delayed.fetch }).load();
    await delayed.started;
    const queued = counter.createCounterClient({ ...options, fetch: backend.fetch }).load();
    date = new Date('2026-10-14T15:00:01Z');
    delayed.release();
    await first;
    const result = await queued;
    assert.equal(result.today.count, 1);
    assert.equal(result.total.count, 2);
    assert.equal(backend.hits.get('https://sangmin9242.github.io/?visitors-day=2026-10-15'), 1);
  });

  test('without locks, old responses cannot replace a newer reservation or cached count', async () => {
    for (const oldHostname of ['sangmin9242.github.io', 'localhost']) {
      const backend = service(), local = storage(), delayed = delayedResponses(backend);
      const first = counter.createCounterClient({ storage: local, hostname: oldHostname, fetch: delayed.fetch,
        now: () => new Date('2026-10-14T14:59:59Z') }).load();
      await delayed.started;
      const nextOptions = { storage: local, hostname: 'sangmin9242.github.io', fetch: backend.fetch,
        now: () => new Date('2026-10-14T15:00:01Z') };
      const second = await counter.createCounterClient(nextOptions).load();
      delayed.release();
      await first;
      const cached = await counter.createCounterClient({ ...nextOptions, online: () => false,
        fetch: async () => { throw new Error('Offline'); } }).load();
      assert.deepEqual(cached, { today: { count: 1, status: 'cached' },
        total: { count: second.total.count, status: 'cached' } });
      const refreshed = await counter.createCounterClient(nextOptions).load();
      assert.equal(refreshed.today.count, 1);
      assert.equal(refreshed.total.count, oldHostname === 'localhost' ? 1 : 2);
    }
  });
}
