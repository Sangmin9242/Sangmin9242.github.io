import * as THREE from './vendor/three.module.js';
import {batchStaticScene} from './scene-batching.js';

/** Procedural KTX-inspired train. +Z is forward; setDoor(0) closes, 1 opens. */
export function ktxTrain({ cars = 3 } = {}) {
  const train = new THREE.Group();
  train.name = 'KTX express';
  const paint = new THREE.MeshStandardMaterial({ color: 0xf0f4f5, roughness: .36, metalness: .25 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x075794, roughness: .35, metalness: .3 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x132d42, roughness: .16, metalness: .65 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x596773, roughness: .5, metalness: .7 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x162029, roughness: .8 });
  const light = new THREE.MeshStandardMaterial({ color: 0xfff3cf, emissive: 0xffe2a3, emissiveIntensity: 1.4 });
  const box = (parent, w, h, d, x, y, z, material = paint) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;mesh.userData.staticSite=true;
    parent.add(mesh); return mesh;
  };
  const rod = (parent, a, b, radius = .025, material = steel) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, start.distanceTo(end), 8), material);
    mesh.position.copy(start).add(end).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    parent.add(mesh); return mesh;
  };
  // Lofted shells have a rounded shoulder and a low, tapering aerodynamic nose.
  const shell = (parent, sections, material) => {
    const profile = [[-.55,.55],[-.55,1.65],[-.48,1.9],[-.32,2.04],[.32,2.04],[.48,1.9],[.55,1.65],[.55,.55]];
    const vertices = [], indices = [];
    sections.forEach(([z, width, height, base]) => profile.forEach(([x,y]) => vertices.push(x * width, base + (y - .55) * height, z)));
    for (let s = 0; s < sections.length - 1; s++) for (let p = 0; p < 7; p++) {
      const a = s * 8 + p, b = a + 8; indices.push(a,b,a+1,b,b+1,a+1);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3)); geo.setIndex(indices); geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo,material); mesh.material.side = THREE.DoubleSide; mesh.castShadow = true; parent.add(mesh); return mesh;
  };
  const doorLeaves = [];
  const count = Math.max(1, Math.min(8, Math.floor(cars) || 3));
  for (let c = 0; c < count; c++) {
    const car = new THREE.Group(); car.position.z = -c * 6.35; train.add(car);
    const lead = c === 0, front = lead ? 2.2 : 3;
    box(car,1.04,.07,front+3,0,.515,(front-3)/2,steel);
    box(car,.9,.18,4.6,0,.35,-.25,rubber);
    // A separate upper roof leaves the east entrance completely free below y=2.
    shell(car,[[-3,1,.10,1.891],[front,1,.10,1.891]],paint);
    for (const side of [-1,1]) {
      if (lead && side === 1) {
        // Entrance aperture: z .47..1.13, y .55..2.0. No hidden body box.
        box(car,.045,1.45,3.47,side*.55,1.275,-1.265);
        box(car,.045,1.45,front-1.13,side*.55,1.275,(front+1.13)/2);
        for (const sign of [-1,1]) {
          const leaf = new THREE.Group(); leaf.position.set(.579,0,.8+sign*.165); car.add(leaf);
          box(leaf,.035,1.45,.33,0,1.275,0);
          box(leaf,.014,.44,.23,.023,1.59,0,glass);
          box(leaf,.018,.045,.26,.023,.96,0,blue);
          doorLeaves.push({ leaf, origin: leaf.position.z, sign });
        }
        box(car,.045,.035,.72,.575,2.01,.8,steel);
        box(car,.10,.045,.66,.56,.55,.8,steel);
      } else box(car,.045,1.45,front+3,side*.55,1.275,(front-3)/2);
      for (let z=-2.55;z<front-.35;z+=.7) {
        if (lead && side===1 && z+.26>.47 && z-.26<1.13) continue;
        box(car,.015,.34,.5,side*.577,1.57,z,glass);
        box(car,.017,.065,.53,side*.579,1.32,z,blue);
      }
      // Thin blue sill lines follow each wall segment, including the door aperture.
      box(car,.017,.11,front+3,side*.577,.67,(front-3)/2,blue);
    }
    // Remove the continuous east sill from the doorway: use two matching segments.
    if (lead) {
      const sill = car.children[car.children.length-1]; car.remove(sill);
      box(car,.017,.11,3.47,.577,.67,-1.265,blue);
      box(car,.017,.11,front-1.13,.577,.67,(front+1.13)/2,blue);
    }
    if (lead) box(car,.018,1.42,.66,-.51,1.275,.8,glass);
    box(car,1.08,1.4,.04,0,1.25,-3);
    if (!lead) box(car,1.08,1.4,.04,0,1.25,3);
    if (lead) {
      shell(car,[[2.2,1,1,.55],[2.65,.96,.91,.55],[3.1,.83,.68,.55],[3.6,.54,.34,.55],[4.02,.18,.12,.55]],paint);
      const windshield = box(car,.76,.29,.055,0,1.69,2.85,glass); windshield.rotation.x=-.55;
      for (const side of [-1,1]) {
        const streak = box(car,.016,.13,1.36,side*.40,.78,3.02,blue); streak.rotation.y=side*-.19;
        box(car,.15,.055,.075,side*.22,.77,3.73,light);
      }
      box(car,.20,.045,.07,0,.60,4.02,blue);
    }
    for (const z of [-2.05,lead?1.55:2.05]) {
      box(car,.84,.16,.75,0,.29,z,steel);
      for (const axleZ of [z-.25,z+.25]) for (const x of [-.46,.46]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.21,.21,.105,16),rubber);
        wheel.rotation.z=Math.PI/2; wheel.position.set(x,.21,axleZ); car.add(wheel);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.111,12),steel);
        hub.rotation.z=Math.PI/2; hub.position.copy(wheel.position); car.add(hub);
      }
    }
    if(c<count-1) {
      box(car,.55,1.1,.27,0,1.12,-3.17,rubber);
      box(car,.22,.1,.46,0,.42,-3.2,steel);
    }
    if(c===Math.min(1,count-1)) {
      box(car,.46,.10,.6,0,2.08,-.7,steel);
      rod(car,[-.19,2.14,-1],[0,2.51,-.7]); rod(car,[.19,2.14,-1],[0,2.51,-.7]);
      rod(car,[0,2.51,-.7],[-.19,2.75,-.95]); rod(car,[0,2.51,-.7],[.19,2.75,-.95]);
      box(car,.70,.035,.10,0,2.76,-.95,steel);
    }
  }
  let doorOpen=0;
  train.userData.entry = new THREE.Vector3(.56,.55,.8);
  train.userData.setDoor = (progress) => {
    doorOpen = THREE.MathUtils.clamp(Number(progress)||0,0,1);
    doorLeaves.forEach(({leaf,origin,sign}) => { leaf.position.z=origin+sign*.36*doorOpen; leaf.position.x=.579+.035*doorOpen; });
  };
  Object.defineProperty(train.userData,'doorOpen',{ enumerable:true, get:()=>doorOpen });
  train.userData.carCount=count;
  train.userData.doorDimensions={width:.66,height:1.45,floor:.55};
  // Door groups keep their identity and transforms; only fixed sibling details merge.
  batchStaticScene(train,{spatial:false});
  return train;
}
