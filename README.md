# Sangmin Lee — Research & CV

Bilingual research homepage with an interactive 3D construction site, built for GitHub Pages.

## Website

https://sangmin9242.github.io/

- `index.html`: interactive homepage; switch languages in place.
- `experience.js`: site scene, interactions, and localized research descriptions.
- `experience.css`: responsive presentation.
- `scene-materials.js`: physical surface maps, reflective environment, and monitor screen.
- `assets/materials/`: locally hosted CC0 PBR textures; source credits in `CREDITS.txt`.
- `cv.html` / `cv-ko.html`: full English and Korean CVs; also the content sources for homepage panels.
- `ko.html`: compatibility redirect to the Korean homepage.
- `vendor/three.module.js`: Three.js 0.160.1 (MIT); license stored alongside it.

## Update the CV

Update both `cv.html` and `cv-ko.html`. The homepage reads their publication, project, patent, software, award, and profile sections, so each language has one source for the complete CV. If adding topic-specific publications, update the research selectors in `experience.js`.

Link paper titles to verified DOIs. Do not display DOI strings or internal editorial notes on the site. Keep applicant/granted status accurate in section headings. Do not publish home addresses, phone numbers, or birth dates.

The supplied NAS PDF remains read only. The 3D construction scene is an original illustration used to navigate the research areas.

## Preview

Serve this folder over HTTP, for example `python -m http.server 8765`, then open `http://localhost:8765/`. The researcher at the field-office computer links directly to the full CV in the selected language.

ES modules and CV loading require HTTP. WebGL rendering is optional; the research buttons and full CV remain available without it.
