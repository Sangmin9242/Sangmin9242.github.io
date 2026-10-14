const copy = {
  en: {
    name: 'Sangmin Lee', title: 'Preparing the site.',
    intro: 'A moment to bring the research site into view.',
    download: 'Downloading the scene', build: 'Building the scene',
    assets: 'Preparing models and materials', frame: 'Preparing the first frame',
    ready: 'The site is ready', failed: 'The site could not load.',
    failureDetail: 'Check your connection and try again.',
    recovery: 'Try again, or open the CV directly.',
    retry: 'Try again', cv: 'View CV', waiting: 'Please wait',
    downloadLabel: 'Download progress', phaseLabel: 'Scene preparation',
  },
  ko: {
    name: '이상민 · Sangmin Lee', title: '현장을 준비하고 있습니다.',
    intro: '연구 현장을 둘러볼 수 있도록 준비하고 있습니다.',
    download: '장면 다운로드 중', build: '장면 구성 중',
    assets: '모델과 재질 준비 중', frame: '첫 화면 준비 중',
    ready: '현장이 준비되었습니다', failed: '현장을 불러오지 못했습니다.',
    failureDetail: '인터넷 연결을 확인한 뒤 다시 시도해 주세요.',
    recovery: '다시 시도하거나 이력서를 바로 볼 수 있습니다.',
    retry: '다시 시도', cv: '이력서 보기', waiting: '잠시만 기다려 주세요',
    downloadLabel: '다운로드 진행률', phaseLabel: '현장 준비',
  },
};

const language = value => String(value || '').toLowerCase().startsWith('ko') ? 'ko' : 'en';

// Also used by the inline HTML shell so the wait is visible before module downloads.
export function startupLoaderMarkup(lang = 'en') {
  const locale = language(lang), text = copy[locale];
  return `<section id="startup-loader" class="startup-loader" lang="${locale}" aria-labelledby="startup-title" aria-busy="true">
  <div class="startup-loader__content">
    <p class="startup-loader__identity" data-startup-name>${text.name}</p>
    <svg class="startup-loader__drawing" viewBox="0 0 320 184" fill="none" aria-hidden="true">
      <g class="startup-loader__ground"><path d="M24 147 161 181 300 144M24 147 161 112 300 144M60 138 198 171M98 128 237 162M135 119 273 153M60 156 199 121M98 166 237 131M135 175 273 141"/></g>
      <g class="startup-loader__structure"><path d="M73 133V78L133 62 194 78V133L133 150 73 133ZM73 78 133 95 194 78M133 95V150M73 105 133 122 194 105M104 70V142M164 70V142M73 78 133 62 194 78M221 143V112L249 104 277 112V143L249 151 221 143ZM221 112 249 120 277 112M249 120V151"/></g>
      <g class="startup-loader__wire" data-startup-wire><path d="M210 135V30M200 135V30M195 30H283V23H155V30H195M201 23 155 30M201 23 237 30M237 23 273 30M200 47 210 60 200 74 210 87 200 101 210 114 200 128M210 47 200 60 210 74 200 87 210 101 200 114 210 128M267 31V65L262 70 267 76 272 70 267 65"/></g>
      <path class="startup-loader__datum" d="M47 143V156M41 149H53M292 135V147M286 141H298"/>
    </svg>
    <h1 id="startup-title" data-startup-title>${text.title}</h1>
    <p class="startup-loader__intro" data-startup-intro>${text.intro}</p>
    <div class="startup-loader__progress" role="progressbar" aria-label="${text.phaseLabel}" aria-valuemin="0" aria-valuemax="100" data-startup-progress><span data-startup-fill></span></div>
    <div class="startup-loader__status-row"><p role="status" aria-live="polite" aria-atomic="true" data-startup-status>${text.download}</p><span data-startup-amount aria-hidden="true"></span></div>
    <p class="startup-loader__detail" data-startup-detail>${text.waiting}</p>
    <div class="startup-loader__actions"><button type="button" data-startup-retry hidden>${text.retry}</button><a data-startup-cv href="./${locale === 'ko' ? 'ko' : 'index'}.html">${text.cv}</a></div>
  </div>
</section>`;
}

/** Lifecycle is controlled by bootstrap: ready means critical assets and a complete frame. */
export function createStartupLoader({ root, getLanguage } = {}) {
  const document = root?.ownerDocument || globalThis.document;
  const view = document.defaultView;
  const readLanguage = () => language(getLanguage?.() ?? new URLSearchParams(view.location.search).get('lang') ?? document.documentElement.lang);
  if (!root) {
    root = document.getElementById('startup-loader');
    if (!root) {
      document.body.insertAdjacentHTML('afterbegin', startupLoaderMarkup(readLanguage()));
      root = document.getElementById('startup-loader');
    }
  }
  // A minimal inline first-paint shell may omit the full drawing, but never gets replaced.
  const find = key => root.querySelector(`[data-startup-${key}]`);
  let state = 'loading', stageKey = 'download', statusText = '', closePromise;
  let retryAction = () => view.location.reload();
  const blocked = Array.from(document.body.children)
    .filter(element => element !== root && !['SCRIPT', 'STYLE', 'LINK'].includes(element.tagName))
    .map(element => ({ element, inert: element.inert }));
  blocked.forEach(({ element }) => { element.inert = true; });
  document.body.classList.add('startup-waiting');

  function localize() {
    const locale = readLanguage(), text = copy[locale];
    root.lang = locale;
    for (const [key, value] of [['name', text.name], ['title', text.title], ['intro', text.intro], ['retry', text.retry], ['cv', text.cv]]) {
      if (find(key)) find(key).textContent = value;
    }
    if (find('cv')) find('cv').href = `./${locale === 'ko' ? 'ko' : 'index'}.html`;
    return text;
  }
  function announce(message) {
    if (message === statusText) return;
    statusText = message;
    if (find('status')) find('status').textContent = message;
  }
  function indeterminate() {
    find('progress')?.removeAttribute('aria-valuenow');
    find('progress')?.removeAttribute('aria-valuetext');
    root.dataset.progress = 'indeterminate';
    if (find('fill')) find('fill').style.removeProperty('width');
    if (find('amount')) find('amount').textContent = '';
  }
  function stage(key, detail = '') {
    if (state !== 'loading') return;
    const text = localize();
    stageKey = Object.hasOwn(text, key) ? key : 'build';
    root.dataset.stage = stageKey;
    indeterminate();
    find('progress')?.setAttribute('aria-label', text.phaseLabel);
    announce(text[stageKey]);
    if (find('detail')) find('detail').textContent = detail || text.waiting;
  }
  function download({ loaded, total, label = '' } = {}) {
    if (state !== 'loading') return;
    const text = localize();
    stageKey = 'download';
    root.dataset.stage = stageKey;
    announce(text.download);
    const known = Number.isFinite(loaded) && loaded >= 0 && Number.isFinite(total) && total > 0;
    if (known) {
      const percent = Math.min(100, Math.floor(loaded / total * 100));
      root.dataset.progress = 'determinate';
      find('progress')?.setAttribute('aria-label', text.downloadLabel);
      find('progress')?.setAttribute('aria-valuenow', String(percent));
      if (find('fill')) find('fill').style.width = `${percent}%`;
      if (find('amount')) find('amount').textContent = `${percent}%`;
    } else indeterminate();
    if (find('detail')) find('detail').textContent = label || text.waiting;
  }
  function fail({ message, retry } = {}) {
    if (state === 'closed' || state === 'closing') return;
    state = 'failed';
    const text = localize();
    root.dataset.state = 'failed';
    root.setAttribute('aria-busy', 'false');
    indeterminate();
    if (find('title')) find('title').textContent = text.failed;
    if (find('intro')) find('intro').textContent = text.recovery;
    announce(text.failed);
    if (find('detail')) find('detail').textContent = message || text.failureDetail;
    if (find('retry')) find('retry').hidden = false;
    retryAction = typeof retry === 'function' ? retry : () => view.location.reload();
  }
  async function ready() {
    if (state === 'failed' || state === 'closed') return;
    if (closePromise) return closePromise;
    state = 'closing';
    root.setAttribute('aria-busy', 'false');
    announce(localize().ready);
    root.dataset.state = 'ready';
    const duration = view.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 220;
    closePromise = new Promise(resolve => {
      const finish = () => {
        root.hidden = true;
        state = 'closed';
        document.body.classList.remove('startup-waiting');
        blocked.forEach(({ element, inert }) => { element.inert = inert; });
        resolve();
      };
      if (duration) view.setTimeout(finish, duration);
      else finish();
    });
    return closePromise;
  }
  find('retry')?.addEventListener('click', () => {
    if (state !== 'failed') return;
    state = 'loading';
    root.dataset.state = 'loading';
    root.setAttribute('aria-busy', 'true');
    find('retry').hidden = true;
    stage('download');
    try {
      Promise.resolve(retryAction()).catch(() => fail());
    } catch { fail(); }
  });
  root.hidden = false;
  root.dataset.state = 'loading';
  root.setAttribute('aria-busy', 'true');
  stage(stageKey);
  return { stage, download, ready, fail };
}
