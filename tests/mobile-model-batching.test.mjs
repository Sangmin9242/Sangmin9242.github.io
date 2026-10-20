import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {ktxTrain} from '../ktx-train.js';
import {airplane} from '../airplane.js';
import {boardingAvatar} from '../boarding-avatar.js';
import {sportsAvatar} from '../sports-avatar.js';

function counts(root){let meshes=0,triangles=0;root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});return {meshes,triangles};}

test('train details use fewer draws without removing triangles or sliding door motion',()=>{
  const train=ktxTrain(),before=counts(train);
  assert.equal(before.triangles,4594);
  assert.ok(before.meshes<80,`train still has ${before.meshes} separate meshes`);
  const leaves=train.children.flatMap(c=>c.children).filter(c=>c.isGroup&&c.children.length===3);
  assert.equal(leaves.length,2,'both independent sliding door leaves survive');
  const closed=leaves.map(l=>l.position.clone());train.userData.setDoor(1);
  assert.ok(leaves.every((l,i)=>Math.abs(l.position.z-closed[i].z)>.35));
  train.userData.setDoor(0);leaves.forEach((l,i)=>assert.ok(l.position.distanceTo(closed[i])<1e-8));
});

test('aircraft keeps the aperture shell and retracting gear while batching fixed details',()=>{
  const plane=airplane({boarding:true}),shell=plane.userData.fuselage,result=counts(plane);
  assert.equal(result.triangles,63796);assert.ok(result.meshes<22,`plane has ${result.meshes} meshes`);
  assert.equal(shell.parent,plane,'the real aperture shell remains independently addressable');
  plane.userData.setGear(1);assert.equal(plane.userData.gearVisible,0);
  plane.userData.setGear(0);assert.equal(plane.userData.gearVisible,3);
  assert.deepEqual(counts(plane),result);
});

test('student keeps every triangle and independently posed joints with fewer fixed mesh leaves',()=>{
  const student=boardingAvatar(),result=counts(student);
  assert.equal(result.triangles,11918);assert.ok(result.meshes<30,`student has ${result.meshes} meshes`);
  const {arms,legs}=student.userData.sportRig;student.userData.pose(.2,true);
  assert.notEqual(arms[0].arm.rotation.x,arms[1].arm.rotation.x);
  assert.notEqual(legs[0].leg.rotation.x,legs[1].leg.rotation.x);
  student.userData.seated();assert.equal(legs[0].leg.rotation.x,-Math.PI/2);
});

test('sports kit switches and hand grip transforms survive fixed-detail batching',()=>{
  const actor=sportsAvatar(),result=counts(actor);
  assert.equal(result.triangles,36092);assert.ok(result.meshes<100,`sports avatar has ${result.meshes} meshes`);
  const parts=[];actor.traverse(o=>{if(o.name==='football-jersey'||o.name==='bowling-polo')parts.push(o);});
  actor.userData.setKit('bowling');assert.equal(parts.find(o=>o.name==='football-jersey').visible,false);
  assert.equal(parts.find(o=>o.name==='bowling-polo').visible,true);
  for(const {elbow} of actor.userData.sportRig.arms)assert.ok(elbow.getObjectByName('hand'));
  actor.userData.pose(1,true,.5);assert.ok(actor.userData.sportRig.upper.rotation.x>0);
});
