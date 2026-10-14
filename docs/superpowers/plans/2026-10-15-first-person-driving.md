# First-person driving implementation plan

**Goal:** Board any parked car, select Direct drive, and use arrow keys from the driver's eye position.

**Architecture:** Freeze the existing automatic trip at a closed-door seated checkpoint. A renderer-independent driving simulation controls the vehicle while UI inputs and a cockpit camera remain separate. On exit, retrace accepted driving movement to that checkpoint, then resume the original automatic trip without teleporting.

**Constraints:** Preserve five cars, plates on physical vehicles only, all CV content, night lighting and existing automatic boarding/return. Collision-check the complete vehicle and mirrors against pavement limits, parked vehicles and fixtures. Clear inputs on blur/hidden/exit. Provide touch controls on mobile and EN/KO copy. No added dependencies.

- [x] Pure simulation `car-driving.js`, failing tests then acceleration/reverse/steering/brake/coast, collision, FPS, pause, invalid input and exact smooth recovery tests.
- [x] Cockpit helper `car-cockpit.js`: inside all five car models, clear windscreen, avatar head clipping removal, forward/rear view, restore materials/camera.
- [x] UI/input `car-drive-controls.js` + integration in `car-life.js`: queue Direct drive while boarding, freeze automatic trip, mobile pad, speed/instructions/exit, resume via recovery.
- [x] Camera and interaction guards in `experience.js`; CSS responsive HUD; refresh cache URLs.
- [x] Browser QA at1440/1024/390, real keyboard/touch events, allfive cockpit scenes, no input bleed or camera jumping; unit regressions.
- [ ] Focused review, deploy GitHub Pages, verify live files/UI.
