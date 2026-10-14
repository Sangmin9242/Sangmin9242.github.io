import test from 'node:test';
import assert from 'node:assert/strict';

let createDogBehaviour;
try { ({ createDogBehaviour } = await import('../dog-behaviour.js')); }
catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }

test('dog exposes a deterministic behaviour controller', () => {
  assert.equal(typeof createDogBehaviour, 'function', 'createDogBehaviour implementation is missing');
});

const near = (actual, expected, epsilon = 1e-7) => assert.ok(Math.abs(actual - expected) < epsilon, `${actual} should be near ${expected}`);
function advance(dog, seconds, fps = 60) {
  for (let frame = 0; frame < Math.round(seconds * fps); frame++) dog.update(1 / fps);
}

if (createDogBehaviour) {
  test('autonomy visits sitting, resting, walking and running inside the clear forecourt', () => {
    const dog = createDogBehaviour(), poses = new Set();
    for (let frame = 0; frame < 90 * 100; frame++) {
      const before = { ...dog.state };
      dog.update(.01);
      const { x, z, heading, pose } = dog.state;
      poses.add(pose);
      assert.ok(x >= -14.001 && x <= -6.999, `unsafe x ${x}`);
      assert.ok(z >= 8.499 && z <= 15.001, `unsafe z ${z}`);
      const dx = x - before.x, dz = z - before.z, distance = Math.hypot(dx, dz);
      assert.ok(distance <= .018001, 'dog must not jump or exceed 1.8 metres per second');
      if (distance > 1e-6 && dog.state.moving) assert.ok((dx * Math.sin(heading) + dz * Math.cos(heading)) / distance > .65, 'local +Z faces movement');
    }
    for (const pose of ['sit', 'lie', 'walk', 'run']) assert.ok(poses.has(pose), `missing ${pose}`);
  });

  test('the same elapsed time produces the same journey at different frame rates', () => {
    const slow = createDogBehaviour(), fast = createDogBehaviour();
    advance(slow, 48, 30); advance(fast, 48, 120);
    near(slow.state.x, fast.state.x); near(slow.state.z, fast.state.z);
    near(slow.state.time, fast.state.time);
    assert.equal(slow.state.action, fast.state.action);
    assert.equal(slow.state.pose, fast.state.pose);
  });

  test('petting interrupts movement immediately and gives a short heart response', () => {
    const dog = createDogBehaviour(); advance(dog, 19);
    assert.ok(dog.state.moving);
    const { x, z, affection, hearts } = dog.state;
    assert.equal(dog.interact('pet'), true);
    assert.equal(dog.state.action, 'pet'); assert.equal(dog.state.pose, 'wag');
    assert.equal(dog.state.hearts, hearts + 1); assert.ok(dog.state.affection > affection);
    assert.ok(dog.state.effectTime > 0);
    advance(dog, 2.5); near(dog.state.x, x); near(dog.state.z, z);
    assert.equal(dog.state.moving, false);
    advance(dog, 1); assert.notEqual(dog.state.action, 'pet');
  });

  test('treats stop roaming, play eating and reject repeated rewards during cooldown', () => {
    const dog = createDogBehaviour(); advance(dog, 19);
    const { x, z } = dog.state;
    assert.equal(dog.interact('treat'), true);
    assert.equal(dog.state.pose, 'eat'); assert.equal(dog.state.treats, 1);
    const affection = dog.state.affection;
    assert.equal(dog.interact('treat'), false);
    assert.equal(dog.state.affection, affection); assert.equal(dog.state.treats, 1);
    advance(dog, 2.5); near(dog.state.x, x); near(dog.state.z, z);
    advance(dog, 5.6);
    assert.equal(dog.interact('treat'), true); assert.equal(dog.state.treats, 2);
  });

  test('calling returns along the clear route smoothly and sits at home', () => {
    for (const departureTime of [19, 32]) {
      const dog = createDogBehaviour(); advance(dog, departureTime);
      const before = { ...dog.state };
      assert.equal(dog.interact('call'), true);
      near(dog.state.x, before.x); near(dog.state.z, before.z);
      let arrived = false;
      for (let frame = 0; frame < 60 * 30; frame++) {
        const { x, z } = dog.state; dog.update(1 / 60);
        assert.ok(Math.hypot(dog.state.x - x, dog.state.z - z) <= 1.8 / 60 + 1e-7);
        assert.ok(dog.state.z >= 8.499 && dog.state.z <= 15.001);
        // Between the office entrance and z10.5, only the front-left path is used.
        if (dog.state.z < 10.499) near(dog.state.x, -10.5);
        if (Math.hypot(dog.state.x + 10.5, dog.state.z - 8.5) < 1e-7) { arrived = true; break; }
      }
      assert.ok(arrived); assert.equal(dog.state.pose, 'sit'); assert.equal(dog.state.moving, false);
    }
  });

  test('pause freezes timers and rewards, then resumes without catching up', () => {
    const dog = createDogBehaviour(); advance(dog, 19); dog.setPaused(true);
    const before = { ...dog.state };
    advance(dog, 30); assert.deepEqual(dog.state, before);
    assert.equal(dog.interact('treat'), false); assert.equal(dog.interact('call'), false);
    dog.setPaused(false); dog.update(1 / 60);
    assert.ok(Math.hypot(dog.state.x - before.x, dog.state.z - before.z) < .031);
  });

  test('reduced motion stays seated but still acknowledges petting and treats', () => {
    const dog = createDogBehaviour({ reducedMotion: true }); advance(dog, 120);
    near(dog.state.x, -10.5); near(dog.state.z, 8.5); assert.equal(dog.state.pose, 'sit');
    dog.interact('pet'); assert.equal(dog.state.hearts, 1); advance(dog, 4);
    dog.interact('treat'); assert.equal(dog.state.pose, 'eat'); advance(dog, 4);
    dog.interact('call'); advance(dog, 30);
    near(dog.state.x, -10.5); near(dog.state.z, 8.5); assert.equal(dog.state.pose, 'sit');
  });

  test('invalid time and interactions leave finite state intact; long frames are bounded', () => {
    const dog = createDogBehaviour(); const initial = { ...dog.state };
    for (const dt of [NaN, Infinity, -1, 0, undefined, '1']) dog.update(dt);
    assert.deepEqual(dog.state, initial); assert.equal(dog.interact('unknown'), false);
    advance(dog, 19); const before = { ...dog.state }; dog.update(3600);
    assert.ok(dog.state.time - before.time <= .250001);
    assert.ok(Math.hypot(dog.state.x - before.x, dog.state.z - before.z) <= .450001);
  });

  test('reset restores session counters and keeps the state reference stable', () => {
    const dog = createDogBehaviour(), state = dog.state;
    dog.interact('pet'); advance(dog, 4); dog.interact('treat'); dog.setPaused(true); dog.reset();
    assert.equal(dog.state, state); near(state.x, -10.5); near(state.z, 8.5);
    assert.equal(state.affection, 50); assert.equal(state.hearts, 0); assert.equal(state.treats, 0);
    assert.equal(state.pose, 'sit'); advance(dog, 19); assert.ok(state.moving);
  });

  test('focus sits at the current route position and resumes the interrupted walk on blur', () => {
    const dog = createDogBehaviour(), uninterrupted = createDogBehaviour();
    assert.equal(typeof dog.setFocused, 'function', 'focus control is missing');
    advance(dog, 19); advance(uninterrupted, 19);
    const { x, z } = dog.state; dog.setFocused(true);
    assert.equal(dog.state.pose, 'sit'); assert.equal(dog.state.moving, false);
    advance(dog, 20); near(dog.state.x, x); near(dog.state.z, z);
    dog.setFocused(false); assert.equal(dog.state.pose, 'walk');
    advance(dog, 2); advance(uninterrupted, 2);
    near(dog.state.x, uninterrupted.state.x); near(dog.state.z, uninterrupted.state.z);
  });

  test('focused reactions expire and cooldowns advance while the dog stays in place', () => {
    const dog = createDogBehaviour();
    assert.equal(typeof dog.setFocused, 'function', 'focus control is missing');
    advance(dog, 19); const { x, z } = dog.state; dog.setFocused(true);
    assert.equal(dog.interact('pet'), true); assert.equal(dog.state.pose, 'wag');
    advance(dog, 4); assert.equal(dog.state.pose, 'sit'); near(dog.state.effectTime, 0);
    assert.equal(dog.interact('treat'), true); assert.equal(dog.state.pose, 'eat');
    advance(dog, 4); assert.equal(dog.state.pose, 'sit'); assert.equal(dog.interact('treat'), false);
    advance(dog, 4.1); assert.equal(dog.interact('treat'), true); assert.equal(dog.state.treats, 2);
    near(dog.state.x, x); near(dog.state.z, z);
    dog.setFocused(false); assert.equal(dog.state.pose, 'eat');
    advance(dog, 3.1); assert.equal(dog.state.pose, 'walk'); assert.ok(dog.state.moving);
  });

  test('calling while focused follows the route home then stays seated until blur', () => {
    const dog = createDogBehaviour();
    assert.equal(typeof dog.setFocused, 'function', 'focus control is missing');
    advance(dog, 32); dog.setFocused(true); const { x, z } = dog.state;
    assert.equal(dog.interact('call'), true); near(dog.state.x, x); near(dog.state.z, z);
    assert.equal(dog.state.action, 'call'); advance(dog, 30);
    near(dog.state.x, -10.5); near(dog.state.z, 8.5); assert.equal(dog.state.pose, 'sit');
    assert.equal(dog.state.focused, true); advance(dog, 30);
    near(dog.state.x, -10.5); near(dog.state.z, 8.5);
    dog.setFocused(false); advance(dog, 19); assert.ok(dog.state.moving);
  });

  test('focus respects full pause, reduced motion and reset', () => {
    const dog = createDogBehaviour({ reducedMotion: true });
    assert.equal(typeof dog.setFocused, 'function', 'focus control is missing');
    dog.setFocused(true); dog.interact('treat'); dog.setPaused(true);
    const snapshot = { ...dog.state }; advance(dog, 20); assert.deepEqual(dog.state, snapshot);
    assert.equal(dog.interact('pet'), false); dog.setPaused(false); advance(dog, 4);
    dog.setFocused(false); advance(dog, 40);
    near(dog.state.x, -10.5); near(dog.state.z, 8.5); assert.equal(dog.state.pose, 'sit');
    dog.setFocused(true); dog.reset(); assert.equal(dog.state.focused, false);
  });
}
