const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { gunzipSync } = require('node:zlib');
let sharp;
try { sharp = require('sharp'); } catch {
  sharp = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'));
}
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const expectedHashes = {
  'assets/robot/fireproofing-robot.glb': 'aa3cc449a50694f5c572769a5e2c23b3ac25d4e610fd4875df6bb9d474f72bc5',
  'assets/maltipoo-photo.jpg': 'b66a65da3e34ede4909cdf2fc6fa4384ce45e8640c930944dd82f26241b84baf',
  'assets/maltipoo-photo-2.png': 'b7f3c31c5a76d7d86a63ab056a4f011dcaa4ab568f6d2afeef98833a652f3d05',
  'assets/maltipoo-photo-3.jpg': 'ec75173394345883283aa88f676c567ad0a12cfa73dc28c1d932c0385e8649d3',
  'assets/maltipoo-photo-4.jpg': '65ee6c2cff7fde0c8f78aec7d468d98feca415b28bcef0f780889d21c7dec19c',
  'assets/maltipoo-photo-5.jpg': 'ba6f5ffa522224734159a61fe346b18102cda26b6dcb9c128cf5e7448613d15b',
  'assets/maltipoo-photo-6.jpg': 'b524e26c487e3faf0cf970e90b967cf61eced1d8c90a34525f5caddcb7442772',
};

test('gzip robot retains all original bytes, geometry, hierarchy and names', () => {
  const optimized = path.join(root, 'assets/optimized/fireproofing-robot.glb.gz');
  assert.ok(fs.existsSync(optimized), 'optimized robot must exist');
  const original = read('assets/robot/fireproofing-robot.glb');
  const compressed = fs.readFileSync(optimized);
  assert.deepEqual(gunzipSync(compressed), original);
  assert.ok(compressed.length < original.length * .4, 'robot should save at least 60%');
});

test('lossless transparent dog image retains every visible color and alpha byte', async () => {
  const optimized = path.join(root, 'assets/optimized/maltipoo-photo-2.webp');
  assert.ok(fs.existsSync(optimized), 'lossless dog image must exist');
  const a = await sharp(read('assets/maltipoo-photo-2.png')).rotate().ensureAlpha().raw().toBuffer();
  const b = await sharp(optimized).ensureAlpha().raw().toBuffer();
  assert.equal(a.length, b.length);
  for (let i = 0; i < a.length; i += 4) {
    assert.equal(a[i + 3], b[i + 3], `alpha at pixel ${i / 4}`);
    if (a[i + 3]) assert.deepEqual(a.subarray(i, i + 3), b.subarray(i, i + 3));
  }
});

test('gallery images keep orientation and excellent fidelity at desktop and mobile display sizes', async () => {
  for (const source of Object.keys(expectedHashes).filter(file => file.endsWith('.jpg'))) {
    const optimized = source.replace('assets/', 'assets/optimized/').replace('.jpg', '.webp');
    assert.ok(fs.existsSync(path.join(root, optimized)), `missing ${optimized}`);
    const original = await sharp(read(source)).rotate().removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const output = await sharp(read(optimized)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(Math.max(output.info.width, output.info.height), 2000);
    assert.ok(Math.abs(original.info.width / original.info.height - output.info.width / output.info.height) < .001, 'EXIF orientation/aspect preserved');
    for (const [width, height] of [[280, 180], [560, 360], [1120, 720], [1740, 780]]) {
      const resize = async image => sharp(image.data, { raw: image.info }).resize({ width, height, fit: 'inside' }).raw().toBuffer();
      const a = await resize(original), b = await resize(output);
      assert.equal(a.length, b.length);
      let sum = 0;
      for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
      const psnr = 10 * Math.log10(255 ** 2 / (sum / a.length));
      assert.ok(psnr >= 44, `${source} ${width}x${height} PSNR ${psnr.toFixed(2)}dB`);
    }
  }
});

test('manifest describes real files and leaves every original untouched', () => {
  const manifestPath = path.join(root, 'optimized-assets.json');
  assert.ok(fs.existsSync(manifestPath), 'asset manifest must exist');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.assets.length, 7);
  for (const entry of manifest.assets) {
    const source = read(entry.source), output = read(entry.output);
    assert.equal(hash(source), expectedHashes[entry.source]);
    assert.equal(entry.sourceSha256, hash(source));
    assert.equal(entry.outputSha256, hash(output));
    assert.equal(entry.sourceBytes, source.length);
    assert.equal(entry.outputBytes, output.length);
    assert.ok(output.length < source.length);
  }
});
