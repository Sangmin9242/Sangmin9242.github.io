# Sangmin Lee — Research & CV

Bilingual research homepage with an interactive 3D construction site, built for GitHub Pages.

## Website

https://sangmin9242.github.io/

- `index.html` / `ko.html`: full English and Korean CV homepage, with an Interactive button.
- `interactive.html`: interactive construction site and conference globe; switch languages in place.
- `experience.js`: site scene, interactions, and localized research descriptions.
- `experience.css`: responsive presentation.
- `scene-materials.js`: physical surface maps, reflective environment, and monitor screen.
- `assets/materials/`: locally hosted CC0 PBR textures; source credits in `CREDITS.txt`.
- `cv.html` / `cv-ko.html`: compatibility redirects to the CV homepage.
- `spray-robot.js`: CAD model loading, articulated arm motion and spray particles.
- `assets/robot/fireproofing-robot.glb`: optimized mesh derived from the supplied TESTBED_assy.stp. Original source is unchanged; internal electronics, fasteners and the separate test structure are omitted. Joint motion is an illustrative animation, not a controller simulation.
- `airplane.js` / `conference-journey.js`: the road airplane, globe, city selection, flight arcs and conference records.
- `celestial-sky.js`: 3D Sun and Moon placed by current Seoul azimuth and altitude. The Moon is shaded by the Sun direction and only displayed above the actual horizon, including daytime when applicable. Both belong to the world scene, obey camera rotation and object occlusion, and are hidden in the conference globe. Twelve street lamps illuminate the building surroundings and KTX platform; four shielded work lights illuminate the building facade. They switch at fetched sunrise/sunset along with 91 flush runway fixtures (edges, centreline, thresholds and ends). Scene north is -Z and east is +X.
- `seoul-environment.js`: Seoul calendar and ticking KST clock; current Open-Meteo model weather (fixed Seoul coordinates, no geolocation), rain/snow/cloud effects and astronomical solar-position lighting (sunrise, midday, afternoon, sunset and twilight). The Seoul sun direction and elevation are calculated with vendored SunCalc 1.9.0 (BSD-2-Clause), independently of weather fetch availability. Today/tomorrow sunrise and sunset are fetched via Open-Meteo daily data and cached separately; offline fallback uses calculated SunCalc events. Refresh every 10 minutes, cache up to 30 minutes, and show unavailable on failures. Data attribution is shown in the scene. Weather effects are illustrative and do not represent measurements at the actual laboratory.
- `research-office.js`: clickable bookshelf, award certificate, patent drawing cabinet and software laptop, linked to the CV records.
- `record-viewer.js` / `record-viewer.css`: paginated publication book, award certificates, patent folders and software registration screen, using the English/Korean CV as their data source.
- `fireproofing-coat.js`: rough gray-white coating accumulated at spray impact positions on the red H-section; pause and reset controls are in the robotics panel. The coating is an illustrative visual, not material-performance or thickness data.
- `boarding-avatar.js` / `boarding-sequence.js`: avatar walking, boarding steps, entrance door and return reset. Aircraft landing gear folds with bay-door movement after climbing; reduced motion skips the sequence.
- `assets/conferences/`: landmark photographs and Natural Earth map data, with credits.
- `vendor/three.module.js`: Three.js 0.160.1 (MIT); license stored alongside it.

## Update the CV

Update both `index.html` and `ko.html`. The interactive site reads their publication, project, patent, software, award, and profile sections, so each language has one source for the complete CV. If adding topic-specific publications, update the research selectors in `experience.js`. Update conference metadata in `conference-journey.js`; conference authorship alone does not establish physical attendance.

Link paper titles to verified DOIs. Do not display DOI strings or internal editorial notes on the site. Keep applicant/granted status accurate in section headings. Do not publish home addresses, phone numbers, or birth dates.

The supplied NAS PDF remains read only. The 3D construction scene is an original illustration used to navigate the research areas.

## Preview

Serve this folder over HTTP, for example `python -m http.server 8765`, then open `http://localhost:8765/`. Select Interactive to enter the 3D site. Drag left/right or up/down to orbit; right-drag (or middle-drag) to pan the view. On mobile, one finger rotates and two-finger dragging pans while pinching zooms. Use the mouse wheel or +/− buttons to zoom. The researcher links to the full CV in the selected language. Research office zooms into the clickable record objects. The airplane starts avatar boarding and runway departure, then opens a globe with clickable conference/year/city labels and related publications. Skip boarding & flight or Escape bypasses the sequence. The route arcs are illustrative links from Seoul, not recorded flight itineraries.

ES modules and CV loading require HTTP. WebGL rendering is optional; the research buttons and full CV remain available without it.

- `construction-workers.js`: two construction workers with safety vests, yellow helmets and dual-lens helmet-mounted 360 cameras. They walk along bounded paths on open floors; reduced-motion users see stationary workers.

Responsive layout: laptops/tablets/phones at widths up to 1100px use separate flowing content, model viewport and wrapping navigation controls. Wide views place labels away from reserved UI and other labels. Conference labels use the same collision-avoidance approach. Archives scroll within the viewport.

## Domestic conference journey

- `ktx-train.js` and `train-boarding.js`: KTX-inspired three-car train, suitcase pickup, platform boarding through sliding doors, door closure and departure. Aircraft and runway sit beside the rail platform; each journey restores its vehicle and shared luggage on return.
- `domestic-events.js` and `domestic-journey.js`: all seven domestic conference papers from the CV, grouped into six events in Seoul, Gyeongju, Gunsan and Seogwipo. English and Korean paper entries are loaded from the matching CV. Official event pages are linked in each card.
- `assets/conferences/korea-50m.geojson`: South Korea geometry extracted from [Natural Earth 1:50m admin-0 countries](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson), public domain. Includes Jeju and coastal islands.
- Map paths are illustrative connections, not actual travel itineraries or operational KTX service routes. The Jeju selection stops the train on the mainland and animates a ferry from Mokpo to Jeju.

## Personal sports corner

- `sports-facilities.js`: fenced training pitch, net goals, benches, and a two-lane bowling room with wood-board surfaces, 18.29m foul-line-to-headpin length, curved gutters, approach guides, pinsetter/sweep, ball return, seats and score monitor. Dimensions reference [Brunswick planning guidance](https://brunswickbowling.nyc3.cdn.digitaloceanspaces.com/production/document-library/Planning-Guides/Residential-PG-for-PDF.pdf).
- The football center stays at (19, -1). Bowling moves outward to (25.95, 13), placing its research-side end exactly along the football base edge at X=13.45. Entry paths follow the shifted doorway. Its roof stays closed in the main view and opens when Bowling is selected; background sports lights are dimmer.
- `sports-avatar.js`: the researcher shares the existing face; football has two male players in jerseys, shorts, socks and cleats, while bowling has the researcher and a female player with a short bob and soft facial features in polos, trousers and bowling shoes.
- `hobby-world.js`: the user avatar walks through open entrances and alternates between playing with the goalkeeper and bowling alongside the female player. The lane ball follows the hand before release, rolls to the pins, and triggers corresponding pinfall. Returning mid-game preserves score and pose; completed lanes retain final leaves.
- `bowling-score.js`: partial ten-pin frames, strike/spare bonuses and tenth-frame fills follow [USBC scoring](https://bowl.com/welcome/keeping-score-7c992ab8f438aa57fac9f9aef753ae44). The illustrative friendly game finishes at Sangmin 104 and Player 2 237; these are animated game results, not personal records. The physical score screen and bilingual HTML table use the same score data.
- Football/Bowling buttons and native object picking focus the selected space. Research remains the starting view. Reduced motion shows static poses and completed demonstration scores.

## Foreground lighting and motion refinement

A flat tiled forecourt occupies X=-17..11 and Z=11..25, with two lamps on the sides and four low path lights. Two floodlights outside the runway edges illuminate its surface, supplementing brighter inset fixtures. These lights switch with the same Seoul sunrise/sunset state. Football actors face their actual running direction; stationary poses turn toward the ball.


## Parking and mini games

- `parking-cars.js`: five low procedural vehicle models along the outer forecourt row: Accent (2012) 9095, Mercedes GLC 2380, Grandeur IG 4043, Model Y 1513, Malibu (2015) XXXX. Front/rear plates match. Spaces do not overlap and the office/building remain open in the starting view; orbit or pan to inspect the fleet.
- Select Football or Bowling, then click Sangmin's avatar or **Play as Sangmin**. Football uses arrow keys to move; hold D and use left/right arrows to aim at the marked goal target, then release D to shoot (Up centres the aim). Holding the touch Shoot button while using the direction pad provides equivalent controls. Movement and aim are independent. The keeper guards the goal and player/keeper bodies cannot overlap.
- Bowling uses a backward/downward pull on the visible ball button or lane. Horizontal pull changes the opposite launch direction; distance controls power, independent of swipe speed. A dashed guide previews the full direction and a solid blue segment previews strength; instructions and a percentage update while pulling. Sliders and Bowl offer an alternative. Actual contact and transferred momentum determine fallen pins, surviving pins remain for the second ball, and Next ball prepares the legal rack. Strike/spare/tenth-frame scoring uses `bowling-score.js`. The adjacent player continues her demonstration game independently.
- `football-game.js` and `bowling-game.js` contain fixed-step planar simulations with animated pin toppling, without an additional physics bundle. They are a browser mini game, not a calibrated simulator.
- `sports-play.js` isolates gesture/key input from camera orbit, clears held controls on blur/visibility/exit and updates bilingual controls only on changes. Stop playing (or Escape) restores observation; a second Escape closes the sports view. Explicitly started play works with reduced motion while unsolicited motion remains paused.
- Simulation tests: `node --test tests/*.test.mjs`. Browser verification covers avatar picking, desktop/laptop/mobile, keyboard and touch movement, mouse/touch/cancelled bowling swipes, scores, restart/exit, language switching, and the existing journey/lighting flow.

The Research office entrance is a prominent amber button on desktop and mobile. The car fleet uses pearl white paint with curved body surfaces, wheel openings and brand-specific badges; the models are authored visual approximations rather than manufacturer CAD.
