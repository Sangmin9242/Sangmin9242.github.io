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

## Runtime follow-up for slower CPUs

Baseline for this follow-up: `f22c088`. Model geometry, material maps, pixel ratio, antialiasing and shadow settings are still unchanged.

- Robot CAD leaves are explicitly marked `rigidStatic=true` only after joint construction. `batchRigidModel` combines safe leaves within the same moving joint assembly, preserving named groups and the complete nozzle subtree. The existing initialized robot changes from 679 meshes to 116, retaining all 184,596 triangles and 12 joints. A real-model comparison checked 234,871 vertices before/after joint rotation, with unchanged UVs/nozzle bounds and at most 0.00001508 m position rounding error.
- Sports fixtures share equivalent immutable materials and use the existing spatial batching. Roof/wall controls, balls, sweeps and individual pin groups remain independent. The fixture test changes 224 meshes to 118, retaining 23,910 triangles.
- Hotspot layout reads all dimensions before writing styles, caches stable DOM membership, skips hidden roots and avoids unchanged style writes. Projections and collision placement still update every frame.
- Zero-intensity street/work/runway and sports spotlights become invisible to the renderer during daytime. Fixtures and night illumination stay unchanged. Sports lighting is prepared before shader compilation so warmup and the first displayed frame use the same active light list.

Controlled local comparison: separate Chrome launches, 1366 × 768, DPR 1, CPU throttled 4×, fixed Seoul date/time/weather, 10-second samples, no concurrent tests or CPU profiler. These simulate slower CPU execution; they do not emulate a weaker GPU or establish a universal minimum PC specification.

| Scene | Before | After |
| --- | ---: | ---: |
| Daytime site | 10.8 fps | 17.1 fps |
| Daytime office | 21.0 fps | 26.2 fps |
| Nighttime site | 16.1 fps | 17.0 fps |
| Nighttime office | 27.7 fps | 33.8 fps |

Nighttime main-view draw calls changed from 2,055 to 1,451. Nighttime overall-frame gains were limited despite fewer draw calls; the complete site can still stutter on slower hardware.

The final automated suite passed 154 tests. Fixed-time/reduced-motion visual comparisons checked daytime site/office/robot/bowling and nighttime site/office. Office screenshots were byte-identical; the other images had at most 0.057% of pixels differing by more than 8 RGB levels. Live Chrome checks separately cover moving joints, games and navigation rather than inferring behavior from frozen screenshots.

## Mobile rendering follow-up (20 October 2026)

Baseline: `158f7ef`. This follow-up only changes rendering internals; homepage content and controls are unchanged. Geometry, materials/textures, DPR cap (1.75), shadow resolution, fixture positions/counts and night light intensities are preserved.

- Compact transport and avatar constructors explicitly mark fixed leaves for parent-local batching. `spatial:false` removes unnecessary cell boundaries within each compact joint, while doors, gear, limbs, hands, kit visibility groups and the addressable fuselage remain independent.
- All 91 runway fittings now use seven draw objects: one instanced rim, four emissive lens batches, instanced ground pools and instanced camera-facing halos. Halo shaders reuse the vendored Sprite shader with per-instance centres, sizes and colours, retaining attenuation, fog, additive blending and colour conversion.
- A throwaway transform cache did not improve the measured frame timing and was discarded.

Final paired samples: separate Chrome launches, 390 × 844, device DPR 2/render DPR 1.75, 4× CPU throttling, fixed Seoul day/night weather, eight-second samples. Browser simulation does not emulate a real phone GPU, thermal state or browser. Frame timing varies between runs; these are observed samples, not universal frame-rate promises.

| Scene | Before | After |
| --- | ---: | ---: |
| Day site | 18.9 fps | 22.0 fps |
| Day office | 30.1 fps | 41.1 fps |
| Night site | 23.7 fps | 24.4 fps |
| Night office | 48.5 fps | 50.5 fps |

Night site draw calls fell from 1,208 to 928 (23.2%). Day site calls fell from 1,116 to 912. The visible triangle count can increase modestly because batching changes culling granularity; constructor tests retain the exact complete-model triangle totals. Nighttime site gains remain limited, so slower phones can still stutter.

Verification: 171 automated tests; PC/mobile live football and bowling; both boarding routes, carried props, maps and return; all five car trips, driver controls, mirrors and parking return; bundled loading, failure/retry, office book and photo gallery. Day/night fixed-time image comparisons over site/office/bowling/robot views had at most 0.0185% of pixels differing by more than 8 RGB levels. Shader compilation produced no console errors. A read-only review found no actionable regression.
