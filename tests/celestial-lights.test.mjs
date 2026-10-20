import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {celestialSky} from '../celestial-sky.js';

const nodes=new Map();
globalThis.document={querySelector(selector){if(!nodes.has(selector))nodes.set(selector,{dataset:{},textContent:''});return nodes.get(selector);},createElement(){return {width:0,height:0,toDataURL:()=>'',getContext(){return {createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){},createRadialGradient:()=>({addColorStop(){}}),fillRect(){}};}};}};
function fixture(){const world=new THREE.Group(),material=new THREE.MeshStandardMaterial();const sky=celestialSky({world,getLanguage:()=> 'ko',box(parent,size,position){const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.position.set(...position);parent.add(mesh);return mesh;}});const spots=[];world.traverse(node=>{if(node.isSpotLight)spots.push(node);});return {world,sky,spots};}
const daytime={now:new Date('2026-10-15T04:00:00Z'),day:true,azimuth:180,altitude:45};
const nighttime={...daytime,now:new Date('2026-10-15T12:00:00Z'),day:false,altitude:-20};

test('daytime zero lights do not participate in the renderer active light list',()=>{
 const {sky,spots}=fixture();assert.equal(spots.length,37);sky.update(daytime);
 assert.ok(spots.every(light=>light.intensity===0));
 assert.equal(spots.filter(light=>light.visible).length,0);
});

test('all night lighting and fixture geometry remain intact through a day-night-day cycle',()=>{
 const {world,sky,spots}=fixture();const geometry=[];world.traverse(node=>{if(node.isMesh)geometry.push({node,geometry:node.geometry,position:node.position.clone()});});
 sky.update(nighttime);const state=spots.map(light=>({light,intensity:light.intensity,position:light.position.clone(),target:light.target.position.clone(),color:light.color.getHex()}));
 assert.ok(state.every(item=>item.intensity>0&&item.light.visible));assert.deepEqual([...new Set(state.map(item=>item.intensity))].sort((a,b)=>a-b),[190,300,650,1300]);
 sky.update(daytime);assert.equal(spots.filter(light=>light.visible).length,0);
 sky.update(nighttime);for(const item of state){assert.equal(item.light.intensity,item.intensity);assert.ok(item.light.visible);assert.deepEqual(item.light.position,item.position);assert.deepEqual(item.light.target.position,item.target);assert.equal(item.light.color.getHex(),item.color);}
 for(const item of geometry){assert.equal(item.node.geometry,item.geometry);assert.ok(item.node.parent);}
 assert.equal(nodes.get('#scene').dataset.streetLights,'29');assert.equal(nodes.get('#scene').dataset.workLights,'4');assert.equal(nodes.get('#scene').dataset.runwayFloodLights,'2');
});

test('all 91 runway fixtures keep their positions, colours and night brightness in bounded draw batches',()=>{
 const {world,sky}=fixture(),runway=world.getObjectByName('Runway inset lighting');
 assert.ok(runway,'runway lamps should use a shared rendering group');
 const meshes=[];runway.traverse(n=>{if(n.isMesh)meshes.push(n);});
 assert.ok(meshes.length<=8,'fixed fixtures should no longer issue hundreds of independent draws');
 const rim=runway.getObjectByName('Runway fixture rims'),pool=runway.getObjectByName('Runway light pools'),glow=runway.getObjectByName('Runway light halos');
 assert.equal(rim.count,91);assert.equal(pool.count,91);assert.equal(glow.count,91);
 const position=new THREE.Vector3(),matrix=new THREE.Matrix4();rim.getMatrixAt(0,matrix);position.setFromMatrixPosition(matrix);
 assert.ok(position.distanceTo(new THREE.Vector3(-51.65,-.085,-32))<1e-5);
 rim.getMatrixAt(90,matrix);position.setFromMatrixPosition(matrix);
 assert.ok(position.distanceTo(new THREE.Vector3(-38,-.085,34.6))<1e-5);
 const lenses=meshes.filter(m=>m.name==='Runway fixture lenses');assert.equal(lenses.reduce((n,m)=>n+m.count,0),91);
 assert.deepEqual(lenses.map(m=>m.material.emissive.getHex()).sort((a,b)=>a-b),[0xffe9b9,0xe9f4ff,0x70e6ae,0xff6c60].sort((a,b)=>a-b));
 sky.update(nighttime);assert.ok(pool.visible&&glow.visible);assert.ok(lenses.every(m=>m.material.emissiveIntensity===14));
 assert.equal(pool.material.opacity,.62);assert.equal(glow.material.blending,THREE.AdditiveBlending);
 sky.update(daytime);assert.ok(!pool.visible&&!glow.visible);assert.ok(lenses.every(m=>m.material.emissiveIntensity===0));
 assert.equal(nodes.get('#scene').dataset.runwayFixtures,'91');
});
