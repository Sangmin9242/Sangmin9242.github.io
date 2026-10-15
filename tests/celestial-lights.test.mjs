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
