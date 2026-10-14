/* Rebuild the optional transfer assets without changing their source files.
 * Run with Node and sharp installed (the Codex bundled sharp is also detected).
 * Browser use of the robot requires explicit gzip decompression before GLTFLoader.parseAsync.
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { gzipSync } = require('node:zlib');
let sharp;
try { sharp = require('sharp'); } catch {
  sharp = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'));
}
const root = path.resolve(__dirname, '..');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const manifest = {
  version: 1,
  notes: [
    'Original assets remain unchanged. The gzip model expands to the original GLB byte for byte.',
    'Gallery JPEGs are fully decoded, EXIF oriented, and resized to at most 2000 pixels before high quality WebP encoding.',
    'The transparent PNG retains every alpha byte and every visible RGB byte. Fully transparent RGB values may be normalized by the lossless WebP codec.',
    'PSNR measurements use the same full decoded sRGB pixels and the same contain resize for source and output, avoiding JPEG decoder shrink differences.',
    'All six PBR textures and all three conference photographs stay in their original JPEG form because lossless WebP trials made every file larger.',
  ],
  assets: [],
};

async function writeAsset(source, output, bytes, details) {
  const original = await fs.readFile(path.join(root, source));
  await fs.writeFile(path.join(root, output), bytes);
  manifest.assets.push({ source, output, sourceBytes: original.length, outputBytes: bytes.length,
    sourceSha256: sha256(original), outputSha256: sha256(bytes), ...details });
}

async function main() {
  await fs.mkdir(path.join(root, 'assets/optimized'), { recursive: true });
  const robot = await fs.readFile(path.join(root, 'assets/robot/fireproofing-robot.glb'));
  await writeAsset('assets/robot/fireproofing-robot.glb', 'assets/optimized/fireproofing-robot.glb.gz',
    gzipSync(robot, { level: 9 }), { method: 'gzip', lossless: true, level: 9,
      browserDecode: "fetch → DecompressionStream('gzip') → GLTFLoader.parseAsync" });
  const files = ['maltipoo-photo.jpg', 'maltipoo-photo-2.png', 'maltipoo-photo-3.jpg',
    'maltipoo-photo-4.jpg', 'maltipoo-photo-5.jpg', 'maltipoo-photo-6.jpg'];
  for (const file of files) {
    const source = `assets/${file}`;
    const original = await sharp(path.join(root, source)).rotate().raw().toBuffer({ resolveWithObject: true });
    const transparent = file.endsWith('.png');
    const recipe = transparent ? { lossless: true, effort: 6 } : { quality: 94, effort: 6 };
    const bytes = await sharp(original.data, { raw: original.info })
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .webp(recipe).toBuffer();
    const decoded = await sharp(bytes).raw().toBuffer({ resolveWithObject: true });
    const details = { method: 'webp', ...recipe, sourceOrientedWidth: original.info.width,
      sourceOrientedHeight: original.info.height, outputWidth: decoded.info.width, outputHeight: decoded.info.height };
    if (!transparent) {
      details.psnrAtContainSize = [];
      for (const [width, height] of [[280, 180], [560, 360], [1120, 720], [1740, 780]]) {
        const resized = async image => sharp(image.data, { raw: image.info })
          .resize({ width, height, fit: 'inside' }).raw().toBuffer();
        const a = await resized(original), b = await resized(decoded);
        let squaredError = 0;
        for (let i = 0; i < a.length; i++) squaredError += (a[i] - b[i]) ** 2;
        details.psnrAtContainSize.push({ width, height,
          decibels: Number((10 * Math.log10(255 ** 2 / (squaredError / a.length))).toFixed(4)) });
      }
    }
    await writeAsset(source, `assets/optimized/${file.replace(/\.(jpg|png)$/, '.webp')}`, bytes, details);
  }
  manifest.totalSourceBytes = manifest.assets.reduce((sum, entry) => sum + entry.sourceBytes, 0);
  manifest.totalOutputBytes = manifest.assets.reduce((sum, entry) => sum + entry.outputBytes, 0);
  manifest.savedBytes = manifest.totalSourceBytes - manifest.totalOutputBytes;
  await fs.writeFile(path.join(root, 'optimized-assets.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ assets: manifest.assets.length, originalBytes: manifest.totalSourceBytes,
    optimizedBytes: manifest.totalOutputBytes, savedBytes: manifest.savedBytes }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
