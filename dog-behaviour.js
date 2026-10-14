// A deterministic, session-only companion. Coordinates are world metres and
// local +Z is forward. The office slab ends at z7.26; parked cars start near
// z19.9. This small route keeps a generous gap from both and from the sports
// annex, railway and construction robot. Calling follows the same safe path.
const POINTS = [[-10.5, 8.5], [-10.5, 10.5], [-14, 10.5], [-14, 15],
  [-7, 15], [-7, 10.5], [-10.5, 10.5], [-10.5, 8.5]];
const DISTANCES = [0];
for (let i = 1; i < POINTS.length; i++) DISTANCES.push(DISTANCES[i - 1] + Math.hypot(
  POINTS[i][0] - POINTS[i - 1][0], POINTS[i][1] - POINTS[i - 1][1]));
const LENGTH = DISTANCES.at(-1), EPSILON = 1e-9;
const HOME_HEADING = Math.atan2(2.7, -3.25);
const ROUTINE = [
  { action: 'sit', pose: 'sit', duration: 8 },
  { action: 'rest', pose: 'lie', duration: 6 },
  { action: 'walk', pose: 'walk', target: DISTANCES[3], speed: .85 },
  { action: 'sniff', pose: 'sniff', duration: 3 },
  { action: 'run', pose: 'run', target: DISTANCES[4], speed: 1.8 },
  { action: 'sit', pose: 'sit', duration: 4 },
  { action: 'walk', pose: 'walk', target: LENGTH, speed: .85 },
];

export function createDogBehaviour({ reducedMotion = false } = {}) {
  const state = {};
  let paused, focused, progress, stage, wait, response, responseLeft, returning, returnTarget;

  function setPose(action, pose, speed = 0) {
    if (state.action !== action) state.actionTime = 0;
    state.action = action; state.pose = pose;
    state.speed = speed; state.moving = speed > 0;
  }

  function positionAt(distance, direction = 1) {
    let segment = POINTS.length - 2;
    for (let i = 0; i < POINTS.length - 1; i++) {
      if (distance < DISTANCES[i + 1] - EPSILON ||
          (direction < 0 && distance <= DISTANCES[i + 1] + EPSILON)) { segment = i; break; }
    }
    const [ax, az] = POINTS[segment], [bx, bz] = POINTS[segment + 1];
    const blend = Math.max(0, Math.min(1, (distance - DISTANCES[segment]) /
      (DISTANCES[segment + 1] - DISTANCES[segment])));
    state.x = ax + (bx - ax) * blend; state.z = az + (bz - az) * blend;
    state.heading = Math.atan2((bx - ax) * direction, (bz - az) * direction);
  }

  function enterStage(index) {
    stage = index; wait = ROUTINE[index].duration || 0;
    const current = ROUTINE[index]; setPose(current.action, current.pose, current.speed || 0);
    if (index === 0) state.heading = HOME_HEADING;
  }

  function resumePose() {
    if (response) return;
    if (returning) setPose('call', 'walk', 1.1);
    else if (reducedMotion || focused) setPose('sit', 'sit');
    else {
      const current = ROUTINE[stage];
      setPose(current.action, current.pose, current.speed || 0);
    }
  }

  function reset() {
    paused = false; focused = false; progress = 0; response = null; responseLeft = 0; returning = false;
    Object.assign(state, { x: -10.5, z: 8.5, y: 0, heading: HOME_HEADING,
      pose: 'sit', action: 'sit', speed: 0, moving: false, affection: 50,
      hearts: 0, treats: 0, effectTime: 0, treatCooldown: 0, petCooldown: 0,
      time: 0, actionTime: 0, paused: false, focused: false });
    enterStage(0);
  }

  function returnHome() {
    returning = false; progress = 0; positionAt(0); enterStage(0);
  }

  function update(dt) {
    if (paused || !Number.isFinite(dt) || dt <= 0) return;
    // Hidden-tab or stalled frames never fast-forward the dog or its counters.
    dt = Math.min(dt, .25);
    const previousX = state.x, previousZ = state.z;
    state.time += dt;
    for (const timer of ['effectTime', 'treatCooldown', 'petCooldown']) state[timer] = Math.max(0, state[timer] - dt);
    let left = dt;
    while (left > EPSILON) {
      if (response) {
        const used = Math.min(left, responseLeft);
        responseLeft -= used; left -= used; state.actionTime += used;
        if (responseLeft <= EPSILON) {
          response = null;
          resumePose();
        }
        continue;
      }
      // Focus freezes only the routine. Responses and cooldowns continue, and
      // an explicit call may still follow the open route back to the office.
      if (reducedMotion || (focused && !returning)) { state.actionTime += left; break; }
      const current = returning ? { target: returnTarget, speed: 1.1 } : ROUTINE[stage];
      if (current.speed) {
        const direction = current.target >= progress ? 1 : -1;
        const used = Math.min(left, Math.abs(current.target - progress) / current.speed);
        progress += direction * current.speed * used;
        positionAt(progress, direction); state.actionTime += used; left -= used;
        if (Math.abs(progress - current.target) <= EPSILON) {
          progress = current.target; positionAt(progress, direction);
          if (returning) returnHome();
          else if (stage === ROUTINE.length - 1) returnHome();
          else enterStage(stage + 1);
        }
      } else {
        const used = Math.min(left, wait);
        wait -= used; left -= used; state.actionTime += used;
        if (wait <= EPSILON) enterStage(stage + 1);
      }
    }
    // A frame can straddle a corner. Face its actual travelled direction;
    // choosing only the new segment makes the last partial stride face sideways.
    if (state.moving && Math.hypot(state.x - previousX, state.z - previousZ) > EPSILON)
      state.heading = Math.atan2(state.x - previousX, state.z - previousZ);
  }

  function interact(kind) {
    if (paused || !['pet', 'treat', 'call'].includes(kind)) return false;
    if (kind === 'call') {
      response = null; responseLeft = 0;
      if (reducedMotion || progress < EPSILON || LENGTH - progress < EPSILON) returnHome();
      else {
        returning = true; returnTarget = progress < LENGTH / 2 ? 0 : LENGTH;
        setPose('call', 'walk', 1.1);
        // Face the next open path segment immediately; no position changes.
        positionAt(progress, returnTarget >= progress ? 1 : -1);
      }
      return true;
    }
    if (kind === 'treat' && state.treatCooldown > EPSILON) return false;
    if (kind === 'pet' && state.petCooldown > EPSILON) return false;
    response = kind; responseLeft = 3; state.actionTime = 0;
    setPose(kind, kind === 'pet' ? 'wag' : 'eat');
    state.affection = Math.min(100, state.affection + (kind === 'pet' ? 5 : 3));
    state.effectTime = 3;
    if (kind === 'pet') { state.hearts++; state.petCooldown = 2; }
    else { state.treats++; state.treatCooldown = 8; }
    return true;
  }

  reset();
  return { state, update, interact, reset,
    setFocused(value) {
      const next = Boolean(value);
      if (next === focused) return;
      focused = next; state.focused = focused; resumePose();
    },
    setPaused(value) { paused = Boolean(value); state.paused = paused; } };
}
