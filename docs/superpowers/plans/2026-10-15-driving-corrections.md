# Driving corrections implementation plan

> Execute within this task using independent model/cockpit and path-planning workers, then integrate and review the complete flow.

**Goal:** Match left/right controls to the driver's view, put the driver on the Korean left-hand seat, show working side mirrors, and return to the original bay from the current pose when driving ends.

**Architecture:** Keep manual bicycle motion independent from the renderer. A separate parking planner searches the paved space using the existing full-body occupancy callback, then follows sampled arcs from the current pose to the parked pose. Once parked, resume only the existing door opening, exit and walk-home sequence. Mirror cameras render low-resolution rear views and restore temporary cockpit resources after exit.

**Constraints:** Local +Z is forward, so the driver's right is local -X. No vehicle teleport, retracing user history, resumed outbound trip, new building collision, or plate numbers in UI. Preserve keyboard/touch controls and EN/KO.

## 1. Steering and trip handoff

- [x] Add a failing test projecting ArrowRight/ArrowLeft travel onto the driver's right/left at several headings; correct steering sign.
- [x] Test left-hand driver entry and `parked()` handoff: exact home pose, then exit and walk home; no outbound phases.
- [x] Align automatic worker entry heading and route with the supplied driver-door side.

## 2. Model and mirrors

- [x] Verify actual seats, steering wheel, door opening, body cutout and door-mounted mirror all move to +X.
- [x] Show rear-facing mirror views from the cockpit, including mobile framing. Dispose render targets and restore glass on exit.

## 3. Direct parking return

- [x] Test a planner with current pose and home target only, all five slots, reversed travel, road bends and obstacles.
- [x] Search incrementally while stationary; verify every followed arc with full-body collision checks. Slow down before reversing.
- [x] Swap manual control to the return controller on Finish driving. On arrival call `trip.parked()`; display current return state in EN/KO.

## 4. Verification and deployment

- [x] Run all pure tests and actual model collision/seat checks.
- [x] In browser test keyboard and touch directions, live mirror framing, exit from near/far poses, resource cleanup, and complete parking/worker return at desktop/mobile sizes.
- [ ] Focused review, commit, push GitHub Pages, verify deployed source and public driving flow.
