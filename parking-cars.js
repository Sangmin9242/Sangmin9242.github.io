import * as THREE from './vendor/three.module.js';

// Original, procedural vehicle studies. +Z is the front; dimensions are in metres.
const VEHICLES = [
  { id: 'accent-2012', model: 'Hyundai Accent 2012', plate: '9095', x: -14, color: 0xc4c9ce, length: 4.38, width: 1.72, height: 1.45, wheelbase: 2.57, radius: .29, kind: 'accent' },
  { id: 'glc', model: 'Mercedes-Benz GLC', plate: '2380', x: -9, color: 0x263a4b, length: 4.66, width: 1.89, height: 1.66, wheelbase: 2.87, radius: .35, kind: 'glc' },
  { id: 'grandeur-ig', model: 'Hyundai Grandeur IG', plate: '4043', x: -4, color: 0xe3e3de, length: 4.90, width: 1.86, height: 1.47, wheelbase: 2.84, radius: .32, kind: 'grandeur' },
  { id: 'model-y', model: 'Tesla Model Y', plate: '1513', x: 1, color: 0xf0eee8, length: 4.75, width: 1.92, height: 1.62, wheelbase: 2.89, radius: .35, kind: 'tesla' },
  { id: 'malibu-2015', model: 'Chevrolet Malibu 2015', plate: 'XXXX', x: 6, color: 0x454c56, length: 4.86, width: 1.86, height: 1.47, wheelbase: 2.74, radius: .32, kind: 'malibu' },
];

const steel = new THREE.MeshStandardMaterial({ color: 0xcbd1d5, metalness: .8, roughness: .24 });
const rubber = new THREE.MeshStandardMaterial({ color: 0x171b1d, roughness: .94 });
const trim = new THREE.MeshStandardMaterial({ color: 0x22272b, metalness: .2, roughness: .5 });
const glass = new THREE.MeshPhysicalMaterial({ color: 0x253a47, metalness: .23, roughness: .12, clearcoat: 1, clearcoatRoughness: .06 });
const headlamp = new THREE.MeshStandardMaterial({ color: 0xe9f2f7, emissive: 0xc3ddec, emissiveIntensity: .28, metalness: .35, roughness: .15 });
const taillamp = new THREE.MeshStandardMaterial({ color: 0xad2633, emissive: 0x9c1320, emissiveIntensity: .26, roughness: .23 });
const amber = new THREE.MeshStandardMaterial({ color: 0xcb772c, roughness: .35 });

function mesh(parent, geometry, material, position = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function box(parent, size, position, material) {
  return mesh(parent, new THREE.BoxGeometry(...size), material, position);
}

function segment(parent, start, end, radius, material) {
  const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
  const object = mesh(parent, new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 7), material);
  object.position.copy(a).add(b).multiplyScalar(.5);
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  return object;
}

function line(parent, points, material = trim) {
  const object = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p))), new THREE.LineBasicMaterial({ color: material.color }));
  parent.add(object);
  return object;
}

// Rounded section rings produce a continuous body instead of stacked cuboids.
function shell(parent, sections, material) {
  const vertices = [], indices = [], ring = 12;
  for (const [z, width, top, bottom] of sections) {
    const w = width / 2, h = top - bottom;
    for (const [x, y] of [[-.84, 0], [.84, 0], [1, .12], [1, .60], [.94, .86], [.78, 1], [-.78, 1], [-.94, .86], [-1, .60], [-1, .12], [-.94, .04], [-.84, 0]]) vertices.push(x * w, bottom + y * h, z);
  }
  for (let section = 0; section < sections.length - 1; section++) {
    for (let i = 0; i < ring - 1; i++) {
      const a = section * ring + i, b = a + ring;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  for (let i = 1; i < ring - 2; i++) {
    indices.push(0, i + 1, i);
    const a = (sections.length - 1) * ring;
    indices.push(a, a + i, a + i + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // The outward winding is shared by every shell, with front and rear caps.
  return mesh(parent, geometry, material);
}

function face(parent, points, material) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
  const indices = [];
  for (let i = 1; i < points.length - 1; i++) indices.push(0, i, i + 1);
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const double = material.clone(); double.side = THREE.DoubleSide;
  return mesh(parent, geometry, double);
}

function plateMap(text) {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 80;
  const context = canvas.getContext('2d');
  context.fillStyle = '#f4f4ec'; context.fillRect(0, 0, 256, 80);
  context.strokeStyle = '#a1a8a9'; context.lineWidth = 4; context.strokeRect(3, 3, 250, 74);
  context.fillStyle = '#17232b'; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.font = '600 62px Arial, sans-serif'; context.fillText(text, 128, 44);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function plates(parent, spec) {
  const material = new THREE.MeshStandardMaterial({ map: plateMap(spec.plate), roughness: .45 });
  for (const end of [1, -1]) {
    box(parent, [.56, .17, .024], [0, .49, end * (spec.length / 2 + .014)], trim);
    const plate = mesh(parent, new THREE.PlaneGeometry(.51, .135), material, [0, .49, end * (spec.length / 2 + .029)]);
    plate.rotation.y = end < 0 ? Math.PI : 0;
    plate.name = `${spec.id}-${end > 0 ? 'front' : 'rear'}-plate`;
    plate.userData.plate = spec.plate;
  }
}

function wheels(parent, spec, paint) {
  const r = spec.radius, axle = spec.wheelbase / 2, x = spec.width / 2 - .015;
  for (const side of [-1, 1]) for (const z of [-axle, axle]) {
    const tire = mesh(parent, new THREE.CylinderGeometry(r, r, .23, 24), rubber, [side * x, r, z]); tire.rotation.z = Math.PI / 2;
    const rim = mesh(parent, new THREE.CylinderGeometry(r * .72, r * .72, .244, 24), steel, [side * x, r, z]); rim.rotation.z = Math.PI / 2;
    const inset = mesh(parent, new THREE.CylinderGeometry(r * .62, r * .62, .252, 20), trim, [side * x, r, z]); inset.rotation.z = Math.PI / 2;
    const hub = mesh(parent, new THREE.CylinderGeometry(r * .15, r * .15, .27, 12), steel, [side * x, r, z]); hub.rotation.z = Math.PI / 2;
    const spokeCount = spec.kind === 'tesla' ? 7 : spec.kind === 'grandeur' ? 10 : 5;
    for (let i = 0; i < spokeCount; i++) {
      const angle = i * Math.PI * 2 / spokeCount;
      segment(parent, [side * (x + .131), r + Math.sin(angle) * r * .13, z + Math.cos(angle) * r * .13], [side * (x + .131), r + Math.sin(angle + .14) * r * .65, z + Math.cos(angle + .14) * r * .65], spec.kind === 'tesla' ? .043 : .022, steel);
    }
    const arch = [];
    for (let i = 0; i <= 18; i++) {
      const angle = i * Math.PI / 18;
      arch.push(new THREE.Vector3(side * (spec.width / 2 + .008), r + Math.sin(angle) * (r + .065), z + Math.cos(angle) * (r + .065)));
    }
    mesh(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arch), 18, .023, 5, false), spec.kind === 'glc' ? trim : paint);
  }
}

function cabin(parent, spec, paint) {
  const suv = spec.kind === 'glc', tesla = spec.kind === 'tesla';
  const shoulder = suv ? 1.00 : tesla ? .92 : .87, roof = spec.height - .035;
  const w = spec.width;
  const profile = suv ? [[-1.82, w * .81, 1.08, shoulder], [-1.09, w * .74, roof - .03, shoulder], [.54, w * .71, roof, shoulder], [1.32, w * .84, shoulder + .10, shoulder]]
    : tesla ? [[-1.67, w * .80, shoulder + .09, shoulder], [-.95, w * .71, roof - .15, shoulder], [-.30, w * .70, roof, shoulder], [.48, w * .69, roof - .025, shoulder], [1.30, w * .82, shoulder + .06, shoulder]]
      : [[-1.38, w * .79, shoulder + .07, shoulder], [-.74, w * .70, roof - .025, shoulder], [.44, w * .69, roof, shoulder], [1.26, w * .80, shoulder + .08, shoulder]];
  const windows = shell(parent, profile, glass); windows.name = 'window-cabin';
  const topProfile = profile.slice(1, -1).map(([z, width, top]) => [z, width * .88, top + .025, top - .035]);
  shell(parent, topProfile, tesla ? trim : paint);
  // Pillars and slim window surrounds follow the tapered cabin surfaces.
  const back = profile[0], rearRoof = profile[1], frontRoof = profile[profile.length - 2], front = profile[profile.length - 1];
  for (const side of [-1, 1]) {
    const edge = p => [side * p[1] / 2, p[2] - .045, p[0]];
    segment(parent, edge(back), edge(rearRoof), .041, paint);
    segment(parent, edge(frontRoof), edge(front), .041, paint);
    segment(parent, [side * w * .41, shoulder + .015, -.08], [side * w * .35, roof - .035, -.08], .042, trim);
    line(parent, profile.map(p => [side * p[1] / 2, shoulder + .012, p[0]]), steel);
    for (const doorZ of [-.75, .7]) {
      line(parent, [[side * (w / 2 + .006), .39, doorZ], [side * (w / 2 + .006), shoulder - .04, doorZ + .07]], trim);
      box(parent, [.028, .035, .17], [side * (w / 2 + .019), shoulder - .085, doorZ - .23], tesla ? trim : steel);
    }
    const mirror = mesh(parent, new THREE.SphereGeometry(1, 10, 6), paint, [side * (w / 2 + .12), shoulder + .04, .90]); mirror.scale.set(.15, .065, .12);
    box(parent, [.025, .065, .15], [side * (w / 2 + .25), shoulder + .04, .89], glass);
    box(parent, [.055, .08, spec.length * .62], [side * (w / 2 - .035), .33, 0], trim);
  }
  if (suv) for (const side of [-1, 1]) segment(parent, [side * w * .29, roof + .04, -.94], [side * w * .29, roof + .04, .4], .022, steel);
}

function ovalBadge(parent, z, y) {
  const ring = mesh(parent, new THREE.TorusGeometry(.056, .008, 5, 16), steel, [0, y, z]); ring.scale.set(1.5, .75, 1);
  segment(parent, [-.038, y - .027, z], [.028, y + .027, z], .007, steel);
  segment(parent, [-.026, y, z], [.035, y, z], .006, steel);
}

function frontRear(parent, spec, paint) {
  const z = spec.length / 2, w = spec.width;
  const suv = spec.kind === 'glc', tesla = spec.kind === 'tesla';
  const nose = z + .008, rear = -z - .008;
  box(parent, [w * .73, .11, .032], [0, .32, nose], trim);
  box(parent, [w * .77, .075, .03], [0, .30, rear], trim);
  for (const side of [-1, 1]) {
    const lampY = suv ? .86 : .78;
    const outer = side * w * .45, inner = side * w * (tesla ? .28 : .25);
    face(parent, [[inner, lampY + .06, nose + .005], [outer, lampY + .09, nose - .055], [outer, lampY - .065, nose - .04], [inner, lampY - .025, nose + .006]], headlamp);
    segment(parent, [inner, lampY + .035, nose + .017], [outer, lampY + .064, nose - .035], .014, headlamp);
    box(parent, [.035, .08, .045], [outer, lampY - .02, nose - .025], amber);
    const tail = box(parent, [w * .20, spec.kind === 'malibu' ? .145 : .09, .052], [side * w * .32, suv ? .84 : .70, rear], taillamp);
    if (spec.kind === 'tesla') tail.rotation.z = -side * .15;
    if (!tesla) {
      const exhaust = mesh(parent, new THREE.CylinderGeometry(.032, .032, .10, 10), steel, [side * w * .30, .26, rear]); exhaust.rotation.x = Math.PI / 2;
    }
  }
  if (spec.kind === 'grandeur') {
    face(parent, [[-.57, .82, nose], [.57, .82, nose], [.43, .46, nose + .009], [-.43, .46, nose + .009]], trim);
    for (let y = .53; y <= .8; y += .07) segment(parent, [-.46, y, nose + .024], [.46, y, nose + .024], .009, steel);
    segment(parent, [-w * .35, .715, rear - .03], [w * .35, .715, rear - .03], .025, taillamp);
    ovalBadge(parent, nose + .037, .76);
  } else if (suv) {
    face(parent, [[-.60, .89, nose], [.60, .89, nose], [.54, .60, nose + .01], [-.54, .60, nose + .01]], trim);
    for (const y of [.68, .80]) segment(parent, [-.54, y, nose + .026], [.54, y, nose + .026], .016, steel);
    mesh(parent, new THREE.TorusGeometry(.113, .012, 6, 24), steel, [0, .75, nose + .05]);
    for (let i = 0; i < 3; i++) { const angle = i * Math.PI * 2 / 3; segment(parent, [0, .75, nose + .06], [Math.sin(angle) * .097, .75 + Math.cos(angle) * .097, nose + .06], .010, steel); }
    box(parent, [w * .65, .055, .055], [0, .31, nose + .014], steel);
  } else if (spec.kind === 'accent') {
    face(parent, [[-.44, .66, nose], [.44, .66, nose], [.52, .43, nose + .012], [-.52, .43, nose + .012]], trim);
    for (const y of [.48, .56, .63]) segment(parent, [-.42, y, nose + .023], [.42, y, nose + .023], .009, steel);
    ovalBadge(parent, nose + .028, .76);
  } else if (spec.kind === 'malibu') {
    face(parent, [[-.48, .83, nose], [.48, .83, nose], [.44, .67, nose + .009], [-.44, .67, nose + .009]], trim);
    face(parent, [[-.44, .62, nose], [.44, .62, nose], [.35, .41, nose + .01], [-.35, .41, nose + .01]], trim);
    segment(parent, [-.44, .655, nose + .023], [.44, .655, nose + .023], .017, paint);
    const gold = new THREE.MeshStandardMaterial({ color: 0xd6ad55, metalness: .6, roughness: .3 });
    face(parent, [[-.09, .69, nose + .036], [-.037, .69, nose + .036], [-.037, .715, nose + .036], [.072, .715, nose + .036], [.09, .75, nose + .036], [.037, .75, nose + .036], [.037, .775, nose + .036], [-.072, .775, nose + .036]], gold);
    for (const side of [-1, 1]) for (const y of [.68, .75]) box(parent, [.12, .037, .058], [side * w * .33, y, rear - .024], taillamp);
  } else {
    // Model Y's smooth, closed nose and panoramic fastback distinguish the EV.
    segment(parent, [-.055, .82, nose + .024], [.055, .82, nose + .024], .009, steel);
    segment(parent, [0, .82, nose + .024], [0, .76, nose + .024], .009, steel);
    box(parent, [w * .49, .038, .027], [0, .29, nose + .021], trim);
  }
  plates(parent, spec);
}

function vehicle(spec) {
  const group = new THREE.Group(); group.name = spec.id;
  group.position.set(spec.x, -.075, 22.45);
  group.userData = { model: spec.model, plate: spec.plate, parked: true };
  const paint = new THREE.MeshPhysicalMaterial({ color: spec.color, metalness: .48, roughness: .27, clearcoat: .8, clearcoatRoughness: .18 });
  const l = spec.length / 2, w = spec.width, suv = spec.kind === 'glc';
  const shoulder = suv ? 1 : spec.kind === 'tesla' ? .92 : .87;
  const body = shell(group, [[-l, w * .83, shoulder - .09, .31], [-l + .27, w * .97, shoulder + .01, .27], [-l + .87, w, shoulder + .015, .27], [.75, w, shoulder, .27], [l - .48, w * .98, shoulder - .005, .29], [l, w * .82, shoulder - .06, .34]], paint); body.name = 'body';
  // Hood creases, bumper seams, and door furniture stay subtle at site scale.
  for (const side of [-1, 1]) {
    line(group, [[side * w * .22, shoulder + .023, .95], [side * w * .27, shoulder + .017, l - .48], [side * w * .22, shoulder - .03, l - .13]], paint);
    line(group, [[side * w * .47, .59, -l + .14], [side * w * .50, .68, -.8], [side * w * .50, .67, .75], [side * w * .47, .61, l - .16]], steel);
  }
  wheels(group, spec, paint); cabin(group, spec, paint); frontRear(group, spec, paint);
  return { group, id: spec.id, model: spec.model, plate: spec.plate, dimensions: { length: spec.length, width: spec.width, height: spec.height }, position: group.position.toArray() };
}

export function parkingCars(world) {
  const group = new THREE.Group(); group.name = 'forecourt-parking';
  const marking = new THREE.MeshStandardMaterial({ color: 0xcdd1c9, roughness: .95, polygonOffset: true, polygonOffsetFactor: -1 });
  for (const spec of VEHICLES) {
    for (const side of [-1, 1]) box(group, [.055, .008, 5.3], [spec.x + side * 1.35, -.064, 22.23], marking);
    box(group, [2.75, .008, .055], [spec.x, -.064, 24.855], marking);
  }
  const cars = VEHICLES.map(vehicle);
  cars.forEach(car => group.add(car.group));
  world.add(group);
  return { group, cars };
}
