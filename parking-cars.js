import * as THREE from './vendor/three.module.js';

// Original parametric models of the RB Accent, X253 GLC, pre-facelift IG,
// original Model Y and eighth-generation Malibu. +Z is forward. Metres.
// Reference photographs are used for proportions only; no external assets load.
const VEHICLES = [
  { id: 'accent-2012', model: 'Hyundai Accent 2012', plate: '9095', x: -14, length: 4.38, width: 1.72, height: 1.45, wheelbase: 2.57, radius: .296, kind: 'accent', brand: 'hyundai', rearBadge: 'ACCENT', belt: .89,
    body: [[-1,.85,.93],[-.86,.98,.94],[-.57,1,.95],[-.24,.99,.94],[.22,.99,.94],[.56,1,.94],[.84,.96,.93],[1,.83,.92]],
    roof: [[-1.43,1.00,.68],[-1.06,1.23,.64],[-.64,1.42,.60],[-.18,1.45,.59],[.29,1.43,.59],[.54,1.37,.62],[.88,1.15,.66],[1.12,.96,.72]], frontGlass: [.46,1.08], rearGlass: [-1.40,-.69], sideWindows: [[-1.10,-.09],[.005,1.055]] },
  { id: 'glc', model: 'Mercedes-Benz GLC', plate: '2380', x: -9, length: 4.66, width: 1.89, height: 1.66, wheelbase: 2.87, radius: .353, kind: 'glc', brand: 'mercedes', rearBadge: 'GLC', belt: 1.055,
    body: [[-1,.87,1.10],[-.88,.98,1.10],[-.58,1,1.10],[-.20,.99,1.085],[.27,.99,1.085],[.63,1,1.10],[.86,.97,1.08],[1,.84,1.065]],
    roof: [[-1.94,1.09,.78],[-1.69,1.42,.71],[-1.32,1.61,.68],[-.84,1.65,.66],[-.24,1.66,.65],[.34,1.63,.66],[.64,1.50,.69],[1.05,1.23,.75],[1.30,1.075,.80]], frontGlass: [.49,1.27], rearGlass: [-1.92,-1.40], sideWindows: [[-1.80,-1.21],[-1.15,-.18],[-.085,1.24]] },
  { id: 'grandeur-ig', model: 'Hyundai Grandeur IG', plate: '4043', x: -4, length: 4.90, width: 1.86, height: 1.47, wheelbase: 2.84, radius: .329, kind: 'grandeur', brand: 'hyundai', rearBadge: 'GRANDEUR', belt: .965,
    body: [[-1,.87,.98],[-.86,.985,1.00],[-.61,1,1.015],[-.22,.985,1.00],[.22,.985,.995],[.60,1,1.015],[.85,.98,1.00],[1,.86,.995]],
    roof: [[-1.54,1.01,.77],[-1.21,1.24,.70],[-.86,1.42,.65],[-.40,1.47,.64],[.14,1.465,.64],[.49,1.405,.66],[.88,1.19,.72],[1.16,1.00,.78]], frontGlass: [.44,1.12], rearGlass: [-1.49,-.84], sideWindows: [[-1.24,-.18],[-.085,1.09]] },
  { id: 'model-y', model: 'Tesla Model Y', plate: '1513', x: 1, length: 4.75, width: 1.92, height: 1.62, wheelbase: 2.89, radius: .352, kind: 'tesla', brand: 'tesla', rearBadge: '', belt: 1.055,
    body: [[-1,.86,1.035],[-.86,.985,1.09],[-.61,1,1.115],[-.18,.99,1.10],[.28,.99,1.085],[.63,1,1.005],[.85,.975,.98],[1,.83,.98]],
    roof: [[-1.95,1.10,.80],[-1.61,1.25,.74],[-1.13,1.48,.68],[-.58,1.60,.65],[-.10,1.62,.64],[.30,1.575,.65],[.65,1.43,.69],[1.04,1.19,.75],[1.28,1.055,.81]], frontGlass: [.36,1.24], rearGlass: [-1.88,-1.06], sideWindows: [[-1.52,-1.035],[-.965,-.18],[-.095,1.215]] },
  { id: 'malibu-2015', model: 'Chevrolet Malibu 2015', plate: 'XXXX', x: 6, length: 4.86, width: 1.86, height: 1.47, wheelbase: 2.74, radius: .329, kind: 'malibu', brand: 'chevrolet', rearBadge: 'MALIBU', belt: .95,
    body: [[-1,.88,.97],[-.86,.99,.98],[-.58,1,.99],[-.20,.985,.985],[.23,.985,.985],[.60,1,.985],[.84,.98,.98],[1,.87,.975]],
    roof: [[-1.51,1.02,.77],[-1.16,1.27,.70],[-.80,1.425,.65],[-.32,1.47,.64],[.17,1.46,.64],[.52,1.40,.67],[.92,1.20,.72],[1.18,.985,.79]], frontGlass: [.46,1.14], rearGlass: [-1.47,-.82], sideWindows: [[-1.20,-.19],[-.09,1.12]] },
];

const paint = new THREE.MeshPhysicalMaterial({ color: 0xf6f6f4, metalness: .12, roughness: .255, clearcoat: 1, clearcoatRoughness: .13, envMapIntensity: .72, emissive: 0x171717, emissiveIntensity: .10 });
const chrome = new THREE.MeshStandardMaterial({ color: 0xd7dcdf, metalness: .92, roughness: .21, envMapIntensity: .85 });
const alloy = new THREE.MeshStandardMaterial({ color: 0xbec5cb, metalness: .83, roughness: .28 });
const darkAlloy = new THREE.MeshStandardMaterial({ color: 0x444d53, metalness: .60, roughness: .30 });
const black = new THREE.MeshStandardMaterial({ color: 0x15191b, roughness: .57 });
const rubber = new THREE.MeshStandardMaterial({ color: 0x202224, roughness: .88 });
const well = new THREE.MeshStandardMaterial({ color: 0x101214, roughness: .93, side: THREE.DoubleSide });
const glass = new THREE.MeshPhysicalMaterial({ color: 0x35454c, metalness: .28, roughness: .105, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.15, side: THREE.DoubleSide });
const windowGlass=glass.clone();windowGlass.transparent=true;windowGlass.opacity=.72;windowGlass.depthWrite=false;
const lens = new THREE.MeshPhysicalMaterial({ color: 0xe3edf1, metalness: .03, roughness: .10, transparent: true, opacity: .28, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
const redLens = new THREE.MeshPhysicalMaterial({ color: 0x962630, roughness: .2, clearcoat: 1, metalness: .14, emissive: 0x4c0610, emissiveIntensity: .25, side: THREE.DoubleSide });
const led = new THREE.MeshStandardMaterial({ color: 0xeaf3fa, emissive: 0xcfe7fa, emissiveIntensity: .36, roughness: .24 });
const redLed = new THREE.MeshStandardMaterial({ color: 0xdf3142, emissive: 0xa41928, emissiveIntensity: .38, roughness: .27 });
const amber = new THREE.MeshStandardMaterial({ color: 0xc58630, roughness: .33 });
const gap = new THREE.LineBasicMaterial({ color: 0x666b6d, transparent: true, opacity: .72 });
const badgeCache = new Map();

function mesh(parent, geometry, material, name = '') {
  const object = new THREE.Mesh(geometry, material); object.name = name;
  object.castShadow = true; object.receiveShadow = true; parent.add(object); return object;
}
function box(parent, size, position, material, name = '') {
  const object = mesh(parent, new THREE.BoxGeometry(...size), material, name); object.position.set(...position); return object;
}
function rod(parent, a, b, radius, material, radial = 6) {
  const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b);
  const object = mesh(parent, new THREE.CylinderGeometry(radius, radius, from.distanceTo(to), radial), material);
  object.position.copy(from).add(to).multiplyScalar(.5);
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.sub(from).normalize()); return object;
}
function curve(parent, points, radius, material, closed = false) {
  return mesh(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), closed, 'centripetal'), Math.max(8,Math.min(points.length>100?48:24,points.length*2)), radius, 3, closed), material);
}
function seam(parent, points) {
  const object = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p))), gap); parent.add(object); return object;
}

// Cubic Hermite interpolation stays inside each interval while removing hard
// joins. Dense surface samples resolve longitudinal and transverse curvature.
function profile(points, z) {
  let i = 0;
  while (i < points.length - 2 && z > points[i + 1][0]) i++;
  const p = points[i], q = points[i + 1], previous = points[Math.max(0, i - 1)], next = points[Math.min(points.length - 1, i + 2)];
  const t = THREE.MathUtils.clamp((z - p[0]) / (q[0] - p[0]), 0, 1), d = q[0] - p[0], t2 = t * t, t3 = t2 * t;
  return p.slice(1).map((value, channel) => {
    const c = channel + 1;
    const slopeA = (q[c] - previous[c]) / (q[0] - previous[0]);
    const slopeB = (next[c] - p[c]) / (next[0] - p[0]);
    const result = (2 * t3 - 3 * t2 + 1) * value + (t3 - 2 * t2 + t) * d * slopeA + (-2 * t3 + 3 * t2) * q[c] + (t3 - t2) * d * slopeB;
    return THREE.MathUtils.clamp(result, Math.min(value, q[c]), Math.max(value, q[c]));
  });
}
function surface(parent, uSteps, vSteps, point, material, name, reverse = false, exclude = null) {
  const vertices = [], indices = [], uv = [];
  for (let u = 0; u <= uSteps; u++) for (let v = 0; v <= vSteps; v++) {
    vertices.push(...point(u / uSteps, v / vSteps)); uv.push(v / vSteps, u / uSteps);
  }
  for (let u = 0; u < uSteps; u++) for (let v = 0; v < vSteps; v++) {
    if (exclude?.((u + .5) / uSteps, (v + .5) / vSteps)) continue;
    const a = u * (vSteps + 1) + v, b = a + 1, c = a + vSteps + 1, d = c + 1;
    if (reverse) indices.push(a, c, b, b, c, d); else indices.push(a, b, c, b, d, c);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geometry.setIndex(indices); geometry.computeVertexNormals();
  return mesh(parent, geometry, material, name);
}
function bodyAt(spec, z) {
  const [width, crown] = profile(spec.body, z / (spec.length / 2));
  return { half: width * spec.width / 2, crown, edge: crown - (spec.kind === 'tesla' ? .073 : .085) };
}
function bodyPoint(spec, z, xFraction) {
  const p = bodyAt(spec, z), abs = Math.abs(xFraction), l = spec.length / 2;
  const end = THREE.MathUtils.smoothstep(Math.abs(z), l - .37, l);
  const hoodCrease = z > .9 && z < l - .18 ? .012 * Math.exp(-Math.pow((abs - .54) / .07, 2)) : 0;
  return [xFraction * p.half, p.crown - .065 * abs ** 2 - .02 * abs ** 8 + hoodCrease, z - Math.sign(z) * end * .19 * abs ** 3];
}
function lowerEdge(spec, z) {
  const radius = spec.radius + .035;
  let height = spec.kind === 'glc' || spec.kind === 'tesla' ? .285 : .235;
  for (const axle of [-spec.wheelbase / 2, spec.wheelbase / 2]) {
    const distance = z - axle;
    if (Math.abs(distance) < radius) height = Math.max(height, spec.radius + Math.sqrt(radius * radius - distance * distance));
  }
  return height;
}
function sidePoint(spec, side, z, t, offset = 0) {
  const p = bodyAt(spec, z), bottom = lowerEdge(spec, z), y = THREE.MathUtils.lerp(bottom, p.edge, t);
  const fullness = .018 * Math.sin(Math.PI * t) - .025 * (1 - t) ** 2;
  const end = THREE.MathUtils.smoothstep(Math.abs(z), spec.length / 2 - .37, spec.length / 2);
  return [side * (p.half + fullness + offset), y, z - Math.sign(z) * end * .19];
}
function faceZ(spec, end, x, y, offset = 0) {
  return end * (spec.length / 2 - .19 * (Math.abs(x) / bodyAt(spec, end * spec.length / 2).half) ** 3 - .025 * ((y - .62) / .55) ** 2 + offset);
}

function contour(points) {
  return new THREE.CatmullRomCurve3(points.map(([x, y]) => new THREE.Vector3(x, y, 0)), true, 'centripetal', .3).getPoints(points.length * 6).slice(0, -1).map(p => [p.x, p.y]);
}
function inside(x, y, polygon) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
}
function patch(parent, spec, end, polygon, material, depth = .006, name = '') {
  const shape = new THREE.Shape(polygon.map(p => new THREE.Vector2(...p)));
  const geometry = new THREE.ShapeGeometry(shape, 8), positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) positions.setZ(i, faceZ(spec, end, positions.getX(i), positions.getY(i), depth));
  if (end < 0) { const index = geometry.index; for (let i = 0; i < index.count; i += 3) { const b = index.getX(i + 1); index.setX(i + 1, index.getX(i + 2)); index.setX(i + 2, b); } }
  geometry.computeVertexNormals(); return mesh(parent, geometry, material, name);
}
function patchBorder(parent, spec, end, polygon, radius, material, depth = .015) {
  return curve(parent, polygon.map(([x, y]) => [x, y, faceZ(spec, end, x, y, depth)]), radius, material, true);
}

function openings(spec, end) {
  const w = spec.width / 2;
  if (end < 0) {
    let points = spec.kind === 'glc' ? [[.31,.98],[w*.86,1.015],[w*.93,.92],[w*.82,.80],[.35,.835]]
      : spec.kind === 'tesla' ? [[.36,.925],[w*.90,.95],[w*.89,.815],[.43,.825],[.34,.865]]
        : spec.kind === 'grandeur' ? [[.12,.86],[w*.88,.875],[w*.94,.77],[.24,.785]]
          : spec.kind === 'accent' ? [[.40,.875],[w*.91,.865],[w*.94,.705],[.40,.735]]
            : [[.35,.835],[w*.87,.85],[w*.93,.69],[.37,.685]];
    return { grilles: [], lamps: [contour(points), contour(points.map(([x,y]) => [-x,y]).reverse())] };
  }
  let grilles, points;
  if (spec.kind === 'accent') {
    grilles = [contour([[-.36,.745],[.36,.745],[.29,.665],[-.29,.665]]), contour([[-.40,.625],[.40,.625],[.47,.51],[.36,.365],[-.36,.365],[-.47,.51]])];
    points = [[.40,.78],[w*.82,.865],[w*.97,.82],[w*.91,.695],[.51,.715]];
  } else if (spec.kind === 'glc') {
    grilles = [contour([[-.56,.94],[.56,.94],[.60,.855],[.52,.60],[-.52,.60],[-.60,.855]]), contour([[-.50,.46],[.50,.46],[.46,.335],[-.46,.335]])];
    points = [[.63,.91],[w*.92,.96],[w*.98,.85],[w*.94,.76],[.65,.76]];
  } else if (spec.kind === 'grandeur') {
    grilles = [contour([[-.56,.84],[.56,.84],[.575,.74],[.45,.425],[-.45,.425],[-.575,.74]])];
    points = [[.615,.82],[w*.94,.90],[w*.98,.825],[w*.93,.727],[.66,.72]];
  } else if (spec.kind === 'malibu') {
    grilles = [contour([[-.46,.835],[.46,.835],[.435,.705],[-.435,.705]]), contour([[-.44,.615],[.44,.615],[.51,.53],[.40,.355],[-.40,.355],[-.51,.53]])];
    points = [[.53,.845],[w*.93,.88],[w*.98,.795],[w*.96,.71],[.56,.70]];
  } else {
    grilles = [contour([[-.45,.365],[.45,.365],[.47,.295],[-.47,.295]])];
    points = [[.48,.815],[.70,.88],[w*.96,.91],[w*.99,.835],[.73,.815],[.535,.79]];
  }
  return { grilles, lamps: [contour(points), contour(points.map(([x,y]) => [-x,y]).reverse())] };
}

function body(parent, spec) {
  const l = spec.length / 2;
  const door=parent.userData.doorOpening,first=spec.roof[0][0],last=spec.roof.at(-1)[0];
  const intervals=[-l,first,door.rear,door.front,last,l];
  // A real cabin void replaces the old solid bonnet surface under the roof.
  // Separate intervals put the door perimeter on exact shared vertices.
  for(let i=0;i<intervals.length-1;i++){
    const a=intervals[i],b=intervals[i+1];
    const ranges=i===0||i===intervals.length-2?[[-1,1]]:i===2?[[-1,-.895]]:[[-1,-.895],[.895,1]];
    for(const [left,right]of ranges){
      const top=surface(parent,Math.max(3,Math.ceil((b-a)*14)),Math.max(2,Math.ceil((right-left)*9)),(u,v)=>bodyPoint(spec,THREE.MathUtils.lerp(a,b,u),THREE.MathUtils.lerp(left,right,v)),paint,'body',true);top.userData.bodySurface=true;
    }
  }
  for (const side of [-1,1]) {
    const ranges=side>0?[[-l,door.rear],[door.front,l]]:[[-l,l]];
    for(const [a,b]of ranges){const object=surface(parent,Math.ceil((b-a)*24),5,(u,v)=>sidePoint(spec,side,THREE.MathUtils.lerp(a,b,u),v),paint,'body-side',side<0);object.userData.bodySurface=true;}
    const radius = spec.radius + .035;
    for (const axle of [-spec.wheelbase/2,spec.wheelbase/2]) {
      const liner = surface(parent, 32, 4, (u,v) => { const angle = u * Math.PI, z = axle + Math.cos(angle)*radius; return [side*(bodyAt(spec,z).half - .018 - v*.20),spec.radius + Math.sin(angle)*radius,z]; }, well, 'wheel-well');
      liner.castShadow = false;
      const lip = [];
      for(let i=0;i<=28;i++){const a=i*Math.PI/28,z=axle+Math.cos(a)*radius;lip.push([side*(bodyAt(spec,z).half+.005),spec.radius+Math.sin(a)*radius,z]);}
      curve(parent,lip,spec.kind==='glc'||spec.kind==='tesla'?.016:.012,spec.kind==='glc'||spec.kind==='tesla'?black:paint);
    }
    const sill = [];
    for(let i=0;i<=20;i++){const z=THREE.MathUtils.lerp(-spec.wheelbase/2+.40,spec.wheelbase/2-.40,i/20);sill.push([side*(bodyAt(spec,z).half-.012),spec.kind==='glc'||spec.kind==='tesla'?.29:.25,z]);}
    curve(parent,sill,.028,spec.kind==='glc'||spec.kind==='tesla'?black:paint);
  }
  for (const end of [-1,1]) {
    const opening = openings(spec,end), polygons = [...opening.grilles,...opening.lamps];
    const p = bodyAt(spec,end*l);
    surface(parent,44,14,(u,v)=>{const x=(u*2-1)*p.half, y=THREE.MathUtils.lerp(.265,p.crown-.085*(u*2-1)**2,v);return [x,y,faceZ(spec,end,x,y)];},paint,end>0?'front-bumper':'rear-bumper',end>0,(u,v)=>{const x=(u*2-1)*p.half,y=THREE.MathUtils.lerp(.265,p.crown-.085*(u*2-1)**2,v);return polygons.some(poly=>inside(x,y,poly));});
    for(const grille of opening.grilles){
      patch(parent,spec,end,grille,black,-.027,'recessed-grille'); patchBorder(parent,spec,end,grille,.010,spec.kind==='tesla'?black:chrome,.002);
      const xs=grille.map(p=>p[0]),ys=grille.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
      const thick=spec.kind==='glc'&&maxY>.7?.016:.008;
      const rows=spec.kind==='glc'&&maxY>.7?[.71,.85]:Array.from({length:Math.max(2,Math.floor((maxY-minY)/.053))},(_,i)=>minY+.032+i*.053);
      for(const y of rows){const row=[];for(let x=minX+.015;x<=maxX-.015;x+=.022)if(inside(x,y,grille))row.push([x,y,faceZ(spec,end,x,y,-.009)]);if(row.length>1)curve(parent,row,thick,spec.kind==='tesla'?black:chrome);}
      for(let x=minX+.065;x<maxX-.035;x+=.075){const row=[];for(let y=minY+.02;y<maxY-.02;y+=.02)if(inside(x,y,grille))row.push([x,y,faceZ(spec,end,x,y,-.022)]);if(row.length>1)curve(parent,row,.004,darkAlloy);}
    }
    lamps(parent,spec,end,opening.lamps);
  }
}

function canopyAt(spec,z){const [height,half]=profile(spec.roof,z);return {height:Math.max(height,bodyPoint(spec,z,.895)[1]+.069),half};}
function canopyTop(spec,z,sideFraction,lift=0){const p=canopyAt(spec,z),x=p.half*sideFraction;return [x,p.height-.045*sideFraction**2-.018*sideFraction**8+lift,z+.025*sideFraction**2];}
function canopySide(spec,side,z,t,lift=0){
  const p=canopyAt(spec,z),belt=bodyAt(spec,z),low=bodyPoint(spec,z,.895)[1]+.002,x=THREE.MathUtils.lerp(belt.half*.895,p.half,t)+.025*Math.sin(Math.PI*t);
  return [side*(x+lift),THREE.MathUtils.lerp(low,p.height-.063,t),z+.025*t];
}
function windowMargin(spec,z){const p=canopyAt(spec,z),belt=bodyPoint(spec,z,.895)[1]+.002;return Math.min(.20,.04/Math.max(.07,p.height-.063-belt));}
function canopyPanels(parent,spec,side,a,b,name='cabin-side'){
  const cuts=[a,b];for(const [left,right]of spec.sideWindows)for(const z of[left,right])if(z>a&&z<b)cuts.push(z);cuts.sort((x,y)=>x-y);
  for(let i=0;i<cuts.length-1;i++){
    const left=cuts[i],right=cuts[i+1],middle=(left+right)/2,hasWindow=spec.sideWindows.some(([x,y])=>middle>x&&middle<y);
    for(const strip of hasWindow?[0,1]:[2])surface(parent,Math.max(2,Math.ceil((right-left)*18)),strip===2?5:2,(u,v)=>{const z=THREE.MathUtils.lerp(left,right,u),margin=windowMargin(spec,z),t=strip===0?v*margin:strip===1?1-margin+v*margin:v;return canopySide(spec,side,z,t);},paint,name,side<0);
  }
}
function cabin(parent,spec){
  const first=spec.roof[0][0],last=spec.roof.at(-1)[0];
  const opening=parent.userData.doorOpening,door=parent.userData.driverDoor;
  surface(parent,44,16,(u,v)=>canopyTop(spec,THREE.MathUtils.lerp(first,last,u),v*2-1),paint,'cabin-roof',true);
  for(const side of [-1,1]){
    const ranges=side>0?[[first,opening.rear],[opening.front,last]]:[[first,last]];
    for(const [a,b]of ranges)canopyPanels(parent,spec,side,a,b);
    for(const [a,b] of spec.sideWindows){
      const target=side>0&&a>=opening.rear?door:parent;
      surface(target,16,5,(u,v)=>{const z=THREE.MathUtils.lerp(a,b,u),p=canopyAt(spec,z),belt=bodyPoint(spec,z,.895)[1]+.002,height=Math.max(.07,p.height-.063-belt),margin=Math.min(.20,.04/height);return canopySide(spec,side,z,THREE.MathUtils.lerp(margin,1-margin,v),.004);},windowGlass,'side-window',side<0);
      const upper=[],lower=[];for(let i=0;i<=22;i++){const z=THREE.MathUtils.lerp(a,b,i/22),p=canopyAt(spec,z),belt=bodyPoint(spec,z,.895)[1]+.002,height=Math.max(.07,p.height-.063-belt),margin=Math.min(.20,.04/height);upper.push(canopySide(spec,side,z,1-margin,.007));lower.push(canopySide(spec,side,z,margin,.007));}
      curve(target,[...upper,...lower.reverse()],.008,spec.kind==='tesla'?black:chrome,true);
    }
    const bPillar=spec.kind==='accent'?-.04:-.135;
    surface(parent,4,6,(u,v)=>canopySide(spec,side,bPillar+(u-.5)*.076,v,.007),black,'b-pillar',side<0);
    // Door seams are projected onto the curved panel, stopping at the sill.
    for(const door of [bPillar,spec.kind==='glc'?-1.20:-1.00,spec.roof.at(-1)[0]-.13]){
      const points=[];for(let i=0;i<=12;i++){const t=i/12,z=door+.035*Math.sin(t*Math.PI);const p=bodyAt(spec,z),y=THREE.MathUtils.lerp(Math.max(.285,lowerEdge(spec,z)+.035),p.edge,t);points.push([side*(p.half+.008),y,z]);}seam(side>0&&door>opening.rear&&door<opening.front?parent.userData.driverDoor:parent,points);
    }
    for(const z of [-.68,.57]){
      const target=side>0&&z>opening.rear&&z<opening.front?door:parent;
      const p=bodyAt(spec,z),y=p.edge-.075,x=side*(p.half+.015);
      const handle=mesh(target,new THREE.SphereGeometry(1,12,6),spec.kind==='tesla'?darkAlloy:chrome,'door-handle');handle.position.set(x,y,z);handle.scale.set(.020,.020,.102);
      if(spec.kind!=='tesla')box(target,[.024,.024,.035],[x,y,z+.105],paint);
    }
    const mirrorZ=spec.kind==='glc'?.94:spec.kind==='tesla'?.96:.88,mirrorY=spec.belt+.10;
    const mirrorParent=side>0?door:parent;
    rod(mirrorParent,[side*(spec.width*.44),mirrorY-.025,mirrorZ],[side*(spec.width/2+.10),mirrorY-.005,mirrorZ],.025,black);
    const mirror=mesh(mirrorParent,new THREE.SphereGeometry(1,14,8),paint,'mirror');mirror.scale.set(.128,.056,.105);mirror.position.set(side*(spec.width/2+.105),mirrorY+.025,mirrorZ);
    const mirrorGlass=mesh(mirrorParent,new THREE.SphereGeometry(1,10,6),chrome,'side-mirror-glass');mirrorGlass.scale.set(.105,.037,.009);mirrorGlass.position.set(side*(spec.width/2+.105),mirrorY+.018,mirrorZ-.098);mirrorGlass.userData.sideMirror=side;
    const indicator=[];for(let i=0;i<=8;i++)indicator.push([side*(spec.width/2+.10+.12*Math.cos(i*Math.PI/8)),mirrorY+.017,mirrorZ+.095*Math.sin(i*Math.PI/8)]);curve(mirrorParent,indicator,.006,led);
  }
  for(const [name,range] of [['windshield',spec.frontGlass],['rear-window',spec.rearGlass]]){
    const [a,b]=range;surface(parent,18,16,(u,v)=>{const z=THREE.MathUtils.lerp(a,b,u);return canopyTop(spec,z,(v*2-1)*.88,.006);},glass,name,true);
    const edges=[];for(let i=0;i<=22;i++)edges.push(canopyTop(spec,THREE.MathUtils.lerp(a,b,i/22),-.88,.009));for(let i=0;i<=22;i++)edges.push(canopyTop(spec,b,THREE.MathUtils.lerp(-.88,.88,i/22),.009));for(let i=0;i<=22;i++)edges.push(canopyTop(spec,THREE.MathUtils.lerp(b,a,i/22),.88,.009));for(let i=0;i<=22;i++)edges.push(canopyTop(spec,a,THREE.MathUtils.lerp(.88,-.88,i/22),.009));curve(parent,edges,.007,black,true);
  }
  if(spec.kind==='tesla')surface(parent,30,24,(u,v)=>canopyTop(spec,THREE.MathUtils.lerp(-1.045,.35,u),(v*2-1)*.94,.007),glass,'panoramic-roof',true);
  if(spec.kind==='glc'){
    surface(parent,20,20,(u,v)=>canopyTop(spec,THREE.MathUtils.lerp(-1.13,.29,u),(v*2-1)*.78,.007),glass,'sunroof',true);
    for(const side of[-1,1]){const rail=[];for(let i=0;i<=22;i++){const z=THREE.MathUtils.lerp(-1.37,.31,i/22);rail.push(canopyTop(spec,z,side*.94,.04));}curve(parent,rail,.020,chrome);for(const z of[-1.20,.15])rod(parent,canopyTop(spec,z,side*.94,.008),canopyTop(spec,z,side*.94,.04),.017,black);}
  }
  const z=spec.frontGlass[1]-.065;
  for(const side of[-1,1]){const a=canopyTop(spec,z,side*.69,.018),b=canopyTop(spec,z-.055,side*.14,.018);rod(parent,a,b,.008,black);}
  for(let i=0;i<5;i++){const z=THREE.MathUtils.lerp(spec.rearGlass[0]+.12,spec.rearGlass[1]-.08,i/4),points=[];for(let j=0;j<=20;j++)points.push(canopyTop(spec,z,(j/20*2-1)*.80,.009));seam(parent,points);}
}

function lamps(parent,spec,end,polygons){
  const led=parent.userData.lightMaterials.head,redLed=parent.userData.lightMaterials.tail,redLens=parent.userData.lightMaterials.tailLens;
  for(let sideIndex=0;sideIndex<2;sideIndex++){
    const polygon=polygons[sideIndex],side=sideIndex===0?1:-1;
    patch(parent,spec,end,polygon,black,-.018,end>0?'headlamp-housing':'taillamp-housing');
    patchBorder(parent,spec,end,polygon,.006,end>0?chrome:redLens,.006);
    const cx=polygon.reduce((n,p)=>n+p[0],0)/polygon.length,cy=polygon.reduce((n,p)=>n+p[1],0)/polygon.length;
    const inner=polygon.map(([x,y])=>[cx+(x-cx)*.93,cy+(y-cy)*.87]);
    if(end>0){
      const projectors=spec.kind==='grandeur'?2:1;
      for(let i=0;i<projectors;i++){
        const x=side*(Math.abs(cx)+(i-(projectors-1)/2)*.085),y=cy-.008,r=spec.kind==='accent'?.042:.047;
        const reflector=mesh(parent,new THREE.TorusGeometry(r,.009,4,16),chrome);reflector.position.set(x,y,faceZ(spec,end,x,y,-.004));
        const projector=mesh(parent,new THREE.SphereGeometry(r*.8,12,8),glass);projector.position.set(x,y,faceZ(spec,end,x,y,.003));projector.scale.z=.32;
        const lit=mesh(parent,new THREE.CircleGeometry(r*.40,14),led);lit.position.set(x,y,faceZ(spec,end,x,y,.017));
      }
      const upper=polygon.filter(([x,y])=>y>cy+.01).sort((a,b)=>side*(a[0]-b[0]));
      if(upper.length>2)curve(parent,upper.map(([x,y])=>[x,y-.016,faceZ(spec,end,x,y,.012)]),spec.kind==='accent'?.006:.009,led);
      const x=side*Math.max(...polygon.map(p=>Math.abs(p[0])))*.975;
      const indicator=mesh(parent,new THREE.SphereGeometry(1,10,6),amber);indicator.position.set(x,cy,faceZ(spec,end,x,cy,.008));indicator.scale.set(.018,.033,.012);
      patch(parent,spec,end,inner,lens,.019,'headlamp-lens');
    }else{
      patch(parent,spec,end,inner,redLens,.006,'taillamp-lens');
      if(spec.kind==='malibu'){
        for(const offset of[-.060,.06]){const x=side*(Math.abs(cx)+offset),r=.044,ring=mesh(parent,new THREE.TorusGeometry(r,.008,5,16),redLed);ring.position.set(x,cy,faceZ(spec,end,x,cy,.014));ring.scale.set(1,.85,1);}
      }else{
        for(const dy of[-.026,.020]){const points=[];for(let x=Math.min(...inner.map(p=>p[0]));x<=Math.max(...inner.map(p=>p[0]));x+=.014)if(inside(x,cy+dy,inner))points.push([x,cy+dy,faceZ(spec,end,x,cy+dy,.013)]);if(points.length>1)curve(parent,points,.010,redLed);}
      }
    }
  }
  if(end<0&&spec.kind==='grandeur'){const points=[];for(let x=-.75;x<=.75;x+=.04)points.push([x,.812,faceZ(spec,-1,x,.812,.014)]);curve(parent,points,.012,redLens);}
  if(end>0&&spec.kind!=='tesla')for(const side of[-1,1]){
    const x=side*(spec.width*.37),y=spec.kind==='glc'?.48:.39;
    const housing=mesh(parent,new THREE.SphereGeometry(1,10,6),black);housing.position.set(x,y,faceZ(spec,1,x,y,.003));housing.scale.set(.113,.050,.020);
    const fog=mesh(parent,new THREE.CircleGeometry(spec.kind==='grandeur'?.029:.032,16),chrome);fog.position.set(x,y,faceZ(spec,1,x,y,.025));
  }
}

function wheel(parent,spec,side,z){
  const car=parent,steer=new THREE.Group(),spin=new THREE.Group();steer.name=z>0?'front-wheel-steer':'rear-wheel';spin.name='wheel-spin';steer.add(spin);car.add(steer);parent=spin;
  const r=spec.radius,w=.222,center=side*(spec.width/2-.085),out=side*(spec.width/2+.025);
  const points=[[r*.72,-w/2],[r*.90,-w/2],[r*.985,-w*.34],[r,-w*.13],[r,w*.13],[r*.985,w*.34],[r*.90,w/2],[r*.72,w/2]].map(p=>new THREE.Vector2(...p));
  const tire=mesh(parent,new THREE.LatheGeometry(points,24),rubber,'tyre');tire.rotation.z=Math.PI/2;tire.position.set(center,r,z);
  for(const offset of[-.057,0,.057]){
    const groove=mesh(parent,new THREE.TorusGeometry(r-.001,.0032,3,20),well);groove.rotation.y=Math.PI/2;groove.position.set(center+offset,r,z);
  }
  const rimProfile=[[r*.70,-.016],[r*.76,-.015],[r*.765,.016],[r*.715,.023]].map(p=>new THREE.Vector2(...p));
  const rim=mesh(parent,new THREE.LatheGeometry(rimProfile,24),chrome,'rim-lip');rim.rotation.z=Math.PI/2;rim.position.set(out,r,z);
  const brake=mesh(parent,new THREE.CylinderGeometry(r*.61,r*.61,.015,24),darkAlloy,'brake-disc');brake.rotation.z=Math.PI/2;brake.position.set(out-side*.044,r,z);
  const disc=mesh(parent,new THREE.TorusGeometry(r*.54,.003,3,20),alloy);disc.rotation.y=Math.PI/2;disc.position.set(out-side*.035,r,z);
  const caliper=box(parent,[.025,.105,.048],[out-side*.025,r+.055,z+r*.45],spec.kind==='tesla'?darkAlloy:alloy,'brake-caliper');caliper.rotation.x=-.2;
  const count=spec.kind==='grandeur'?10:spec.kind==='tesla'?7:5,split=spec.kind==='glc';
  for(let i=0;i<count;i++)for(let twin=0;twin<(split?2:1);twin++){
    const angle=i*Math.PI*2/count+(twin-.5)*.055;
    surface(parent,4,2,(u,v)=>{
      const radius=THREE.MathUtils.lerp(r*.16,r*.70,u),width=spec.kind==='tesla'?.14:spec.kind==='malibu'?.095:split?.025:.045;
      const a=angle+(v-.5)*width/Math.max(radius,.06)+(spec.kind==='tesla'?.30*u:spec.kind==='grandeur'?.10*u:.03*u);
      return [out+side*(.012+.009*Math.sin(Math.PI*u)),r+Math.sin(a)*radius,z+Math.cos(a)*radius];
    },spec.kind==='tesla'?darkAlloy:alloy,'wheel-spoke',side<0);
  }
  const hub=mesh(parent,new THREE.CylinderGeometry(r*.155,r*.155,.035,24),chrome,'wheel-hub');hub.rotation.z=Math.PI/2;hub.position.set(out+side*.018,r,z);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5,bolt=mesh(parent,new THREE.SphereGeometry(.008,6,4),darkAlloy);bolt.position.set(out+side*.038,r+Math.sin(a)*r*.115,z+Math.cos(a)*r*.115);}
  const emblem=badgeMaterial(spec.brand);const hubBadge=mesh(parent,new THREE.PlaneGeometry(r*.17,r*.13),emblem,'wheel-emblem');hubBadge.rotation.y=side*Math.PI/2;hubBadge.position.set(out+side*.040,r,z);hubBadge.castShadow=false;
  batchDetails(spin);
  const axle=new THREE.Vector3(center,r,z);for(const object of spin.children)object.position.sub(axle);steer.position.copy(axle);
  const info={pivot:steer,spin,front:z>0,side,z,radius:r};steer.userData={side,front:z>0,radius:r};return info;
}

// Transparent original vector drawings preserve the actual emblems: italic
// Hyundai H in an oval, Mercedes three-point star, gold bowtie, Tesla split T.
function badgeMaterial(brand){
  if(badgeCache.has(brand))return badgeCache.get(brand);
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=brand==='tesla'||brand==='mercedes'?512:256;const c=canvas.getContext('2d');
  const gradient=c.createLinearGradient(0,0,0,canvas.height);gradient.addColorStop(0,'#f4f7f9');gradient.addColorStop(.35,'#b7c3cb');gradient.addColorStop(.50,'#eef3f5');gradient.addColorStop(1,'#89979f');
  c.fillStyle=gradient;c.strokeStyle=gradient;c.lineJoin='round';
  if(brand==='hyundai'){
    c.lineWidth=17;c.beginPath();c.ellipse(256,128,235,103,0,0,Math.PI*2);c.stroke();
    c.beginPath();c.moveTo(95,207);c.bezierCurveTo(124,152,145,106,169,55);c.bezierCurveTo(174,39,192,30,211,30);c.lineTo(192,83);c.bezierCurveTo(181,111,197,123,221,116);c.lineTo(307,94);c.bezierCurveTo(332,87,344,72,352,51);c.lineTo(358,37);c.bezierCurveTo(376,42,393,50,396,61);c.lineTo(331,198);c.bezierCurveTo(325,212,303,219,286,221);c.lineTo(305,166);c.bezierCurveTo(316,136,299,128,278,134);c.lineTo(200,154);c.bezierCurveTo(175,161,154,184,145,207);c.closePath();c.fill();
  }else if(brand==='mercedes'){
    c.lineWidth=22;c.beginPath();c.arc(256,256,234,0,Math.PI*2);c.stroke();
    c.beginPath();for(let i=0;i<6;i++){const a=-Math.PI/2+i*Math.PI/3,r=i%2?32:224;const x=256+Math.cos(a)*r,y=256+Math.sin(a)*r;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.fill();
    c.strokeStyle='#6c7a83';c.lineWidth=1.5;c.stroke();
  }else if(brand==='chevrolet'){
    const points=[[27,79],[175,79],[188,31],[347,31],[334,79],[488,79],[463,176],[313,176],[300,224],[140,224],[153,176],[2,176]];
    c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.lineWidth=16;c.stroke();
    const gold=c.createLinearGradient(0,30,0,224);gold.addColorStop(0,'#e6c771');gold.addColorStop(.5,'#cfaa50');gold.addColorStop(1,'#aa8533');c.fillStyle=gold;c.fill();
  }else{
    c.beginPath();c.moveTo(93,58);c.quadraticCurveTo(256,9,419,58);c.lineTo(401,94);c.quadraticCurveTo(256,49,111,94);c.closePath();c.fill();
    c.beginPath();c.moveTo(123,106);c.quadraticCurveTo(256,66,389,106);c.lineTo(351,151);c.quadraticCurveTo(316,129,286,130);c.lineTo(272,414);c.lineTo(256,452);c.lineTo(240,414);c.lineTo(226,130);c.quadraticCurveTo(195,130,161,151);c.closePath();c.fill();
  }
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
  const material=new THREE.MeshStandardMaterial({map,transparent:true,alphaTest:.12,roughness:.25,metalness:.2,depthWrite:false,side:THREE.DoubleSide});badgeCache.set(brand,material);return material;
}
function emblem(parent,spec,end){
  const size=spec.brand==='mercedes'?(end>0?[.245,.245]:[.11,.11]):spec.brand==='tesla'?[.095,.105]:spec.brand==='chevrolet'?[.155,.075]:[.13,.065];
  const y=end>0?(spec.kind==='glc'?.78:spec.kind==='grandeur'?.735:spec.kind==='accent'?.72:spec.kind==='malibu'?.663:.91):(spec.kind==='glc'?.99:spec.kind==='tesla'?.965:spec.kind==='grandeur'?.899:.83);
  const object=mesh(parent,new THREE.PlaneGeometry(...size),badgeMaterial(spec.brand),`${spec.brand}-${end>0?'front':'rear'}-emblem`);object.userData.manufacturerEmblem=spec.brand;object.castShadow=false;
  if(end>0&&spec.kind==='tesla'){const z=spec.length/2-.31,position=bodyPoint(spec,z,0);object.position.set(0,position[1]+.007,z);object.rotation.x=-Math.PI/2+.35;}
  else{object.position.set(0,y,faceZ(spec,end,0,y,spec.brand==='mercedes'&&end>0?.065:.023));object.rotation.y=end<0?Math.PI:0;}
}
function plateMaterial(number){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=144;const c=canvas.getContext('2d');c.fillStyle='#f2f3ec';c.fillRect(0,0,512,144);c.strokeStyle='#8f989b';c.lineWidth=4;c.strokeRect(5,5,502,134);c.textAlign='center';c.textBaseline='middle';c.font='600 108px Arial, sans-serif';c.fillStyle='#142026';c.fillText(number,256,81);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshStandardMaterial({map,roughness:.65});
}
function textBadge(parent,spec){
  if(!spec.rearBadge)return;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const c=canvas.getContext('2d');c.font='500 60px Arial, sans-serif';c.textAlign='center';c.fillStyle='#a0afb7';c.fillText(spec.rearBadge,256,69);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshStandardMaterial({map,transparent:true,alphaTest:.12,roughness:.3,metalness:.4,depthWrite:false});
  const x=spec.kind==='grandeur'?0:-.47,y=spec.kind==='grandeur'?.705:spec.kind==='glc'?.92:.725;
  const object=mesh(parent,new THREE.PlaneGeometry(spec.kind==='grandeur'?.35:.22,.042),material,'model-badge');object.position.set(x,y,faceZ(spec,-1,x,y,.015));object.rotation.y=Math.PI;object.castShadow=false;
}
function finish(parent,spec){
  const material=plateMaterial(spec.plate);
  for(const end of[1,-1]){
    const y=end<0?.49:spec.kind==='grandeur'?.505:spec.kind==='glc'?.49:.455,z=faceZ(spec,end,0,y,.019);
    const frame=box(parent,[.535,.145,.018],[0,y,z],black,'plate-frame');frame.castShadow=false;
    const plate=mesh(parent,new THREE.PlaneGeometry(.50,.126),material,`${spec.id}-${end>0?'front':'rear'}-plate`);plate.rotation.y=end<0?Math.PI:0;plate.position.set(0,y,z+end*.011);plate.userData.plate=spec.plate;
    emblem(parent,spec,end);
    const seamPoints=[];for(let i=0;i<=32;i++){const x=THREE.MathUtils.lerp(-spec.width*.39,spec.width*.39,i/32),y=.575;seamPoints.push([x,y,faceZ(spec,end,x,y,.006)]);}seam(parent,seamPoints);
    const lower=[];for(let i=0;i<=30;i++){const x=THREE.MathUtils.lerp(-spec.width*.38,spec.width*.38,i/30);lower.push([x,.28,faceZ(spec,end,x,.28,.005)]);}curve(parent,lower,.018,spec.kind==='glc'||spec.kind==='tesla'?black:paint);
  }
  textBadge(parent,spec);
  const front=spec.roof.at(-1)[0],rear=spec.roof[0][0];
  for(const region of[[front+.045,spec.length/2-.14],[-spec.length/2+.15,rear-.05]]){
    const points=[];for(let i=0;i<=24;i++){const x=THREE.MathUtils.lerp(-.70,.70,i/24),z=region[0];const p=bodyPoint(spec,z,x/bodyAt(spec,z).half);points.push([p[0],p[1]+.002,p[2]]);}seam(parent,points);
    for(const side of[-1,1]){const points=[];for(let i=0;i<=20;i++){const z=THREE.MathUtils.lerp(region[0],region[1],i/20),p=bodyPoint(spec,z,side*.71);points.push([p[0],p[1]+.002,p[2]]);}seam(parent,points);}
  }
  const fuel=mesh(parent,new THREE.CircleGeometry(.063,24),paint,'fuel-flap');fuel.rotation.y=Math.PI/2;fuel.position.set(spec.width/2+.002,.745,-spec.wheelbase/2+.14);
  if(spec.kind!=='tesla')for(const side of[-1,1]){
    const x=side*spec.width*.29,z=faceZ(spec,-1,x,.29,.018),exhaust=mesh(parent,new THREE.TorusGeometry(.031,.006,5,16),chrome,'exhaust');exhaust.position.set(x,.292,z);exhaust.scale.set(1.5,.75,1);
  }
  if(spec.kind==='tesla'||spec.kind==='glc'){
    const z=spec.roof[0][0]+.07,points=[];for(let i=0;i<=18;i++){const x=THREE.MathUtils.lerp(-.68,.68,i/18);points.push([x,canopyAt(spec,z).height+.020,z]);}curve(parent,points,.017,spec.kind==='tesla'?black:paint);
  }
}

// Merge small opaque parts by material after baking their transforms. Body
// surfaces and readable badge/plate meshes retain their names and metadata.
function batchDetails(group){
  const batches=new Map(),lines=[];
  for(const object of [...group.children]){
    if(object.isLine&&!object.isLineSegments){lines.push(object);continue;}
    if(!object.isMesh||object.material.transparent||object.userData.plate||object.userData.manufacturerEmblem||object.userData.sideMirror)continue;
    const key=object.material.uuid+(object.userData.bodySurface?object.name:'');if(!batches.has(key))batches.set(key,[]);batches.get(key).push(object);
  }
  for(const objects of batches.values()){
    if(objects.length<2)continue;
    const positions=[],normals=[],uvs=[];
    for(const object of objects){
      object.updateMatrix();const transformed=object.geometry.clone();transformed.applyMatrix4(object.matrix);
      const flat=transformed.index?transformed.toNonIndexed():transformed;
      positions.push(...flat.attributes.position.array);normals.push(...flat.attributes.normal.array);
      if(flat.attributes.uv)uvs.push(...flat.attributes.uv.array);else for(let i=0;i<flat.attributes.position.count;i++)uvs.push(0,0);
      if(flat!==transformed)flat.dispose();transformed.dispose();object.geometry.dispose();group.remove(object);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    const merged=mesh(group,geometry,objects[0].material,objects[0].userData.bodySurface?objects[0].name:'batched-vehicle-details');merged.userData.parts=objects.map(o=>o.name).filter(Boolean);if(objects[0].userData.bodySurface)merged.userData.bodySurface=true;
  }
  if(lines.length){
    const vertices=[];
    for(const object of lines){object.updateMatrix();const p=object.geometry.attributes.position;for(let i=1;i<p.count;i++){for(const j of[i-1,i]){const point=new THREE.Vector3().fromBufferAttribute(p,j).applyMatrix4(object.matrix);vertices.push(point.x,point.y,point.z);}}object.geometry.dispose();group.remove(object);}
    const object=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(vertices,3)),gap);object.name='panel-seams';group.add(object);
  }
}
function driverDoor(parent,spec){
  const rear=(spec.kind==='accent'?-.04:-.135)+.038,front=spec.sideWindows.at(-1)[1]+.025;
  const hinge=new THREE.Vector3(bodyAt(spec,front).half,.65,front),door=new THREE.Group();door.name='driver-front-door';parent.add(door);
  parent.userData.doorOpening={rear,front};parent.userData.driverDoor=door;
  surface(door,24,7,(u,v)=>sidePoint(spec,1,THREE.MathUtils.lerp(rear,front,u),v),paint,'driver-door-skin');
  surface(door,24,3,(u,v)=>bodyPoint(spec,THREE.MathUtils.lerp(rear,front,u),THREE.MathUtils.lerp(.895,1,v)),paint,'driver-door-shoulder',true);
  canopyPanels(door,spec,1,rear,front,'driver-door-window-frame');
  const lining=surface(door,24,6,(u,v)=>sidePoint(spec,1,THREE.MathUtils.lerp(rear,front,u),v,-.042),well,'driver-door-inner-trim');lining.castShadow=false;
  const rearEdge=[],frontEdge=[],bottom=[],top=[];
  for(let i=0;i<=16;i++){
    const t=i/16,z=THREE.MathUtils.lerp(rear,front,t);
    bottom.push(sidePoint(spec,1,z,0));top.push(canopySide(spec,1,z,1));
    for(const [edge,at]of[[rearEdge,rear],[frontEdge,front]]){
      if(i<=8)edge.push(sidePoint(spec,1,at,t*2));else edge.push(canopySide(spec,1,at,(t-.5)*2));
    }
  }
  // Fixed rubber jamb and sill frame the same perimeter as the moving panel.
  for(const edge of[rearEdge,frontEdge,bottom,top])curve(parent,edge.map(([x,y,z])=>[x-.015,y,z]),.014,black);
  for(const edge of[rearEdge,frontEdge,bottom,top])curve(door,edge,.006,black);
  const armrest=box(door,[.075,.045,.45],[bodyAt(spec,.44).half-.08,.63,.35],black,'door-armrest');armrest.rotation.y=-.015;
  parent.userData.doorHinge=hinge;
  return door;
}
function interior(parent,spec){
  const upholstery=new THREE.MeshStandardMaterial({color:spec.kind==='tesla'?0x35393b:0x323230,roughness:.9});
  const interior=new THREE.Group();interior.name='vehicle-interior';parent.add(interior);
  const seatY=spec.kind==='glc'||spec.kind==='tesla'?.54:.40;
  box(interior,[spec.width*.80,.06,2.3],[0,.07,-.12],well,'cabin-floor');
  for(const x of[-.34,.34]){
    box(interior,[.45,.12,.51],[x,seatY,.15],upholstery,'front-seat-cushion');
    const back=box(interior,[.45,.47,.11],[x,seatY+.26,-.13],upholstery,'front-seat-back');back.rotation.x=-.12;
    box(interior,[.22,.15,.09],[x,seatY+.57,-.17],upholstery,'seat-headrest');
  }
  box(interior,[1.20,.12,.45],[0,seatY,-.85],upholstery,'rear-seat');
  box(interior,[1.20,.36,.10],[0,seatY+.21,-1.06],upholstery,'rear-seat-back');
  box(interior,[.18,.22,.68],[0,seatY-.08,.27],black,'center-console');
  box(interior,[spec.width*.71,.18,.22],[0,spec.belt-.18,.79],black,'dashboard');
  const steering=mesh(interior,new THREE.TorusGeometry(.14,.017,6,20),black,'steering-wheel');steering.position.set(.34,seatY+.39,.59);steering.rotation.x=-.30;
  for(const side of[-1,1])rod(interior,[.34,seatY+.39,.59],[.34+side*.105,seatY+.355,.60],.013,darkAlloy);
  rod(interior,[.34,seatY+.39,.59],[.34,seatY+.31,.61],.014,darkAlloy);
  batchDetails(interior);
  parent.userData.driverEntry=new THREE.Vector3(spec.width/2+.55,0,.45);
  parent.userData.driverSeat=new THREE.Vector3(.34,seatY-.495,.20);
}
function finishAnimation(parent,spec,wheels){
  const door=parent.userData.driverDoor,hinge=parent.userData.doorHinge;
  batchDetails(door);for(const child of door.children)child.position.sub(hinge);door.position.copy(hinge);
  const light=parent.userData.lightMaterials;
  parent.userData.wheels=wheels;parent.userData.wheelRadius=spec.radius;
  parent.userData.setDoor=(progress)=>{
    const value=THREE.MathUtils.clamp(Number.isFinite(progress)?progress:0,0,1);
    door.rotation.y=-value*Math.PI*.39;parent.userData.doorOpen=value;
  };
  parent.userData.setDrive=({wheelAngle=0,steering=0,headlights=false,braking=false,reversing=false}={})=>{
    for(const wheel of wheels){wheel.spin.rotation.x=Number.isFinite(wheelAngle)?wheelAngle:0;wheel.pivot.rotation.y=wheel.front?THREE.MathUtils.clamp(steering,-.52,.52):0;}
    light.head.emissiveIntensity=headlights?2.6:.12;light.tail.emissiveIntensity=braking?2.8:headlights?.70:.12;light.tailLens.emissiveIntensity=braking?1.2:headlights?.4:.12;light.reverse.emissiveIntensity=reversing?2:.05;
    parent.userData.drivingLights={headlights:!!headlights,braking:!!braking,reversing:!!reversing};
  };
  parent.userData.setDoor(0);parent.userData.setDrive();
}
function vehicle(spec){
  const group=new THREE.Group();group.name=spec.id;group.position.set(spec.x,-.075,22.45);
  group.userData={model:spec.model,plate:spec.plate,parked:true,paint:'pearl white',wheelbase:spec.wheelbase};
  group.userData.lightMaterials={head:led.clone(),tail:redLed.clone(),tailLens:redLens.clone(),reverse:led.clone()};
  driverDoor(group,spec);body(group,spec);cabin(group,spec);interior(group,spec);
  const wheels=[];for(const side of[-1,1])for(const z of[-spec.wheelbase/2,spec.wheelbase/2])wheels.push(wheel(group,spec,side,z));
  for(const side of[-1,1]){const x=side*spec.width*.29,y=.58;const reverse=mesh(group,new THREE.PlaneGeometry(.08,.023),group.userData.lightMaterials.reverse,'reverse-light');reverse.rotation.y=Math.PI;reverse.position.set(x,y,faceZ(spec,-1,x,y,.015));}
  finish(group,spec);batchDetails(group);finishAnimation(group,spec,wheels);
  return {group,id:spec.id,model:spec.model,plate:spec.plate,dimensions:{length:spec.length,width:spec.width,height:spec.height},position:group.position.toArray()};
}
export function parkingCars(world){
  const group=new THREE.Group();group.name='forecourt-parking';
  const marking=new THREE.MeshStandardMaterial({color:0xcdd1c9,roughness:.95,polygonOffset:true,polygonOffsetFactor:-1});
  for(const spec of VEHICLES){for(const side of[-1,1])box(group,[.055,.008,5.3],[spec.x+side*1.35,-.064,22.23],marking);box(group,[2.75,.008,.055],[spec.x,-.064,24.855],marking);}
  const cars=VEHICLES.map(vehicle);cars.forEach(car=>group.add(car.group));world.add(group);return {group,cars};
}
