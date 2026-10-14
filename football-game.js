// Pure pitch-local simulation. Angles use +Z as forward: (sin heading, cos heading).
const STEP = 1 / 120;
const BALL_RADIUS = .18;
const SIDE = 4.9 - BALL_RADIUS;
const END = 7.5 - BALL_RADIUS;
const GOAL_LINE = -7.5;
const GOAL_HALF_WIDTH = 1.5 - BALL_RADIUS;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = value => Number.isFinite(value) ? value : 0;

/**
 * update(dt seconds, { x, z, shoot }) accepts pitch-world movement axes.
 * shoot is edge-triggered; shoot() is an immediate one-shot command returning success.
 * setAim(x) selects a persistent goal target in [-1.25, 1.25] at z=-7.75.
 * Movement changes heading; shooting turns heading towards the chosen goal target.
 * State objects retain their identity across reset. kicking is a 0..1 animation weight.
 * phase: playing | shot | goal | saved | miss. State is writable for scene/test setup.
 */
export function createFootballGame() {
  const state = { player: {}, keeper: {}, ball: {}, aimX: 0, goals: 0, shots: 0, phase: 'playing' };
  let accumulator = 0, heldShoot = false, pendingShoot = false;
  let shotAge = 0, resultAge = 0, cooldown = 0;

  function placeBall() {
    const { player, ball } = state;
    Object.assign(ball, {
      x: clamp(player.x + Math.sin(player.heading) * .65, -SIDE, SIDE),
      z: clamp(player.z + Math.cos(player.heading) * .65, -END, END),
      y: BALL_RADIUS, vx: 0, vz: 0,
    });
  }

  function reset() {
    Object.assign(state.player, { x: -.8, z: 3.5, heading: Math.PI, moving: false, kicking: 0 });
    Object.assign(state.keeper, { x: 0, z: -6.65, heading: 0 });
    state.goals = 0;
    state.shots = 0;
    state.aimX = 0;
    state.phase = 'playing';
    accumulator = 0;
    heldShoot = pendingShoot = false;
    shotAge = resultAge = cooldown = 0;
    placeBall();
    return state;
  }

  function setAim(x) {
    state.aimX = clamp(finite(x), -1.25, 1.25);
    return state.aimX;
  }

  function shoot() {
    const { player, ball } = state;
    if (state.phase !== 'playing' || cooldown > 0 || Math.hypot(ball.x - player.x, ball.z - player.z) > 1) return false;
    const dx = setAim(state.aimX) - ball.x, dz = -7.75 - ball.z;
    const distance = Math.hypot(dx, dz);
    ball.vx = dx / distance * 14;
    ball.vz = dz / distance * 14;
    player.heading = Math.atan2(dx, dz);
    player.kicking = 1;
    state.shots++;
    state.phase = 'shot';
    shotAge = resultAge = 0;
    cooldown = .35;
    return true;
  }

  function result(phase) {
    state.phase = phase;
    resultAge = 0;
    if (phase === 'goal') {
      state.goals++;
      state.ball.z = -7.72;
      state.ball.vx = state.ball.vz = 0;
    }
  }

  // Find first contact against the keeper's disk along the entire movement segment.
  function keeperContact(maxTime) {
    const { ball, keeper } = state;
    const dx = ball.x - keeper.x, dz = ball.z - keeper.z;
    const speedSquared = ball.vx ** 2 + ball.vz ** 2;
    const approach = dx * ball.vx + dz * ball.vz;
    if (speedSquared < 1e-12 || approach >= 0) return Infinity;
    const c = dx ** 2 + dz ** 2 - .5 ** 2;
    const discriminant = approach ** 2 - speedSquared * c;
    if (discriminant < 0) return Infinity;
    const contact = c <= 0 ? 0 : (-approach - Math.sqrt(discriminant)) / speedSquared;
    return contact >= 0 && contact <= maxTime ? contact : Infinity;
  }

  function moveBall(dt) {
    const { ball } = state;
    let remaining = dt;
    // Reflect at each contacted wall before using the rest of this substep.
    for (let contactCount = 0; remaining > 1e-10 && contactCount < 24; contactCount++) {
      let time = remaining, contact = '';
      function consider(candidate, type) {
        if (candidate >= -1e-10 && candidate <= time) {
          time = Math.max(0, candidate);
          contact = type;
        }
      }
      if (ball.vx > 0) consider((SIDE - ball.x) / ball.vx, 'side');
      if (ball.vx < 0) consider((-SIDE - ball.x) / ball.vx, 'side');
      if (ball.vz > 0) consider((END - ball.z) / ball.vz, 'end');
      if (ball.vz < 0) {
        const goalTime = (GOAL_LINE - ball.z) / ball.vz;
        const crossingX = ball.x + ball.vx * goalTime;
        if (ball.z > GOAL_LINE && Math.abs(crossingX) < GOAL_HALF_WIDTH) consider(goalTime, 'goal');
        else consider((-END - ball.z) / ball.vz, 'end');
      }
      if (state.phase === 'shot') consider(keeperContact(time), 'keeper');
      ball.x += ball.vx * time;
      ball.z += ball.vz * time;
      remaining -= time;
      if (!contact) break;
      if (contact === 'goal') {
        result('goal');
        return;
      }
      if (contact === 'keeper') {
        ball.vx *= .45;
        ball.vz = Math.abs(ball.vz) * .45 + 1;
        result('saved');
        return;
      }
      if (contact === 'side') ball.vx *= -.68;
      else ball.vz *= -.68;
    }
    ball.x = clamp(ball.x, -SIDE, SIDE);
    // The open goal mouth extends past the pitch wall to the scoring plane.
    ball.z = clamp(ball.z, Math.abs(ball.x) < GOAL_HALF_WIDTH ? GOAL_LINE : -END, END);
    const drag = Math.exp(-.28 * dt);
    ball.vx *= drag;
    ball.vz *= drag;
  }

  function step(dt, x, z) {
    const { player, keeper, ball } = state;
    cooldown = Math.max(0, cooldown - dt);
    player.kicking = Math.max(0, player.kicking - dt / .28);
    player.moving = Math.hypot(x, z) > .001;
    if (player.moving) {
      player.heading = Math.atan2(x, z);
      player.x = clamp(player.x + x * 3.8 * dt, -4.55, 4.55);
      player.z = clamp(player.z + z * 3.8 * dt, -7.1, 7.1);
    }
    // Guard the center between shots; allow aimed corners to beat a late reaction.
    const reacting = state.phase === 'shot' && shotAge >= .18;
    const keeperTarget = reacting ? clamp(ball.x, -.9, .9) : 0;
    const keeperSpeed = state.phase === 'shot' ? (reacting ? .75 : 0) : .45;
    keeper.x += clamp(keeperTarget - keeper.x, -keeperSpeed * dt, keeperSpeed * dt);
    // Separate bodies before dribbling/shooting, retaining the player's intended aim.
    const bodyDistance = .5;
    let dx = player.x - keeper.x, dz = player.z - keeper.z;
    const distance = Math.hypot(dx, dz);
    if (distance < bodyDistance) {
      if (distance > 1e-8) {
        dx /= distance;
        dz /= distance;
      } else {
        const movement = Math.hypot(x, z);
        dx = movement > .001 ? -x / movement : -Math.sin(player.heading);
        dz = movement > .001 ? -z / movement : -Math.cos(player.heading);
      }
      player.x = clamp(keeper.x + dx * bodyDistance, -4.55, 4.55);
      player.z = clamp(keeper.z + dz * bodyDistance, -7.1, 7.1);
      // Behind the keeper, the end wall can trim the normal displacement.
      // Restore separation along the wall instead of pushing outside the pitch.
      const gapZ = player.z - keeper.z;
      if (Math.hypot(player.x - keeper.x, gapZ) < bodyDistance - 1e-8) {
        player.x = clamp(keeper.x + (dx < 0 ? -1 : 1) * Math.sqrt(Math.max(0, bodyDistance ** 2 - gapZ ** 2)), -4.55, 4.55);
      }
    }
    if (pendingShoot) {
      pendingShoot = false;
      shoot();
    }
    if (state.phase === 'playing') {
      if (Math.hypot(ball.x - player.x, ball.z - player.z) < 1) placeBall();
      else moveBall(dt);
    } else if (state.phase === 'shot') {
      shotAge += dt;
      moveBall(dt);
      if (state.phase === 'shot' && shotAge >= 1.8) result('miss');
    } else {
      resultAge += dt;
      const delay = state.phase === 'goal' ? 1.1 : .65;
      if (resultAge >= delay) {
        state.phase = 'playing';
        shotAge = resultAge = 0;
        placeBall();
      }
    }
  }

  function update(dt, input = {}) {
    if (!Number.isFinite(dt) || dt <= 0) return state;
    let x = finite(input?.x), z = finite(input?.z);
    const length = Math.hypot(x, z);
    if (length > 1) { x /= length; z /= length; }
    const pressed = !!input?.shoot;
    if (pressed && !heldShoot) pendingShoot = true;
    heldShoot = pressed;
    // Tab switches cannot jump the simulation several seconds ahead.
    accumulator += Math.min(dt, .25);
    while (accumulator + 1e-10 >= STEP) {
      step(STEP, x, z);
      accumulator = Math.max(0, accumulator - STEP);
    }
    return state;
  }

  reset();
  return { state, reset, update, shoot, setAim };
}
