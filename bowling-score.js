// Ten-pin scoring: https://bowl.com/welcome/keeping-score-7c992ab8f438aa57fac9f9aef753ae44
// Fictional demonstration games, not records of either person's real results.
export const demoPlans = {
  sangmin: [7,2, 6,2, 8,2, 7,1, 10, 5,3, 8,1, 6,3, 7,2, 8,1],
  partner: [10, 10, 10, 9,1, 10, 10, 8,2, 10, 9,1, 10,10,10],
};

const pinMark = pins => pins === 10 ? 'X' : pins === 0 ? '-' : String(pins);

function parseGame(rolls) {
  if (!Array.isArray(rolls)) throw new TypeError('Rolls must be an array of pin counts.');
  let cursor = 0;
  const frames = [];
  function take(frame, maximum) {
    const pins = rolls[cursor];
    if (!Number.isInteger(pins) || pins < 0 || pins > maximum) {
      throw new RangeError(`Invalid pin count at roll ${cursor + 1}.`);
    }
    frame.rolls.push(pins);
    cursor++;
    return pins;
  }
  for (let number = 1; number <= 10; number++) {
    const frame = { start: cursor, rolls: [], closed: false };
    frames.push(frame);
    if (cursor >= rolls.length) continue;
    const first = take(frame, 10);
    if (number < 10 && first === 10) {
      frame.closed = true;
      continue;
    }
    if (cursor >= rolls.length) continue;
    const second = take(frame, first === 10 ? 10 : 10 - first);
    if (number < 10 || (first !== 10 && first + second < 10)) {
      frame.closed = true;
      continue;
    }
    if (cursor >= rolls.length) continue;
    take(frame, first === 10 && second < 10 ? 10 - second : 10);
    frame.closed = true;
  }
  if (cursor < rolls.length) throw new RangeError('The game already has ten completed frames.');
  return frames;
}

function frameMarks(rolls, tenth) {
  return rolls.map((pins, ball) => {
    const spare = ball === 1 && rolls[0] < 10 && rolls[0] + pins === 10;
    const fillSpare = tenth && ball === 2 && rolls[0] === 10 && rolls[1] < 10 && rolls[1] + pins === 10;
    return spare || fillSpare ? '/' : pinMark(pins);
  });
}

/** Score any legal partial game. Pending scores and cumulative totals are null. */
export function scoreBowling(rolls) {
  const parsed = parseGame(rolls);
  let total = 0;
  let cumulativeReady = true;
  const frames = parsed.map((frame, index) => {
    const values = frame.rolls;
    let score = null;
    if (frame.closed) {
      if (index === 9) {
        score = values.reduce((sum, pins) => sum + pins, 0);
      } else if (values[0] === 10) {
        if (rolls.length >= frame.start + 3) score = 10 + rolls[frame.start + 1] + rolls[frame.start + 2];
      } else if (values[0] + values[1] === 10) {
        if (rolls.length >= frame.start + 3) score = 10 + rolls[frame.start + 2];
      } else {
        score = values[0] + values[1];
      }
    }
    if (score === null) cumulativeReady = false;
    else total += score;
    return {
      rolls: [...values],
      marks: frameMarks(values, index === 9),
      score,
      cumulative: cumulativeReady ? total : null,
    };
  });
  return { frames, total, complete: parsed[9].closed };
}

const fullRack = () => Array.from({ length: 10 }, (_, index) => index);
// Front pins fall first, leaving a recognisable back-row spare attempt.
const fallOrder = [0, 1, 2, 4, 3, 5, 7, 8, 6, 9];
const hitsFrom = (standing, count) => fallOrder.filter(pin => standing.includes(pin)).slice(0, count);
const leaveAfter = (standing, count) => {
  const hit = hitsFrom(standing, count);
  return standing.filter(pin => !hit.includes(pin));
};

/** Layout before a delivery: frame/ball are 1-based, pin indices are 0-based. */
export function rollLayout(plan, index) {
  const frames = parseGame(plan);
  if (!Number.isInteger(index) || index < 0 || index >= plan.length) {
    throw new RangeError('The delivery index must refer to an existing roll.');
  }
  const frameIndex = frames.findIndex(frame => index >= frame.start && index < frame.start + frame.rolls.length);
  const frame = frames[frameIndex];
  const ballIndex = index - frame.start;
  let standing = fullRack();
  if (ballIndex === 1 && frame.rolls[0] !== 10) {
    standing = leaveAfter(standing, frame.rolls[0]);
  } else if (ballIndex === 2 && frame.rolls[0] === 10 && frame.rolls[1] !== 10) {
    standing = leaveAfter(standing, frame.rolls[1]);
  }
  const pins = plan[index];
  return { frame: frameIndex + 1, ball: ballIndex + 1, standing, hit: hitsFrom(standing, pins), pins };
}
