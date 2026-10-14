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

  test('shoot travels along current heading and repeated calls cannot restart it', () => {
    const game = createFootballGame();
    game.update(1 / 60, { x: 1, z: 0 });
    const before = game.state.ball.x;
    assert.equal(game.shoot(), true);
    assert.equal(game.shoot(), false);
    advance(game, .15);
    assert.ok(game.state.ball.x > before + 1);
    near(game.state.ball.vz, 0);
    assert.equal(game.state.shots, 1);
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
