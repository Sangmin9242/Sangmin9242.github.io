import test from 'node:test';
import assert from 'node:assert/strict';

let createFootballGame;
try {
  ({ createFootballGame } = await import('../football-game.js'));
} catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
}

test('football module exposes a playable game', () => {
  assert.equal(typeof createFootballGame, 'function', 'createFootballGame implementation is missing');
});

const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should be near ${expected}`);
function advance(game, seconds, input = {}, fps = 60) {
  for (let i = 0; i < Math.round(seconds * fps); i++) game.update(1 / fps, input);
}
function moveBall(game, x, z, vx, vz) {
  Object.assign(game.state.ball, { x, z, y: .18, vx, vz });
  game.state.phase = 'shot';
}

if (createFootballGame) {
  test('world movement faces the requested direction with local forward +Z', () => {
    const game = createFootballGame();
    game.update(1 / 60, { x: 1, z: 0 });
    assert.ok(game.state.player.x > -.8);
    near(game.state.player.z, 3.5);
    near(game.state.player.heading, Math.PI / 2);
    game.update(1 / 60, { x: 0, z: -1 });
    near(Math.abs(game.state.player.heading), Math.PI);
    assert.ok(game.state.player.z < 3.5);
    assert.ok(game.state.player.moving);
    game.update(1 / 60, {});
    assert.equal(game.state.player.moving, false);
  });

  test('diagonal movement has the same speed as axis movement', () => {
    const axis = createFootballGame(), diagonal = createFootballGame();
    advance(axis, .5, { x: 1, z: 0 });
    advance(diagonal, .5, { x: 1, z: -1 });
    near(axis.state.player.x + .8, Math.hypot(diagonal.state.player.x + .8, diagonal.state.player.z - 3.5));
  });

  test('nearby ball dribbles ahead of the moving player', () => {
    const game = createFootballGame();
    advance(game, .5, { x: 1, z: 0 });
    assert.ok(game.state.ball.x > game.state.player.x);
    assert.ok(Math.hypot(game.state.ball.x - game.state.player.x, game.state.ball.z - game.state.player.z) < .9);
  });

  test('shoot faces the goal independently of movement heading and cannot restart', () => {
    const game = createFootballGame();
    game.update(1 / 60, { x: 1, z: 0 });
    const before = game.state.ball.z;
    assert.equal(game.shoot(), true);
    assert.ok(game.state.player.heading > Math.PI / 2, 'shot should face the goal after walking sideways');
    assert.equal(game.shoot(), false);
    advance(game, .15);
    assert.ok(game.state.ball.z < before - 1);
    assert.ok(game.state.ball.vz < 0);
    assert.equal(game.state.shots, 1);
  });

  test('goal aim persists while movement continues to control player heading', () => {
    const game = createFootballGame();
    assert.equal(typeof game.setAim, 'function', 'independent aim API is missing');
    game.setAim(1.1);
    advance(game, .5, { x: -1 });
    near(game.state.aimX, 1.1);
    near(game.state.player.heading, -Math.PI / 2);
  });

  test('left, center and right aim launch through the goal mouth towards the chosen target', () => {
    for (const target of [-1.25, 0, 1.25]) {
      const game = createFootballGame();
      assert.equal(typeof game.setAim, 'function', 'independent aim API is missing');
      game.setAim(target);
      const { x, z } = game.state.ball;
      game.shoot();
      const { vx, vz } = game.state.ball;
      assert.ok(vz < 0);
      near(x + vx * (-7.75 - z) / vz, target);
      const goalX = x + vx * (-7.5 - z) / vz;
      assert.ok(Math.abs(goalX) < 1.32, 'aimed trajectory must enter between the posts');
      near(Math.hypot(vx, vz), 14);
      near(game.state.player.heading, Math.atan2(vx, vz));
      if (target < -1) assert.ok(vx < 0);
      if (target > 1) assert.ok(vx > 0);
    }
  });

  test('both aimed corners are scoreable from the starting position without a side juke', () => {
    for (const target of [-1.25, 1.25]) {
      const game = createFootballGame();
      assert.equal(typeof game.setAim, 'function', 'independent aim API is missing');
      game.setAim(target);
      game.shoot();
      advance(game, 1);
      assert.equal(game.state.goals, 1, `corner ${target} should beat the keeper`);
      assert.equal(game.state.phase, 'goal');
      near(game.state.player.x, -.8);
    }
  });

  test('a starting center shot is still saved by the keeper', () => {
    const game = createFootballGame();
    assert.equal(typeof game.setAim, 'function', 'independent aim API is missing');
    game.setAim(0);
    game.shoot();
    advance(game, 1);
    assert.equal(game.state.goals, 0);
    assert.equal(game.state.phase, 'saved');
  });

  test('keeper guards the center slowly and reacts to a shot after a short delay', () => {
    const game = createFootballGame();
    game.state.keeper.x = .9;
    advance(game, .5);
    assert.ok(game.state.keeper.x > .5 && game.state.keeper.x < .9);
    game.reset();
    game.shoot();
    advance(game, .1);
    near(game.state.keeper.x, 0);
    advance(game, .2);
    assert.ok(game.state.keeper.x < 0 && game.state.keeper.x > -.15);
  });

  test('aim clamps to the goal corners and invalid values and reset select the center', () => {
    const game = createFootballGame();
    assert.equal(typeof game.setAim, 'function', 'independent aim API is missing');
    near(game.state.aimX, 0);
    game.setAim(20);
    near(game.state.aimX, 1.25);
    game.setAim(-20);
    near(game.state.aimX, -1.25);
    for (const invalid of [NaN, Infinity, undefined, 'right']) {
      game.setAim(invalid);
      near(game.state.aimX, 0);
    }
    game.setAim(1);
    game.reset();
    near(game.state.aimX, 0);
  });

  test('holding shoot does not fire another shot after the ball returns', () => {
    const game = createFootballGame();
    advance(game, 4, { shoot: true });
    assert.equal(game.state.shots, 1);
    assert.ok(Math.hypot(game.state.ball.x - game.state.player.x, game.state.ball.z - game.state.player.z) < .9);
    game.update(1 / 60, { shoot: false });
    game.update(1 / 60, { shoot: true });
    assert.equal(game.state.shots, 2);
  });

  test('only crossing the goal mouth towards the back scores once', () => {
    const game = createFootballGame();
    moveBall(game, 1.15, -7.4, 0, -20);
    game.update(1 / 60, {});
    assert.equal(game.state.goals, 1);
    assert.equal(game.state.phase, 'goal');
    advance(game, .5);
    assert.equal(game.state.goals, 1);
    advance(game, 1);
    assert.equal(game.state.phase, 'playing');
    assert.ok(Math.hypot(game.state.ball.x - game.state.player.x, game.state.ball.z - game.state.player.z) < .9);
  });

  test('goal line crossing outside the posts bounces without scoring', () => {
    const game = createFootballGame();
    moveBall(game, 2.2, -7.2, 0, -30);
    game.update(.1, {});
    assert.equal(game.state.goals, 0);
    assert.ok(game.state.ball.z >= -7.5);
    assert.ok(game.state.ball.vz > 0);
  });

  test('a slower ball can traverse the goal-mouth channel and cross the goal line', () => {
    const game = createFootballGame();
    moveBall(game, 1.15, -7.2, 0, -5);
    advance(game, .2);
    assert.equal(game.state.goals, 1);
    assert.equal(game.state.phase, 'goal');
  });

  test('ball already behind the line does not create a goal', () => {
    const game = createFootballGame();
    moveBall(game, 1.1, -7.6, 0, -5);
    game.update(1 / 60, {});
    assert.equal(game.state.goals, 0);
  });

  test('keeper blocks a fast shot that would otherwise pass through the goal', () => {
    const game = createFootballGame();
    moveBall(game, 0, -5.8, 0, -100);
    game.update(.1, {});
    assert.equal(game.state.goals, 0);
    assert.equal(game.state.phase, 'saved');
    assert.ok(game.state.ball.vz >= 0);
    advance(game, 1);
    assert.equal(game.state.phase, 'playing');
  });

  test('walking into the keeper stops the player in front without changing aim', () => {
    const game = createFootballGame();
    Object.assign(game.state.player, { x: 0, z: -5.8, heading: Math.PI });
    Object.assign(game.state.ball, { x: 0, z: -6.45 });
    advance(game, 1, { z: -1 });
    assert.ok(game.state.player.z >= game.state.keeper.z + .5 - 1e-8, 'player walked through the keeper body');
    near(game.state.player.x, 0);
    near(Math.abs(game.state.player.heading), Math.PI);
    const stopped = game.state.player.z;
    game.update(1 / 60, { z: 1 });
    assert.ok(game.state.player.z > stopped, 'walking away must remain possible');
    near(game.state.player.heading, 0);
    assert.ok(Math.hypot(game.state.ball.x - game.state.player.x, game.state.ball.z - game.state.player.z) < .9);
  });

  test('keeper body separates sideways overlap along the contact normal', () => {
    const game = createFootballGame();
    Object.assign(game.state.player, { x: -.52, z: -6.65 });
    Object.assign(game.state.ball, { x: 0, z: -6.65 });
    game.update(1 / 120, { x: 1 });
    near(game.state.player.x, -.5);
    near(game.state.player.z, -6.65);
    near(game.state.player.heading, Math.PI / 2);
  });

  test('exact keeper overlap falls back opposite the movement direction', () => {
    const game = createFootballGame();
    Object.assign(game.state.player, { x: 0, z: -6.65 + 3.8 / 120 });
    Object.assign(game.state.ball, { x: 0, z: -6.65 });
    game.update(1 / 120, { z: -1 });
    near(game.state.player.x, 0);
    near(game.state.player.z, -6.15);
    assert.ok(Number.isFinite(game.state.player.z));
  });

  test('keeper body separation near the end wall respects player bounds', () => {
    const game = createFootballGame();
    Object.assign(game.state.player, { x: 0, z: -7.1 });
    Object.assign(game.state.ball, { x: 0, z: -7.32 });
    game.update(1 / 120, {});
    assert.ok(game.state.player.z >= -7.1);
    assert.ok(Math.hypot(game.state.player.x - game.state.keeper.x, game.state.player.z - game.state.keeper.z) >= .5 - 1e-8);
  });

  test('player and fast ball remain inside the pitch after large elapsed time', () => {
    const game = createFootballGame();
    advance(game, 6, { x: 1, z: 1 });
    assert.ok(game.state.player.x <= 4.9 && game.state.player.z <= 7.5);
    moveBall(game, 4, 3, 5000, 3000);
    game.update(10, {});
    assert.ok(Math.abs(game.state.ball.x) <= 4.9);
    assert.ok(Math.abs(game.state.ball.z) <= 7.5);
  });

  test('movement and shots are consistent at 30, 60 and 120 frames per second', () => {
    const games = [30, 60, 120].map(fps => {
      const game = createFootballGame();
      assert.equal(typeof game.setAim, 'function', 'independent aim API is missing');
      game.setAim(1.25);
      advance(game, .5, { x: .6, z: -.8 }, fps);
      game.shoot();
      advance(game, .4, {}, fps);
      return game;
    });
    for (const game of games.slice(1)) {
      for (const item of ['player', 'keeper', 'ball']) {
        near(game.state[item].x, games[0].state[item].x);
        near(game.state[item].z, games[0].state[item].z);
      }
      assert.equal(game.state.phase, games[0].state.phase);
    }
  });

  test('invalid elapsed time and movement values do not poison state', () => {
    const game = createFootballGame();
    for (const dt of [NaN, Infinity, -10, undefined, 0]) game.update(dt, { x: NaN, z: Infinity });
    game.update(1 / 60, { x: NaN, z: Infinity });
    game.update(1 / 60, null);
    for (const item of ['player', 'keeper', 'ball']) {
      assert.ok(Number.isFinite(game.state[item].x));
      assert.ok(Number.isFinite(game.state[item].z));
    }
    near(game.state.player.x, -.8);
    near(game.state.player.z, 3.5);
  });

  test('reset clears score, motion, held button and pending substeps', () => {
    const game = createFootballGame();
    game.update(.003, { x: 1, shoot: true });
    advance(game, .1, { shoot: true });
    game.state.goals = 4;
    const state = game.state;
    game.reset();
    assert.equal(game.state, state, 'renderers can keep the public state reference');
    assert.equal(game.state.goals, 0);
    assert.equal(game.state.shots, 0);
    near(game.state.player.x, -.8);
    near(game.state.player.z, 3.5);
    near(game.state.player.heading, Math.PI);
    assert.equal(game.state.player.kicking, 0);
    assert.equal(game.state.ball.vx, 0);
    assert.equal(game.state.ball.vz, 0);
    game.update(1 / 60, { shoot: true });
    assert.equal(game.state.shots, 1);
  });
}
