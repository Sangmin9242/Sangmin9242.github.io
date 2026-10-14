import test from 'node:test';
import assert from 'node:assert/strict';

const module = await import('../bowling-game.js').catch(() => null);
test('the pure bowling simulation exports a playable factory', () => {
  assert.equal(typeof module?.createBowlingGame, 'function');
});
const gameTest = module ? test : test.skip;
const fresh = () => module.createBowlingGame();
const gutter = { aim: 1, power: .7, spin: 0 };

function finishDelivery(game, shot, fps = 60) {
  assert.equal(game.launch(shot), true);
  for (let tick = 0; tick < fps * 20 && !['result', 'finished'].includes(game.phase); tick++) game.update(1 / fps);
  assert.ok(['result', 'finished'].includes(game.phase), `delivery did not settle: ${game.phase}`);
  return game.count;
}
function reachTenth(game) {
  for (let roll = 0; roll < 18; roll++) {
    assert.equal(finishDelivery(game, gutter), 0);
    assert.equal(game.nextRoll(), true);
  }
  assert.equal(game.frame, 10);
}
// A controlled physical fixture: selected pins sit in the ball path, others
// are far beyond any possible contact. Counts still come from real collisions.
function lineUp(game, count = 10) {
  game.pins.forEach((pin, index) => {
    if (pin.standing) {
      pin.x = index < count ? 0 : 3;
      pin.z = -9.8 - index * .12;
    }
  });
}

gameTest('a centered ball rolls before actual contacts topple and count pins once', () => {
  const game = fresh();
  assert.equal(game.launch({ aim: 0, power: .8, spin: 0 }), true);
  game.update(.3);
  assert.ok(game.ball.z < 8);
  assert.equal(game.pins.filter(pin => pin.fallen).length, 0);
  assert.equal(game.rolls.length, 0);
  let animatedFall = false;
  for (let i = 0; i < 1200 && game.phase !== 'result'; i++) {
    game.update(1 / 60);
    animatedFall ||= game.pins.some(pin => pin.fall > 0 && pin.fall < 1);
  }
  assert.equal(game.phase, 'result');
  assert.ok(animatedFall);
  assert.ok(game.count >= 5 && game.count <= 10);
  assert.equal(game.count, game.pins.filter(pin => pin.fallen).length);
  assert.deepEqual(game.rolls, [game.count]);
  game.update(5);
  assert.equal(game.rolls.length, 1);
});

gameTest('off aim enters a gutter and knocks no pins', () => {
  const game = fresh();
  assert.equal(finishDelivery(game, gutter), 0);
  assert.equal(game.ball.gutter, true);
  assert.equal(game.standing.length, 10);
  assert.equal(game.result.frames[0].marks[0], '-');
});

gameTest('second delivery keeps untouched pins and sweeps only fallen pins', () => {
  const game = fresh();
  const first = finishDelivery(game, { aim: .19, power: .65, spin: 0 });
  assert.ok(first > 0 && first < 10, `expected a partial rack, got ${first}`);
  const survivors = game.pins.filter(pin => pin.standing).map(pin => ({ id: pin.id, x: pin.x, z: pin.z }));
  assert.equal(game.nextRoll(), true);
  assert.equal(game.frame, 1);
  assert.equal(game.delivery, 2);
  assert.equal(game.standing.length, 10 - first);
  for (const survivor of survivors) {
    const pin = game.pins[survivor.id];
    assert.equal(pin.visible, true);
    assert.equal(pin.fall, 0);
    assert.equal(pin.x, survivor.x);
    assert.equal(pin.z, survivor.z);
  }
  assert.equal(game.pins.filter(pin => pin.visible).length, 10 - first);
  assert.equal(finishDelivery(game, gutter), 0);
  assert.equal(game.nextRoll(), true);
  assert.equal(game.frame, 2);
  assert.equal(game.delivery, 1);
  assert.equal(game.standing.length, 10);
  assert.ok(game.pins.every(pin => pin.visible && pin.fall === 0));
});

gameTest('physics and pin counts agree at 30 and 60 frames per second', () => {
  const slow = fresh(), fast = fresh();
  const shot = { aim: -.1, power: .72, spin: .12 };
  assert.equal(finishDelivery(slow, shot, 30), finishDelivery(fast, shot, 60));
  assert.deepEqual(slow.standing, fast.standing);
  for (let i = 0; i < 10; i++) {
    assert.ok(Math.abs(slow.pins[i].x - fast.pins[i].x) < .001);
    assert.ok(Math.abs(slow.pins[i].z - fast.pins[i].z) < .001);
  }
});

gameTest('ten open frames finish with no bonus delivery', () => {
  const game = fresh();
  reachTenth(game);
  finishDelivery(game, gutter);
  game.nextRoll();
  finishDelivery(game, gutter);
  assert.equal(game.phase, 'finished');
  assert.equal(game.result.complete, true);
  assert.equal(game.rolls.length, 20);
  assert.equal(game.result.total, 0);
  assert.equal(game.nextRoll(), false);
  assert.equal(game.launch(gutter), false);
});

gameTest('tenth frame spare resets a full rack for exactly one bonus ball', () => {
  const game = fresh();
  reachTenth(game);
  finishDelivery(game, gutter);
  game.nextRoll();
  lineUp(game);
  assert.equal(finishDelivery(game, { aim: 0, power: 1 }), 10);
  assert.equal(game.result.complete, false);
  game.nextRoll();
  assert.equal(game.standing.length, 10);
  assert.equal(game.delivery, 3);
  finishDelivery(game, gutter);
  assert.equal(game.result.total, 10);
  assert.equal(game.phase, 'finished');
  assert.deepEqual(game.result.frames[9].marks, ['-', '/', '-']);
});

gameTest('tenth strike resets after a strike and keeps a partial bonus rack', () => {
  const game = fresh();
  reachTenth(game);
  lineUp(game);
  assert.equal(finishDelivery(game, { aim: 0, power: 1 }), 10);
  game.nextRoll();
  assert.equal(game.standing.length, 10);
  lineUp(game, 5);
  assert.equal(finishDelivery(game, { aim: 0, power: 1 }), 5);
  game.nextRoll();
  assert.equal(game.standing.length, 5);
  assert.equal(game.delivery, 3);
  finishDelivery(game, gutter);
  assert.equal(game.result.total, 15);
  assert.equal(game.phase, 'finished');
  assert.deepEqual(game.result.frames[9].rolls, [10, 5, 0]);
});

gameTest('reset cancels a delivery and clears the whole game', () => {
  const game = fresh();
  finishDelivery(game, gutter);
  game.nextRoll();
  game.launch({ aim: 0, power: .8 });
  game.update(.5);
  game.reset();
  assert.equal(game.phase, 'ready');
  assert.deepEqual(game.rolls, []);
  assert.equal(game.result.total, 0);
  assert.equal(game.frame, 1);
  assert.equal(game.delivery, 1);
  assert.equal(game.standing.length, 10);
  assert.equal(game.ball.z, 8);
  assert.equal(game.ball.rolling, false);
});

gameTest('a spare counts only newly fallen pins and waits for its bonus score', () => {
  const game = fresh();
  lineUp(game, 5);
  assert.equal(finishDelivery(game, { aim: 0, power: 1 }), 5);
  game.nextRoll();
  game.pins.filter(pin => pin.standing).forEach((pin, index) => {
    pin.x = 0;
    pin.z = -9.8 - index * .2;
  });
  assert.equal(finishDelivery(game, { aim: 0, power: 1 }), 5);
  assert.deepEqual(game.rolls, [5, 5]);
  assert.equal(game.result.frames[0].score, null);
  assert.deepEqual(game.result.frames[0].marks, ['5', '/']);
  game.nextRoll();
  assert.equal(game.frame, 2);
  lineUp(game, 5);
  finishDelivery(game, { aim: 0, power: 1 });
  assert.equal(game.result.frames[0].score, 15);
  assert.equal(game.result.frames[0].cumulative, 15);
});

gameTest('a perfect contact-driven game ends after twelve strikes with 300', () => {
  const game = fresh();
  for (let roll = 0; roll < 12; roll++) {
    lineUp(game);
    assert.equal(finishDelivery(game, { aim: 0, power: 1 }), 10);
    if (roll < 11) {
      assert.equal(game.phase, 'result');
      assert.equal(game.nextRoll(), true);
      assert.equal(game.standing.length, 10);
    }
  }
  assert.equal(game.phase, 'finished');
  assert.equal(game.result.total, 300);
  assert.equal(game.result.frames[0].score, 30);
  assert.deepEqual(game.result.frames[9].rolls, [10, 10, 10]);
  assert.equal(game.nextRoll(), false);
});

gameTest('invalid input is rejected without corrupting simulation state', () => {
  const game = fresh();
  for (const shot of [{ aim: NaN }, { power: Infinity }, { spin: 'x' }, null]) assert.throws(() => game.launch(shot), TypeError);
  for (const dt of [NaN, Infinity, -.1, '1']) assert.throws(() => game.update(dt), RangeError);
  assert.equal(game.phase, 'ready');
  assert.equal(game.nextRoll(), false);
  assert.equal(game.launch({ aim: 50, power: 50, spin: -50 }), true);
  assert.equal(game.launch(gutter), false);
  game.update(0);
  assert.ok(Number.isFinite(game.ball.vx) && Number.isFinite(game.ball.vz));
});
