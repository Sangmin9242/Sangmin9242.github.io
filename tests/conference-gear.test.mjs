import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { boardingSequence } from '../boarding-sequence.js';
import { trainBoarding } from '../train-boarding.js';
import { boardingAvatar } from '../boarding-avatar.js';
import { airplane } from '../airplane.js';
import { ktxTrain } from '../ktx-train.js';

const sceneData={dataset:{}};
globalThis.document={querySelector:()=>sceneData};
function box(parent,size,position,color,options={}){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshStandardMaterial({color,...options}));
  mesh.position.set(...position);parent.add(mesh);return mesh;
}
function beam(parent,a,b,radius,color){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,start.distanceTo(end),8),new THREE.MeshStandardMaterial({color}));
  mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());parent.add(mesh);return mesh;
}
function fixture(){
  const world=new THREE.Group(),researcher=new THREE.Group(),avatar=boardingAvatar();researcher.add(avatar);world.add(researcher);researcher.position.set(-7,0,5);
  const plane=airplane({boarding:true});plane.scale.setScalar(4.4);plane.position.set(-44,-.06,-3);world.add(plane);
  const air=boardingSequence({world,researcher,avatar,plane,box,beam});
  const train=ktxTrain();train.scale.setScalar(1.5);train.position.set(-23,.015,-3);world.add(train);
  const rail=trainBoarding({world,avatar,train,luggage:air.luggage,box});
  const people=world.children.filter(n=>n.userData.sportRig);
  return {world,avatar,air,rail,plane,train,airPerson:people[0],railPerson:people[1],gear:air.luggage};
}
function assertOffice(f){
  const poster=f.gear.getObjectByName('rolled-academic-poster'),bag=f.gear.getObjectByName('conference-laptop-bag');
  assert.ok(poster,'office displays a rolled academic poster');assert.ok(bag,'office displays the laptop bag');
  assert.equal(f.gear.parent,f.world);assert.equal(poster.parent,f.gear);assert.equal(bag.parent,f.gear);
  assert.deepEqual(f.gear.position.toArray(),[-5.8,0,7.2]);assert.equal(f.avatar.visible,true);
  assert.equal(f.airPerson.visible,false);assert.equal(f.railPerson.visible,false);
  assert.ok(bag.getObjectByName('closed-laptop'),'laptop stays inside the professional bag');
  const bagBox=new THREE.Box3().setFromObject(bag.getObjectByName('laptop-bag-body'));
  assert.ok(bagBox.containsBox(new THREE.Box3().setFromObject(bag.getObjectByName('closed-laptop'))),'bag encloses the laptop');
}
function assertCarried(f,person){
  const {poster,laptopBag}=f.gear.userData.conferenceGear;
  assert.equal(person.userData.towing,false,'carrying does not activate suitcase towing');
  assert.equal(person.userData.carryingConferenceGear,true);
  for(const [part,side] of [[poster,-1],[laptopBag,1]]){
    const rig=person.userData.sportRig.arms.find(a=>a.side===side);
    assert.equal(part.parent,rig.elbow,'prop follows the forearm rig');
    assert.ok(rig.elbow.rotation.x<-.5,'elbow bends comfortably while carrying');
    f.world.updateMatrixWorld(true);
    const grip=rig.elbow.localToWorld(new THREE.Vector3(0,-.28,0));
    assert.ok(part.getWorldPosition(new THREE.Vector3()).distanceTo(grip)<.04,'hand grips the carried object');
    const localBox=new THREE.Box3();
    part.traverse(mesh=>{if(!mesh.isMesh)return;const positions=mesh.geometry.attributes.position;for(let i=0;i<positions.count;i++)localBox.expandByPoint(person.worldToLocal(mesh.localToWorld(new THREE.Vector3().fromBufferAttribute(positions,i))));});
    assert.ok(localBox.min.y>.35,'equipment clears ground and stair treads');
    assert.ok(side<0?localBox.max.x<-.20:localBox.min.x>.20,'carried equipment clears the walking legs '+side+' '+localBox.min.x+'..'+localBox.max.x);
    assert.ok(localBox.min.z>-.2,'no trailing suitcase behind the legs');
  }
}

test('office equipment is a rolled poster and enclosed laptop without suitcase wheels',()=>{
  const f=fixture();assertOffice(f);
  const props=[];f.gear.traverse(n=>{if(n.isMesh)props.push(n);});
  assert.ok(props.length<30,'equipment uses modest procedural geometry');
  assert.equal(props.some(n=>/wheel|suitcase|telescop/i.test(n.name)),false);
});
for(const route of ['air','rail'])test(`${route}: poster and laptop bag follow hands during walking, stairs and doorway entry`,()=>{
  const f=fixture(),sequence=f[route],person=f[`${route}Person`];sequence.start();
  for(const t of [0,.8,2]){sequence.animate(t);assert.ok(f.gear.getObjectByName('rolled-academic-poster')?.parent===f.gear,'equipment waits in the office until pickup');}
  for(const t of [2.2,3,4.1,6,8.5,9.2,10.2,10.8,...(route==='air'?[11.2]:[12.4,13.2])]){sequence.animate(t);assertCarried(f,person);}
  const doorwayWidth=route==='air'? .31*4.4:.66*1.5;
  const {poster,laptopBag}=f.gear.userData.conferenceGear;
  const width=new THREE.Box3();
  for(const part of [poster,laptopBag])part.traverse(mesh=>{if(mesh.isMesh){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++)width.expandByPoint(person.worldToLocal(mesh.localToWorld(new THREE.Vector3().fromBufferAttribute(p,i))));}});
  assert.ok(width.min.x>-doorwayWidth/2+.01 && width.max.x<doorwayWidth/2-.01,'both carried props clear the existing centered door jambs');
  sequence.animate(sequence.duration);assert.equal(person.visible,false);
});
test('skipped, interrupted and repeated plane/train routes return equipment to the office',()=>{
  const f=fixture();
  for(const [route,stop] of [['air',5],['rail',10.7],['air',15.8],['rail',15],['air',2.3],['rail',3.2]]){
    f.air.reset();f.rail.reset();assertOffice(f);f[route].start();f[route].animate(stop);
    assertCarried(f,f[`${route}Person`]);
    f.air.reset();f.rail.reset();assertOffice(f);
  }
});
test('carrying changes do not affect construction walking or seated driver poses',()=>{
  const worker=boardingAvatar({worker:true}),driver=boardingAvatar({worker:true});
  worker.userData.pose(1,true);driver.userData.seated();
  const snapshot=person=>person.userData.sportRig.arms.map(({arm,elbow})=>[arm.rotation.x,arm.rotation.z,elbow.rotation.x]);
  const before=[snapshot(worker),snapshot(driver)],f=fixture();f.air.start();f.air.animate(5);f.rail.start();f.rail.animate(9);f.air.reset();f.rail.reset();
  assert.deepEqual([snapshot(worker),snapshot(driver)],before);
});
