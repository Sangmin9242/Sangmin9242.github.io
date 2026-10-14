# Interactive startup optimization

## What changed

- The small `site-start.js` bootstrap displays the loading shell before importing the scene bundle. The shell stays visible until local styles, the robot, material textures, shader compilation and the first rendered frame are ready. CSS/download/render failures show retry and a CV link.
- The production module graph is bundled and minified with esbuild. The entry and CSS URLs contain content hashes; scene chunks have hashed filenames. Keep previously published chunks for cached entries.
- The STEP-derived robot is transported as gzip and expands to the original GLB byte for byte. Browsers without `DecompressionStream`, or a failed compressed request, fall back to the original GLB. Download percentages are shown only when a valid transfer length is known.
- Only explicitly marked stationary mesh leaves are combined, within small spatial cells and a shared parent/material. Moving parents, collision poles, independently animated objects and interactive identities are preserved.
- Overseas and domestic map requests start when their journey is selected. Gallery photos use high quality WebP; desktop originals remain unchanged.

## Quality checks

Model geometry, all six PBR material textures, antialiasing, pixel ratio cap and shadow resolution remain unchanged. Static batching preserves vertices, normals, UVs, vertex colors and triangles. Gallery orientation is preserved, with at least 46.2 dB PSNR at tested display sizes; the transparent gallery PNG retains every visible color and alpha byte. See `optimized-assets.json` for sizes, hashes and measurements.

## Measured comparison

Baseline: commit `9ab0862`. Same local server with gzip for text, fresh Chrome page, 1440 × 900, DPR 1, mocked weather/counter. Measurements depend on hardware, connection and cache; they are not a guaranteed loading time on visitors' devices.

| Metric | Before | After |
| --- | ---: | ---: |
| Initial local requests | 66 | 19 |
| Initial encoded body bytes | 10,075,182 | 5,472,223 |
| First rendered frame | 25.20 s | 11.42 s |
| Mean measured CPU frame work | 24.05 ms | 19.63 ms |
| Main view draw calls | 2,721 | 2,158 |

The robot alone changes from 6,764,896 to 2,424,490 transfer bytes. The six gallery files change from 14,022,126 to 2,821,466 bytes. Batching changes culling granularity, so the visible triangle count can increase slightly even though no source triangles are added or removed.

## Build and verification

Install the versions in `package.json`, then run `npm run build` and `npm test`. Commit sources and generated files together. Asset regeneration uses `node scripts/optimize-assets.cjs`; it reads source files and writes separate outputs.

136 automated tests passed. Chrome checks at desktop and mobile widths verified the loading shell, download failure/retry, six-photo gallery, office book page turns, campus portal, overseas/domestic journeys, football aiming/shooting and bowling delivery/pins/scoring. Driving checks covered all five vehicles, current-position parking return and worker exit, plus keyboard/touch controls and mirrors. Separate injected failures verified recovery when CSS fails before the bootstrap starts and when the first WebGL draw throws.
