import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const source = await readFile(new URL('../responsive-labels.js', import.meta.url), 'utf8');
const three = await readFile(new URL('../vendor/three.module.js', import.meta.url), 'utf8');
let browser, page;

before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
});
after(async () => browser?.close());
afterEach(async () => page?.close());
beforeEach(async () => {
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.setContent(`<!doctype html><style>
    body{margin:0}.world{position:relative;width:1000px;height:700px;margin:10px 20px}
    .hotspots{position:absolute;inset:0}.hotspot{position:absolute;left:0;top:0;width:120px;height:40px}
    .scene-tools{position:absolute;left:850px;top:50px;width:100px;height:40px}
  </style><div class="world"><div class="scene-tools"></div><div class="hotspots">
    <button class="hotspot office-hotspot" data-scene-key="office">Office</button>
    <button class="hotspot" data-research="first">First</button>
    <button class="hotspot" data-scene-key="second">Second</button>
    <button class="hotspot" data-scene-key="outside">Outside</button>
  </div></div>`);
  await page.evaluate(async ({ source, three }) => {
    const encode = code => 'data:text/javascript;base64,' + btoa(unescape(encodeURIComponent(code)));
    const THREE = await import(encode(three));
    const { responsiveLabels } = await import(encode(source));
    const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, .1, 100);
    camera.position.set(0, 0, 10);camera.lookAt(0, 0, 0);camera.updateMatrixWorld();
    window.fixture = { buttons: [...document.querySelectorAll('.hotspot')], camera,
      anchors: { office: new THREE.Vector3(), first: new THREE.Vector3(), second: new THREE.Vector3(), outside: new THREE.Vector3(25, 0, 0) },
      width: 1000, height: 700, top: 0, officeMode: false };
    window.place = () => responsiveLabels(fixture);
    window.positions = () => Object.fromEntries(fixture.buttons.map(button => [button.dataset.research || button.dataset.sceneKey, { visibility: button.style.visibility, transform: button.style.transform }]));
  }, { source, three });
});

test('unchanged cameras retain exact ordered collision placement and office visibility', async () => {
  const result = await page.evaluate(() => { place();const first = positions();place();return { first, second: positions() }; });
  const expected = {
    office: { visibility: 'hidden', transform: '' },
    first: { visibility: 'visible', transform: 'translate(490px, 350px)' },
    second: { visibility: 'visible', transform: 'translate(280px, 350px)' },
    outside: { visibility: 'hidden', transform: '' },
  };
  assert.deepEqual(result.first, expected);
  assert.deepEqual(result.second, expected);
  const office = await page.evaluate(() => { fixture.officeMode = true;place();return positions().office; });
  assert.deepEqual(office, { visibility: 'visible', transform: 'translate(490px, 302px)' });
});

test('labels follow every camera movement without a throttled update interval', async () => {
  const frames = await page.evaluate(() => Array.from({ length: 9 }, (_, i) => {
    fixture.camera.position.x = i / 4;fixture.camera.updateMatrixWorld();place();return positions();
  }));
  frames.forEach((frame, i) => {
    assert.equal(frame.first.transform, `translate(${490 - i * 12.5}px, 350px)`);
    assert.equal(frame.second.transform, `translate(${280 - i * 12.5}px, 350px)`);
  });
});

test('reserved bounds and label dimensions are measured again after layout changes', async () => {
  const result = await page.evaluate(() => {
    place();document.querySelector('.scene-tools').style.cssText = 'left:480px;top:340px;width:150px;height:70px';
    fixture.buttons.find(button => button.dataset.research).style.width = '180px';place();return positions();
  });
  assert.equal(result.first.transform, 'translate(220px, 350px)');
  assert.equal(result.second.transform, 'translate(280px, 302px)');
});

test('compact mode retains all site links and reacts immediately to office and viewport changes', async () => {
  await page.setViewportSize({ width: 1100, height: 900 });
  const compact = await page.evaluate(() => { place();return positions(); });
  assert.equal(compact.first.visibility, 'visible');
  assert.equal(compact.outside.visibility, 'visible');
  assert.equal(compact.office.visibility, 'hidden');
  const office = await page.evaluate(() => { fixture.officeMode = true;place();return positions().office.visibility; });
  assert.equal(office, 'visible');
  await page.setViewportSize({ width: 1101, height: 900 });
  const desktop = await page.evaluate(() => { place();return positions(); });
  assert.equal(desktop.outside.visibility, 'hidden');
  assert.equal(desktop.first.transform, 'translate(490px, 350px)');
});

test('display none hotspot modes do no geometry or style work and recover on the next frame', async () => {
  const result = await page.evaluate(() => {
    const root = document.querySelector('.hotspots');root.style.display = 'none';
    let reads = 0;
    for (const button of fixture.buttons) Object.defineProperty(button, 'offsetWidth', { configurable: true, get() { reads++;return 0; } });
    const observer = new MutationObserver(() => {});observer.observe(root, { attributes: true, subtree: true });
    place();const writes = observer.takeRecords().length;observer.disconnect();
    for (const button of fixture.buttons) delete button.offsetWidth;
    root.style.display = '';place();return { reads, writes, restored: positions() };
  });
  assert.equal(result.reads, 0);
  assert.equal(result.writes, 0);
  assert.equal(result.restored.first.transform, 'translate(490px, 350px)');
});

test('all label measurements precede style mutations and each reserved style is read once', async () => {
  const result = await page.evaluate(() => {
    const root = document.querySelector('.hotspots'),observer = new MutationObserver(() => {});
    observer.observe(root, { attributes: true, subtree: true });
    const readEvents = [];
    for (const button of fixture.buttons) for (const property of ['offsetWidth', 'offsetHeight']) {
      const native = Object.getOwnPropertyDescriptor(HTMLElement.prototype, property).get;
      Object.defineProperty(button, property, { configurable: true, get() {
        readEvents.push({ property, precedingWrites: observer.takeRecords().length });return native.call(this);
      } });
    }
    const nativeStyle = window.getComputedStyle;let reservedStyleReads = 0;
    window.getComputedStyle = function (node, ...args) {
      if (node.matches('.scene-tools')) reservedStyleReads++;return nativeStyle.call(this, node, ...args);
    };
    place();const finalWrites = observer.takeRecords().length;observer.disconnect();
    return { readEvents, finalWrites, reservedStyleReads };
  });
  assert.equal(result.readEvents.length, 8);
  assert.ok(result.readEvents.every(event => event.precedingWrites === 0), JSON.stringify(result.readEvents));
  assert.ok(result.finalWrites > 0);
  assert.equal(result.reservedStyleReads, 1);
});
