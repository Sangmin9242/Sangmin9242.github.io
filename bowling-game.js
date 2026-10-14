import { scoreBowling } from './bowling-score.js';

const STEP = 1 / 240;
const FOUL = 8;
const HEAD = -10.29;
const HALF_LANE = .525;
const BALL_RADIUS = .15;
const BALL_MASS = 6.8;
const PIN_MASS = 1.5;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function rack() {
  const pins = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col <= row; col++) {
      pins.push({ id: pins.length, x: (col - row / 2) * .3048, z: HEAD - row * .3048,
        vx: 0, vz: 0, fallen: false, fall: 0, angle: 0, visible: true, standing: true });
    }
  }
  return pins;
}

/**
 * Deterministic, contact-driven bowling in lane-local metres. Live ball/pin
 * objects are renderer state; pin.angle is the horizontal falling direction
 * (atan2(x, z)), and pin.fall interpolates from upright (0) to flat (1).
 * Call nextRoll after showing a result. The remaining rack is kept for spares.
 */
export function createBowlingGame() {
  const game = { ball: {}, pins: [], rolls: [], phase: 'ready', result: scoreBowling([]), count: 0 };
  let accumulator = 0;
  let flightTime = 0;
  let settleTime = 0;
  let spin = 0;
  let beforeRoll = new Set();

  Object.defineProperties(game, {
    standing: { get: () => game.pins.filter(pin => pin.standing).map(pin => pin.id) },
    frame: { get: () => frameProgress().frame },
    delivery: { get: () => frameProgress().delivery },
  });

  function frameProgress() {
    const frames = game.result.frames;
    for (let index = 0; index < 9; index++) {
      const rolls = frames[index].rolls;
      if (rolls.length === 0 || (rolls.length === 1 && rolls[0] !== 10)) {
        return { frame: index + 1, delivery: rolls.length + 1 };
      }
    }
    return { frame: 10, delivery: Math.min(3, frames[9].rolls.length + 1) };
  }

  function resetBall() {
    Object.assign(game.ball, { x: 0, z: FOUL, y: BALL_RADIUS, vx: 0, vz: 0, rolling: false, gutter: false });
    accumulator = flightTime = settleTime = spin = 0;
  }

  game.reset = () => {
    game.pins = rack();
    game.rolls = [];
    game.result = scoreBowling([]);
    game.count = 0;
    game.phase = 'ready';
    beforeRoll.clear();
    resetBall();
    return game;
  };

  game.launch = (shot = {}) => {
    if (shot === null || typeof shot !== 'object') throw new TypeError('A delivery must provide numeric aim, power and spin.');
    const { aim = 0, power = .7, spin: curve = 0 } = shot;
    if (![aim, power, curve].every(value => typeof value === 'number' && Number.isFinite(value))) {
      throw new TypeError('Aim, power and spin must be finite numbers.');
    }
    if (game.phase !== 'ready') return false;
    const speed = 7 + clamp(power, 0, 1) * 8;
    game.ball.vx = clamp(aim, -1, 1) * speed * .06;
    game.ball.vz = -speed;
    game.ball.rolling = true;
    spin = clamp(curve, -1, 1);
    beforeRoll = new Set(game.standing);
    game.phase = 'rolling';
    return true;
  };

  function topple(pin) {
    const speed = Math.hypot(pin.vx, pin.vz);
    if (pin.standing && speed > .38) {
      pin.standing = false;
      pin.fallen = true;
      pin.angle = Math.atan2(pin.vx, pin.vz);
    }
  }

  // Disc contact conserves momentum along the contact normal with a modest
  // restitution. Fallen pins expand their contact footprint as they tip over.
  function contact(a, b, radiusA, radiusB, massA, massB) {
    const dx = b.x - a.x, dz = b.z - a.z;
    const distance = Math.hypot(dx, dz);
    const reach = radiusA + radiusB;
    if (distance >= reach) return;
    const nx = distance > 1e-7 ? dx / distance : 0;
    const nz = distance > 1e-7 ? dz / distance : -1;
    const closing = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
    if (closing > 0) {
      const impulse = 1.35 * closing / (1 / massA + 1 / massB);
      a.vx -= impulse * nx / massA;
      a.vz -= impulse * nz / massA;
      b.vx += impulse * nx / massB;
      b.vz += impulse * nz / massB;
      if (a !== game.ball) topple(a);
      topple(b);
    }
    // Separate only bodies already moving/falling: intact pins retain their
    // original places unless a real contact supplies momentum.
    const overlap = reach - distance;
    if (a === game.ball || a.fallen) {
      a.x -= nx * overlap * massB / (massA + massB);
      a.z -= nz * overlap * massB / (massA + massB);
    }
    if (b.fallen) {
      b.x += nx * overlap * massA / (massA + massB);
      b.z += nz * overlap * massA / (massA + massB);
    }
  }

  function endDelivery() {
    game.count = game.pins.filter(pin => beforeRoll.has(pin.id) && pin.fallen).length;
    game.rolls.push(game.count);
    game.result = scoreBowling(game.rolls);
    game.phase = game.result.complete ? 'finished' : 'result';
    game.ball.rolling = false;
    game.ball.vx = game.ball.vz = 0;
    game.pins.forEach(pin => { pin.vx = pin.vz = 0; });
    accumulator = 0;
  }

  function step() {
    const ball = game.ball;
    if (ball.rolling) {
      flightTime += STEP;
      if (!ball.gutter) ball.vx += spin * .11 * STEP;
      ball.x += ball.vx * STEP;
      ball.z += ball.vz * STEP;
      ball.vz *= Math.exp(-.025 * STEP);
      if (!ball.gutter && Math.abs(ball.x) > HALF_LANE && ball.z > HEAD - 1.1) {
        ball.gutter = true;
        ball.x = Math.sign(ball.x) * .68;
        ball.vx = 0;
        ball.y = .045;
      }
      if (ball.z < -12.4 || flightTime > 8 || Math.abs(ball.vz) < .1) {
        ball.rolling = false;
        game.phase = 'settling';
      }
    }

    const active = game.pins.filter(pin => pin.visible);
    for (const pin of active) {
      if (pin.fallen) {
        pin.fall = Math.min(1, pin.fall + STEP * 2.4);
        pin.x += pin.vx * STEP;
        pin.z += pin.vz * STEP;
        const friction = Math.exp(-3.6 * STEP);
        pin.vx *= friction;
        pin.vz *= friction;
      }
      if (ball.rolling && !ball.gutter) contact(ball, pin, BALL_RADIUS, .06 + pin.fall * .12, BALL_MASS, PIN_MASS);
    }
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i], b = active[j];
        if (a.fallen || b.fallen) contact(a, b, .06 + a.fall * .12, .06 + b.fall * .12, PIN_MASS, PIN_MASS);
      }
    }
    if (!ball.rolling) {
      settleTime += STEP;
      const atRest = active.every(pin => (!pin.fallen || pin.fall === 1) && Math.hypot(pin.vx, pin.vz) < .035);
      if ((settleTime >= .8 && atRest) || settleTime > 5) endDelivery();
    }
  }

  game.update = dt => {
    if (typeof dt !== 'number' || !Number.isFinite(dt) || dt < 0) throw new RangeError('Delta time must be a finite nonnegative number.');
    if (game.phase !== 'rolling' && game.phase !== 'settling') return;
    // A suspended browser tab does not fast-forward an entire game on resume.
    accumulator += Math.min(dt, .25);
    while (accumulator + 1e-10 >= STEP && ['rolling', 'settling'].includes(game.phase)) {
      accumulator -= STEP;
      step();
    }
  };

  game.nextRoll = () => {
    if (game.phase !== 'result') return false;
    const progress = frameProgress();
    const tenth = game.result.frames[9].rolls;
    const newRack = progress.delivery === 1 || game.standing.length === 0 ||
      (progress.frame === 10 && progress.delivery === 3 && tenth[0] < 10 && tenth[0] + tenth[1] === 10);
    if (newRack) game.pins = rack();
    else game.pins.forEach(pin => { if (pin.fallen) pin.visible = false; });
    resetBall();
    game.phase = 'ready';
    return true;
  };

  return game.reset();
}
