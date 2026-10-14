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

- `hobby-world.js`: a practice football pitch and open bowling room beside the research site, with one sportswear avatar sharing the researcher's face. The avatar alternates between dribbling/shooting, walking around the room to its open entrance, and bowling with a rolling ball and falling pins. Selecting an activity focuses the camera on that facility while the avatar walks there. Reduced motion shows a static pose.
- Bilingual Football/Bowling buttons and object picking focus the camera without replacing the CV or conference data. The main building remains the starting view. Sports lights switch with the site's night lighting.
