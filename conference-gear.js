import * as THREE from './vendor/three.module.js';

// One shared set waits outside the office and travels on either boarding rig.
export function conferenceGear(){
  const gear=new THREE.Group();gear.name='conference-equipment';
  const paper=new THREE.MeshStandardMaterial({color:0xf1eee4,roughness:.9});
  const band=new THREE.MeshStandardMaterial({color:0x54778b,roughness:.7});
  const fabric=new THREE.MeshStandardMaterial({color:0x263946,roughness:.85});
  const trim=new THREE.MeshStandardMaterial({color:0x536672,roughness:.65});
  const silver=new THREE.MeshStandardMaterial({color:0xaeb9bd,metalness:.65,roughness:.35});
  const mesh=(parent,geometry,material,position,name)=>{const part=new THREE.Mesh(geometry,material);part.position.set(...position);part.name=name;part.castShadow=true;parent.add(part);return part;};
  const block=(parent,size,position,material,name)=>mesh(parent,new THREE.BoxGeometry(...size),material,position,name);
  const poster=new THREE.Group();poster.name='rolled-academic-poster';gear.add(poster);
  mesh(poster,new THREE.CylinderGeometry(.048,.048,.78,16),paper,[0,.15,0],'rolled-white-poster');
  for(const y of [-.10,.40])mesh(poster,new THREE.CylinderGeometry(.051,.051,.025,16),band,[0,y,0],'poster-retaining-band');
  for(const y of [-.242,.542]){const edge=mesh(poster,new THREE.TorusGeometry(.035,.004,6,16),paper,[0,y,0],'rolled-paper-edge');edge.rotation.x=Math.PI/2;}
  const laptopBag=new THREE.Group();laptopBag.name='conference-laptop-bag';gear.add(laptopBag);
  const caseBody=new THREE.Group();caseBody.name='laptop-bag-body';laptopBag.add(caseBody);
  block(caseBody,[.28,.29,.014],[.045,-.225,-.046],fabric,'padded-case-back');
  block(caseBody,[.28,.235,.014],[.045,-.2525,.046],fabric,'padded-case-front');
  for(const x of [-.089,.179])block(caseBody,[.012,.29,.105],[x,-.225,0],fabric,'padded-case-side');
  block(laptopBag,[.25,.25,.018],[.045,-.22,.027],silver,'closed-laptop');
  block(laptopBag,[.263,.009,.109],[.045,-.092,0],trim,'closed-bag-zipper');
  block(laptopBag,[.20,.13,.009],[.045,-.245,.057],trim,'laptop-bag-pocket');
  for(const z of [-.027,.027]){
    for(const x of [-.02,.11])block(laptopBag,[.014,.067,.014],[x,-.045,z],fabric,'bag-handle-upright');
    block(laptopBag,[.144,.014,.014],[.045,-.012,z],fabric,'bag-hand-grip');
  }
  // A discreet computer badge identifies the case while the laptop stays enclosed.
  block(laptopBag,[.064,.039,.004],[.045,-.232,.063],silver,'laptop-bag-badge');
  block(laptopBag,[.074,.005,.004],[.045,-.255,.063],silver,'laptop-bag-badge-base');
  gear.userData.conferenceGear={poster,laptopBag,carrier:null};
  return gear;
}

export function carryConferenceGear(gear,person){
  const equipment=gear.userData.conferenceGear;
  if(equipment.carrier&&equipment.carrier!==person)equipment.carrier.userData.carryingConferenceGear=false;
  equipment.carrier=person;person.userData.towing=false;person.userData.carryingConferenceGear=true;
  for(const {arm,elbow,side} of person.userData.sportRig.arms){
    // Relaxed shoulders and bent elbows hold both grips ahead of the walking legs.
    arm.rotation.set(-.12,0,side*.12);elbow.rotation.x=-.82;
    const part=side<0?equipment.poster:equipment.laptopBag;
    if(part.parent!==elbow)elbow.add(part);
    part.position.set(0,-.28,0);part.scale.setScalar(1);
    // Keep the poster upright and the case level as the arm follows the gait.
    part.quaternion.copy(arm.quaternion).multiply(elbow.quaternion).invert();
  }
}

export function parkConferenceGear(gear,world,pickup){
  const equipment=gear.userData.conferenceGear;
  if(equipment.carrier){equipment.carrier.userData.carryingConferenceGear=false;equipment.carrier.userData.towing=false;}
  equipment.carrier=null;world.add(gear);gear.position.copy(pickup);gear.rotation.set(0,0,0);gear.scale.setScalar(1);
  for(const [part,position] of [[equipment.poster,[-.18,.26,0]],[equipment.laptopBag,[.16,.38,0]]]){
    gear.add(part);part.position.set(...position);part.rotation.set(0,0,0);part.scale.setScalar(1);
  }
}
