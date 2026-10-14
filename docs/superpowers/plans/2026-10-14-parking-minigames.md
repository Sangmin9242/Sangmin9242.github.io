# Parking and playable sports implementation plan

## Goal

Add the five requested parked cars and turn the existing football/bowling scenes into optional playable games while keeping the research site prominent.

## Architecture and scope

- Procedural cars occupy the outer row of the existing paved forecourt; no tall structure is added.
- Pure simulation modules own football movement/ball/goal state and bowling collisions/frame state.
- `hobby-world.js` renders simulation state and pauses scripted motion only while playing.
- `sports-play.js` owns keyboard, touch, drag input and bilingual controls. `experience.js` owns camera and raycast entry.
- Game entry is by selecting a sport then clicking Sangmin's avatar; an equivalent button provides keyboard access. Exiting, changing sections, blur and resize must not leave stale input.
- Football: arrows, D shoot, touch direction pad and shoot. Bowling: upward drag/swing direction and speed, with aim/power sliders and a throw button as an alternative. No motion hardware is required.
- Pin results are derived from collision simulation. Existing ten-pin scoring determines frames and bonuses. Demo partner remains on her own lane.

## Tasks and gates

1. Car geometry: five identifiable silhouettes, exact plate suffixes 9095/2380/4043/1513/XXXX, separated spaces; inspect world bounds and default desktop/mobile view.
2. Football simulation: first write tests for movement, shot, goals/blocks, boundaries, repeated input, reset and frame-rate independence; observe absence failure, then implement.
3. Bowling simulation: first write tests for impact, cascade, gutter, persistent survivors, legal frame reset, scoring, reset and frame-rate independence; observe absence failure, then implement.
4. Integration: add avatar entry, accessible entry, isolated input, touch cancel/blur, fixed game cameras and bilingual UI. Use browser tests to verify the original scene lacks play entry before changes.
5. Verify real Chrome at desktop/laptop/mobile widths; shoot and throw, observe physical results and scores, next roll/restart, language and exit, then verify existing archive/journey navigation and lighting.
6. Review implementation; fix concrete findings, commit and push authorized GitHub Pages update, verify deployed files and public browser behavior.

## Constraints

NAS originals and all CV records remain untouched. No sensor permissions or extra physics bundle. Avoid cars obscuring the office/building in the default view. Explicit user interaction works even with reduced motion; unsolicited demo motion respects it. Do not claim zero possible bugs; report the tested behavior and actual deployment result.
