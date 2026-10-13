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

Serve this folder over HTTP, for example `python -m http.server 8765`, then open `http://localhost:8765/`. Select Interactive to enter the 3D site. Drag left/right or up/down to orbit; use the mouse wheel, two-finger pinch, or +/− buttons to zoom. The researcher links to the full CV in the selected language. Research office zooms into the clickable record objects. The airplane starts avatar boarding and runway departure, then opens a globe with clickable conference/year/city labels and related publications. Skip boarding & flight or Escape bypasses the sequence. The route arcs are illustrative links from Seoul, not recorded flight itineraries.

ES modules and CV loading require HTTP. WebGL rendering is optional; the research buttons and full CV remain available without it.
