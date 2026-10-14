import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
let browser, page;
let source = '';
try { source = await readFile(new URL('../startup-loader.js', import.meta.url), 'utf8'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }

before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
});
after(async () => browser?.close());
beforeEach(async () => {
  page = await browser.newPage();
  await page.setContent('<!doctype html><html lang="en"><body><main><button id="scene-button">Explore</button></main></body></html>');
  const css = await readFile(new URL('../startup-loader.css', import.meta.url), 'utf8').catch(() => '');
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(async code => {
    window.loaderModule = await import('data:text/javascript;base64,' + btoa(unescape(encodeURIComponent(code))));
  }, source);
});

test('initial wait is visible and unknown bytes never pretend to be a percentage', async () => {
  assert.equal(await page.evaluate(() => typeof loaderModule.createStartupLoader), 'function', 'startup loader API must exist');
  const state = await page.evaluate(() => {
    window.loader = loaderModule.createStartupLoader();
    loader.download({ loaded: 18000, label: 'Scene' });
    const root = document.getElementById('startup-loader');
    const progress = root.querySelector('[role="progressbar"]');
    return { visible: !root.hidden, value: progress.getAttribute('aria-valuenow'), text: root.textContent, busy: root.getAttribute('aria-busy') };
  });
  assert.equal(state.visible, true);
  assert.equal(state.value, null);
  assert.doesNotMatch(state.text, /\d+%/);
  assert.equal(state.busy, 'true');
  await page.close();
});

test('known byte progress shows the real ratio but does not finish the scene', async () => {
  assert.equal(await page.evaluate(() => typeof loaderModule.createStartupLoader), 'function');
  const state = await page.evaluate(() => {
    window.loader = loaderModule.createStartupLoader();
    loader.download({ loaded: 25, total: 100, label: 'Robot model' });
    const progress = document.querySelector('[role="progressbar"]');
    const first = progress.getAttribute('aria-valuenow');
    loader.download({ loaded: 100, total: 100, label: 'Robot model' });
    return { first, last: progress.getAttribute('aria-valuenow'), hidden: document.getElementById('startup-loader').hidden };
  });
  assert.equal(state.first, '25');
  assert.equal(state.last, '100');
  assert.equal(state.hidden, false);
  await page.close();
});

test('new stages return to indeterminate and repeated byte events do not flood live announcements', async () => {
  assert.equal(await page.evaluate(() => typeof loaderModule.createStartupLoader), 'function');
  const result = await page.evaluate(async () => {
    window.loader = loaderModule.createStartupLoader();
    const live = document.querySelector('[role="status"]');
    let mutations = 0;
    const observer = new MutationObserver(records => { mutations += records.length; });
    observer.observe(live, { childList: true, subtree: true, characterData: true });
    for (let loaded = 1; loaded <= 50; loaded++) loader.download({ loaded, total: 100, label: 'Robot model' });
    await Promise.resolve();
    const announcements = mutations;
    loader.stage('frame');
    observer.disconnect();
    return { announcements, value: document.querySelector('[role="progressbar"]').getAttribute('aria-valuenow'), status: live.textContent };
  });
  assert.ok(result.announcements <= 2, `Expected meaningful status announcements, received ${result.announcements}`);
  assert.equal(result.value, null);
  assert.match(result.status, /frame/i);
  await page.close();
});

test('attaches to the first-paint shell without replacing it and localizes Korean recovery', async () => {
  assert.equal(await page.evaluate(() => typeof loaderModule.startupLoaderMarkup), 'function');
  const result = await page.evaluate(() => {
    document.body.insertAdjacentHTML('afterbegin', loaderModule.startupLoaderMarkup('en'));
    const root = document.getElementById('startup-loader');
    const oldChild = root.firstElementChild;
    window.loader = loaderModule.createStartupLoader({ root, getLanguage: () => 'ko' });
    loader.stage('assets');
    loader.fail({ message: '연결을 확인해 주세요.', retry: () => { window.retried = true; } });
    const failureText = root.textContent;
    root.querySelector('[data-startup-retry]').click();
    return { preserved: oldChild === root.firstElementChild, language: root.lang, href: root.querySelector('[data-startup-cv]').getAttribute('href'), text: failureText, retried: window.retried };
  });
  assert.equal(result.preserved, true);
  assert.equal(result.language, 'ko');
  assert.equal(result.href, './ko.html');
  assert.match(result.text, /연결을 확인/);
  assert.equal(result.retried, true);
  await page.close();
});

test('failure remains recoverable despite stale download or ready callbacks', async () => {
  assert.equal(await page.evaluate(() => typeof loaderModule.createStartupLoader), 'function');
  const state = await page.evaluate(async () => {
    window.loader = loaderModule.createStartupLoader();
    loader.fail({ message: 'The connection was interrupted.' });
    loader.download({ loaded: 100, total: 100 });
    await loader.ready();
    const root = document.getElementById('startup-loader');
    return { hidden: root.hidden, retry: !root.querySelector('[data-startup-retry]').hidden, text: root.textContent };
  });
  assert.equal(state.hidden, false);
  assert.equal(state.retry, true);
  assert.match(state.text, /connection was interrupted/);
  await page.close();
});

test('ready removes the wait only when called, with reduced motion and restored page access', async () => {
  assert.equal(await page.evaluate(() => typeof loaderModule.createStartupLoader), 'function');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const state = await page.evaluate(async () => {
    window.loader = loaderModule.createStartupLoader();
    const root = document.getElementById('startup-loader');
    const blocked = document.querySelector('main').inert;
    const start = performance.now();
    await loader.ready();
    loader.stage('assets');
    return { hidden: root.hidden, busy: root.getAttribute('aria-busy'), elapsed: performance.now() - start, animation: getComputedStyle(root.querySelector('[data-startup-wire]')).animationName, blocked, accessible: !document.querySelector('main').inert };
  });
  assert.equal(state.hidden, true);
  assert.equal(state.busy, 'false');
  assert.equal(state.blocked, true);
  assert.equal(state.accessible, true);
  assert.ok(state.elapsed < 250, `Reduced motion ready took ${state.elapsed}ms`);
  assert.equal(state.animation, 'none');
  await page.close();
});
