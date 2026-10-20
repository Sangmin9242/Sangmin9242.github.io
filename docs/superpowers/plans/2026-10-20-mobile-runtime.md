# Mobile runtime optimization

**Goal:** Reduce mobile frame stalls without adding features, changing model geometry, lowering pixel ratio, weakening lighting, or removing interactions.

**Scope:** Existing interactive homepage only. Research content additions are cancelled by the user's latest instruction.

## Steps

- [x] Capture current mobile-sized daytime/nighttime frame timing and CPU samples with a fixed weather/date and a separate Chrome launch. CPU throttling is a proxy, not a real phone GPU.
- [x] Fix the measured hot paths with regression tests written before the fix. Rendering dominates the profile: batch fixed transport/avatar leaves and instance the 91 runway fittings; keep physics, elapsed-time handling, raycasting, shadows and shared models correct. A throwaway transform-cache probe did not improve timing and was discarded.
- [x] Compare against the baseline under identical conditions, including close views and movement. Day/night screenshot comparisons retained appearance. The repeated paired night sample improved site 23.7→24.4 fps and office 48.5→50.5 fps; the earlier night sample varied more. Record final paired results and the limitation in docs/performance.md.
- [x] Run the complete automated suite (171 passing), verify desktop/mobile navigation, games, pet, boarding, driving and weather as affected, and inspect screenshots. Read-only review found no actionable regression.
- [x] Rebuild production files and retain published hashed chunks. The full 171-test suite and bundled startup/gallery/maps/failure-retry checks pass against final sources.

**Release gate after commit:** Publish, compare public bundles/model bytes with local outputs, check public office/gallery/startup, then report measured gains and limits.

**Execution:** Inline in the current chat. The user has approved optimization; no additional design approval is required.
