import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const files = new Map(await Promise.all(['sports-facilities.js', 'scene-batching.js', 'vendor/three.module.js', 'vendor/BufferGeometryUtils.js'].map(async name => ['/' + name, await readFile(new URL('../' + name, import.meta.url), 'utf8')])));
let browser, page;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
});
after(async () => browser?.close());
afterEach(async () => page?.close());
beforeEach(async () => {
  page = await browser.newPage();
  await page.route('http://sports.test/**', route => {
    const source = files.get(new URL(route.request().url()).pathname);
    return route.fulfill({ contentType: source ? 'text/javascript' : 'text/html', body: source || '<!doctype html><body></body>' });
  });
  await page.goto('http://sports.test/');
  await page.evaluate(async () => {
    window.THREE = await import('/vendor/three.module.js');
    const { sportsFacilities } = await import('/sports-facilities.js');
    window.batchStaticScene = (await import('/scene-batching.js')).batchStaticScene;
    window.root = new THREE.Group();window.facility = sportsFacilities(root);
    window.meshes = object => { const result = [];object.traverse(node => { if (node.isMesh) result.push(node); });return result; };
  });
});

test('equivalent immutable fixture materials share identity while textures and distinct properties retain identity', async () => {
  const result = await page.evaluate(() => {
    const all = meshes(root),red = all.filter(mesh => mesh.material.color.getHex() === 0xc74b47);
    const wood = all.filter(mesh => mesh.material.map?.image.width === 256 && mesh.material.map.image.height === 1024);
    const screens = all.filter(mesh => mesh.material.map?.image.width === 512);
    const score = all.find(mesh => mesh.material.map === facility.scoreTexture);
    return {
      redCount: red.length, redMaterials: new Set(red.map(mesh => mesh.material)).size,
      red: { color: red[0].material.color.getHex(), roughness: red[0].material.roughness, metalness: red[0].material.metalness },
      woodCount: wood.length, woodMaterials: new Set(wood.map(mesh => mesh.material)).size,
      wood: { roughness: wood[0].material.roughness, metalness: wood[0].material.metalness },
      screens: screens.length, screenMaterials: new Set(screens.map(mesh => mesh.material)).size,
      screenTextures: new Set(screens.map(mesh => mesh.material.map)).size,
      scoreMap: score.material.map === facility.scoreTexture && score.material.emissiveMap === facility.scoreTexture,
      scoreCanvas: score.material.map.image === facility.scoreCanvas,
      scoreProperties: { color: score.material.color.getHex(), emissive: score.material.emissive.getHex(), intensity: score.material.emissiveIntensity },
      ballProperties: { roughness: facility.bowlingBalls[0].material.roughness, metalness: facility.bowlingBalls[0].material.metalness },
    };
  });
  assert.equal(result.redCount, 40);
  assert.equal(result.redMaterials, 1);
  assert.deepEqual(result.red, { color: 0xc74b47, roughness: .75, metalness: 0 });
  assert.equal(result.woodCount, 4);
  assert.equal(result.woodMaterials, 1);
  assert.deepEqual(result.wood, { roughness: .27, metalness: .05 });
  assert.equal(result.screens, 2);
  assert.equal(result.screenMaterials, 2);
  assert.equal(result.screenTextures, 2);
  assert.equal(result.scoreMap, true);
  assert.equal(result.scoreCanvas, true);
  assert.deepEqual(result.scoreProperties, { color: 0xffffff, emissive: 0xffffff, intensity: .6 });
  assert.deepEqual(result.ballProperties, { roughness: .16, metalness: .12 });
});

test('fixture batching removes draw objects while preserving world vertices normals UVs triangles and bounds', async t => {
  const result = await page.evaluate(() => {
    root.position.set(3, 1, -8);root.rotation.y = .37;
    function snapshot() {
      root.updateMatrixWorld(true);
      const values = [];
      for (const mesh of meshes(root)) {
        const position = mesh.geometry.attributes.position, normal = mesh.geometry.attributes.normal, uv = mesh.geometry.attributes.uv;
        const matrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
        for (let i = 0; i < position.count; i++) {
          const point = new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
          const n = new THREE.Vector3().fromBufferAttribute(normal, i).applyNormalMatrix(matrix);
          values.push([...point.toArray(), ...n.toArray(), ...(uv ? [uv.getX(i), uv.getY(i)] : [])]);
        }
      }
      return values.sort((a, b) => { for (let i = 0; i < a.length; i++) { if (Math.abs(a[i] - b[i]) > 1e-5) return a[i] - b[i]; } return 0; });
    }
    const before = snapshot(), bounds = new THREE.Box3().setFromObject(root, true);
    const stats = batchStaticScene(root), after = snapshot(), afterBounds = new THREE.Box3().setFromObject(root, true);
    let maximumError = 0;
    if (before.length === after.length) for (let i = 0; i < before.length; i++) for (let j = 0; j < before[i].length; j++) maximumError = Math.max(maximumError, Math.abs(before[i][j] - after[i][j]));
    return { stats, before: before.length, after: after.length, maximumError,
      boundsError: Math.max(bounds.min.distanceTo(afterBounds.min), bounds.max.distanceTo(afterBounds.max)) };
  });
  assert.ok(result.stats.meshesRemoved >= 40, JSON.stringify(result.stats));
  assert.equal(result.stats.trianglesBefore, result.stats.trianglesAfter);
  assert.equal(result.before, result.after);
  assert.ok(result.maximumError < 2e-5, String(result.maximumError));
  assert.ok(result.boundsError < 2e-5, String(result.boundsError));
  t.diagnostic(JSON.stringify(result));
});

test('roof walls balls sweeps and pin groups keep their individual controls after batching', async () => {
  const result = await page.evaluate(() => {
    const roof = facility.bowling.children.find(mesh => mesh.geometry?.parameters.width === 6.95);
    const walls = facility.bowling.children.filter(mesh => mesh.geometry?.parameters.height === 1.7);
    const scoreMaterial = meshes(root).find(mesh => mesh.material.map === facility.scoreTexture).material;
    const pins = facility.pins.flat(), first = pins[0], second = pins[1];
    const stats = batchStaticScene(root);
    facility.setFocus('bowling');const hidden = [roof, ...walls].every(mesh => mesh.visible === false && mesh.parent === facility.bowling);
    facility.setFocus('football');const shown = [roof, ...walls].every(mesh => mesh.visible && mesh.parent === facility.bowling);
    facility.ball.position.set(1, 2, 3);facility.ball.rotation.x = .7;
    facility.bowlingBalls[0].position.set(4, 5, 6);facility.bowlingBalls[0].rotation.z = .5;
    const secondPinPosition = second.position.toArray();first.position.x += 1;first.rotation.z = .4;first.visible = false;
    facility.sweepBars[0].visible = true;facility.sweepBars[0].position.z += 2;
    facility.scoreCanvas.getContext('2d').fillRect(0, 0, 10, 10);facility.scoreTexture.needsUpdate = true;
    root.updateMatrixWorld(true);
    return { hidden, shown, stats, walls: walls.length,
      ball: facility.ball.parent === facility.football && facility.ball.position.x === 1 && facility.ball.rotation.x === .7,
      bowlingBalls: facility.bowlingBalls.every(ball => ball.parent === facility.bowling),
      sweeps: facility.sweepBars.every(mesh => mesh.parent === facility.bowling) && facility.sweepBars[0].visible && !facility.sweepBars[1].visible,
      pins: pins.length === 20 && pins.every(pin => pin.parent === facility.bowling && pin.children.length === 2 && pin.children.some(mesh => mesh.userData.staticBatch && mesh.userData.originalCount === 2)),
      otherPinUnchanged: second.position.toArray().every((value, i) => value === secondPinPosition[i]) && second.visible,
      scoreIdentity: scoreMaterial.map === facility.scoreTexture && scoreMaterial.map.image === facility.scoreCanvas,
      dynamicMarkers: [roof, ...walls, facility.ball, ...facility.bowlingBalls, ...facility.sweepBars].every(mesh => mesh.userData.staticSite !== true),
    };
  });
  assert.equal(result.walls, 2);
  for (const key of ['hidden', 'shown', 'ball', 'bowlingBalls', 'sweeps', 'pins', 'otherPinUnchanged', 'scoreIdentity', 'dynamicMarkers']) assert.equal(result[key], true, key);
  assert.ok(result.stats.meshesRemoved >= 40);
});

test('daylight excludes zero intensity sports lights while night preserves all illumination and focus controls', async () => {
  const result = await page.evaluate(() => {
    const spots = [];root.traverse(node => { if (node.isSpotLight) spots.push(node); });
    const state = () => ({ active: spots.filter(light => light.visible).length, intensities: spots.map(light => light.intensity) });
    const initial = state();facility.setLights(false);const day = state();
    facility.setLights(true);const nightAuto = state();
    facility.setFocus('bowling');facility.setLights(true);const nightFocused = state();
    const roof = facility.bowling.children.find(mesh => mesh.geometry?.parameters.width === 6.95);
    const walls = facility.bowling.children.filter(mesh => mesh.geometry?.parameters.height === 1.7);
    const hiddenAtNight = [roof, ...walls].every(mesh => !mesh.visible);
    facility.setLights(false);const focusedDay = state();
    const focusPreserved = [roof, ...walls].every(mesh => !mesh.visible) && facility.football.visible && facility.bowling.visible;
    facility.setFocus('football');const shown = [roof, ...walls].every(mesh => mesh.visible);
    return { initial, day, nightAuto, nightFocused, focusedDay, hiddenAtNight, focusPreserved, shown };
  });
  assert.deepEqual(result.initial, { active: 0, intensities: [0, 0, 0] });
  assert.deepEqual(result.day, { active: 0, intensities: [0, 0, 0] });
  assert.deepEqual(result.nightAuto, { active: 3, intensities: [187.5, 95, 95] });
  assert.deepEqual(result.nightFocused, { active: 3, intensities: [750, 380, 380] });
  assert.deepEqual(result.focusedDay, { active: 0, intensities: [0, 0, 0] });
  for (const key of ['hiddenAtNight', 'focusPreserved', 'shown']) assert.equal(result[key], true, key);
});
