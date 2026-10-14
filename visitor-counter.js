const SITE_URL = 'https://sangmin9242.github.io/';
const API_URL = 'https://hitscounter.dev';
const STORAGE_PREFIX = 'sangmin-visitors:v1:';
const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function koreaDay(date = new Date()) {
  const parts = Object.fromEntries(dayFormatter.formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function parseCount(value) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

/** Shared service counts visitor-days, with browser storage used only for deduplication/cache. */
export function createCounterClient({
  fetch: fetchRequest = globalThis.fetch,
  storage = null,
  hostname = '',
  locks = null,
  now = () => new Date(),
  online = () => true,
  timeoutMs = 5000,
} = {}) {
  const memory = new Map();

  const recordDay = record => record?.savedDay || record?.day || '';

  function readRecord(id) {
    let record = memory.get(id);
    try {
      const saved = storage?.getItem(STORAGE_PREFIX + id);
      if (saved) {
        const persisted = JSON.parse(saved);
        if (recordDay(persisted) >= recordDay(record)) record = persisted;
      }
    } catch { /* Private browsing and corrupt storage must not break the page. */ }
    return record;
  }

  function read(id, key) {
    const record = readRecord(id);
    return record?.key === key ? { ...record, count: parseCount(record.count) } : { key, count: null };
  }

  function save(id, record, day) {
    // A late response must not erase another tab's newer reservation or cache,
    // including when Web Locks are unavailable or the request only read counts.
    if (recordDay(readRecord(id)) > day) return false;
    const saved = { ...record, savedDay: day };
    memory.set(id, saved);
    try {
      if (!storage) return false;
      storage.setItem(STORAGE_PREFIX + id, JSON.stringify(saved));
      return true;
    } catch { return false; }
  }

  async function request(key, increment) {
    const url = new URL(increment ? '/api/hit' : '/api/history', API_URL);
    url.searchParams.set('url', key);
    if (increment) {
      url.searchParams.set('tz', 'Asia/Seoul');
      url.searchParams.set('output', 'json');
    }
    const controller = new AbortController();
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new Error('Counter request timed out')); }, timeoutMs);
    });
    try {
      return await Promise.race([
        (async () => {
          const response = await fetchRequest(url.href, {
            signal: controller.signal, mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
          });
          if (!response.ok) throw new Error('Counter service unavailable');
          const payload = await response.json();
          // Daily API fields use server time; a separate KST date key supplies today's count.
          const count = parseCount(payload?.total_hits);
          if (count === null) throw new Error('Invalid counter response');
          return count;
        })(),
        timeout,
      ]);
    } finally { clearTimeout(timer); }
  }

  async function loadKey(id, key, day) {
    let record = read(id, key);
    let increment = hostname === 'sangmin9242.github.io' && online() && !(record.day === day && record.attempted);
    if (increment) {
      record = { ...record, day, attempted: true };
      // Reserve before sending. An ambiguous failure must never trigger a second increment.
      // If a durable reservation cannot be written, display shared counts in read-only mode.
      increment = save(id, record, day);
    }
    try {
      const count = await request(key, increment);
      save(id, { ...record, count }, day);
      return { count, status: 'ready' };
    } catch {
      return { count: record.count, status: record.count === null ? 'unavailable' : 'cached' };
    }
  }

  async function load() {
    const task = async () => {
      const day = koreaDay(now());
      const [today, total] = await Promise.all([
        loadKey('today', `${SITE_URL}?visitors-day=${day}`, day),
        loadKey('total', SITE_URL, day),
      ]);
      return { today, total };
    };
    // Both dates share the same storage slots, so serialize across midnight too.
    return locks?.request ? locks.request(STORAGE_PREFIX + 'load', task) : task();
  }

  return { load };
}

export function initVisitorCounter(document = globalThis.document, window = globalThis.window) {
  if (!document?.body || !window || document.getElementById('visitor-counter')) return;
  const widget = document.createElement('div');
  widget.id = 'visitor-counter';
  widget.className = 'visitor-counter';
  widget.setAttribute('role', 'status');
  widget.setAttribute('aria-live', 'polite');
  widget.setAttribute('aria-atomic', 'true');
  const fields = {};
  for (const id of ['today', 'total']) {
    const item = document.createElement('span');
    item.className = 'visitor-counter-item';
    const label = document.createElement('span');
    const value = document.createElement('span');
    value.className = 'visitor-counter-value';
    item.append(label, value);
    widget.append(item);
    fields[id] = { label, value };
  }
  // The interactive record viewer has its own hidden footer. Use the page footer.
  const anchor = document.querySelector('body > footer') || document.querySelector('body > main');
  if (anchor) anchor.insertAdjacentElement('afterend', widget);
  else document.body.append(widget);

  let state = { today: { count: null, status: 'loading' }, total: { count: null, status: 'loading' } };
  function render() {
    const ko = document.documentElement.lang.startsWith('ko');
    const labels = ko ? { today: '오늘', total: '누적' } : { today: 'Today', total: 'Total' };
    const descriptions = ko
      ? { loading: '불러오는 중', unavailable: '집계 서버 연결 불가', cached: '마지막 저장값', ready: '' }
      : { loading: 'Loading', unavailable: 'Counter service unavailable', cached: 'Last saved count', ready: '' };
    const format = new Intl.NumberFormat(ko ? 'ko-KR' : 'en-US');
    const accessible = [];
    const notices = new Set();
    for (const id of ['today', 'total']) {
      const { count, status } = state[id];
      fields[id].label.textContent = labels[id];
      fields[id].value.textContent = count === null ? '—' : format.format(count) + (status === 'cached' ? '*' : '');
      fields[id].value.dataset.status = status;
      const notice = descriptions[status];
      if (notice) notices.add(notice);
      accessible.push(`${labels[id]} ${count === null ? notice : format.format(count)}${count !== null && notice ? ` (${notice})` : ''}`);
    }
    widget.setAttribute('aria-label', `${ko ? '방문자' : 'Visitors'}: ${accessible.join(', ')}`);
    widget.title = (ko ? '한국 시간 · 브라우저당 하루 1회 · 설치 후 집계' : 'KST · once per browser/day · since installation')
      + (notices.size ? `\n${[...notices].join(' · ')}` : '');
  }
  render();
  new window.MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  let storage;
  try { storage = window.localStorage; } catch { storage = null; }
  const client = createCounterClient({
    fetch: window.fetch.bind(window), storage, hostname: window.location.hostname,
    locks: window.navigator.locks, online: () => window.navigator.onLine !== false,
  });
  let displayedDay = '', pending = false;
  async function refreshDay() {
    const day = koreaDay();
    if (pending || day === displayedDay || document.hidden) return;
    pending = true;
    // Never leave yesterday's number underneath today's label while loading.
    state = { today: { count: null, status: 'loading' }, total: state.total };render();
    try { state = await client.load(); }
    catch { state = { today: { count: null, status: 'unavailable' }, total: { count: null, status: 'unavailable' } }; }
    displayedDay = day;pending = false;render();
    if (day !== koreaDay()) refreshDay();
  }
  refreshDay();
  window.setInterval(refreshDay, 30000);
  document.addEventListener('visibilitychange', refreshDay);
  window.addEventListener('pageshow', refreshDay);
  return widget;
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initVisitorCounter(), { once: true });
  else initVisitorCounter();
}
