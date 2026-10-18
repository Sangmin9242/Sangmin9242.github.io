import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {createWeatherField} from '../weather-field.js';

function fixture(reducedMotion=false,shelters=[]){
  const world=new THREE.Group(),camera=new THREE.PerspectiveCamera(37,1440/900,.1,1800);
  let seed=321;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  const field=createWeatherField({world,camera,reducedMotion,random,shelters});
  return {world,camera,field};
}
function coverage(field,camera,object=field.rain){
  camera.updateMatrixWorld();const cells=new Set(),point=new THREE.Vector3(),positions=object.geometry.attributes.position;
  for(let i=0;i<positions.count;i+=object.isLineSegments?2:1){point.fromBufferAttribute(positions,i).project(camera);if(Math.abs(point.x)<1&&Math.abs(point.y)<1&&Math.abs(point.z)<1)cells.add(Math.min(3,Math.floor((point.x+1)*2))+','+Math.min(2,Math.floor((point.y+1)*1.5)));}
  return cells.size;
}
// A local box cannot populate these independently translated, rotated and zoomed frustums.
test('rain covers the full view after pans, wide zoom, upward rotation and view offsets',()=>{
  const {camera,field}=fixture();field.setWeather({kind:'rain',code:63,cover:100,day:true});
  for(const pose of [
    [[15,15,22],[0,3,0],1440/900],
    [[-58,8,42],[-45,2,18],390/844],
    [[90,85,110],[-12,0,0],1440/900],
    [[-8,2.5,8],[-8,2,5],1440/900],
    [[18,30,-45],[20,80,-10],1440/900],
    [[0,5,0],[0,90,0],390/844]
  ]){
    camera.aspect=pose[2];camera.updateProjectionMatrix();camera.position.fromArray(pose[0]);camera.lookAt(new THREE.Vector3(...pose[1]));
    camera.setViewOffset(1440,900,-201,0,1440,900);field.update(10);
    assert.equal(coverage(field,camera),12,JSON.stringify(pose));
  }
  assert.ok(field.rain.geometry.attributes.position.count<=6000,'bounded draw budget');
  assert.equal(field.rain.material.depthTest,true);
});

test('rain streaks stay below twenty screen pixels in close, wide, sky and driver views',()=>{
  const {camera,field}=fixture();field.setWeather({kind:'rain',code:63,cover:100,day:true});
  const head=new THREE.Vector3(),tail=new THREE.Vector3();
  for(const [position,target,fov] of [
    [[-7.5,2.5,8.5],[-7.5,1.5,4],37],
    [[90,85,110],[-12,0,0],37],
    [[18,30,-45],[20,80,-10],37],
    [[-25,1.3,18],[-25,1.3,2],72]
  ]){
    camera.fov=fov;camera.updateProjectionMatrix();camera.position.fromArray(position);camera.lookAt(new THREE.Vector3(...target));field.update(2);
    const positions=field.rain.geometry.attributes.position;let checked=0;
    for(let i=0;i<positions.count;i+=2){
      head.fromBufferAttribute(positions,i).project(camera);tail.fromBufferAttribute(positions,i+1).project(camera);
      if(Math.abs(head.x)>1||Math.abs(head.y)>1||Math.abs(head.z)>1)continue;
      const pixels=Math.hypot((head.x-tail.x)*720,(head.y-tail.y)*450);
      assert.ok(pixels<=20,`streak ${pixels.toFixed(2)}px at ${position}`);checked++;
    }
    assert.ok(checked>1200);
  }
});

test('falling particles retain world positions during small camera movement and pause without a time jump',()=>{
  const {camera,world,field}=fixture();camera.position.set(12,12,20);camera.lookAt(0,3,0);
  field.setWeather({kind:'rain',code:63,cover:100,day:true});field.update(1);
  const before=field.rain.geometry.attributes.position.array.slice();camera.position.x+=.01;field.update(1.02);
  const after=field.rain.geometry.attributes.position.array;let falling=0;
  for(let i=0;i<after.length;i+=6)if(Math.abs(after[i]-before[i]-.018)<.001&&Math.abs(after[i+1]-before[i+1]+.28)<.001)falling++;
  assert.ok(falling>before.length/6*.8,'most existing particles follow world wind and gravity');
  const paused=after.slice();world.visible=false;field.update(50);assert.deepEqual(after,paused);
  world.visible=true;field.update(90);assert.deepEqual(after,paused,'resume does not jump by elapsed hidden time');
});

test('snow covers the wide scene and descends in world space',()=>{
  const {camera,field}=fixture();camera.position.set(95,80,110);camera.lookAt(-15,2,0);
  field.setWeather({kind:'snow',code:75,cover:100,day:true});field.update(1);
  assert.equal(coverage(field,camera,field.snow),12);
  const before=field.snow.geometry.attributes.position.array.slice();field.update(1.02);const after=field.snow.geometry.attributes.position.array;
  let falling=0;for(let i=0;i<after.length;i+=3)if(Math.abs(after[i+1]-before[i+1]+.018)<.0001)falling++;
  assert.ok(falling>before.length/3*.8);
  assert.equal(field.snow.material.depthTest,true);
});

test('snow and clear transitions switch actual geometry and reduced motion stays still',()=>{
  const {camera,field}=fixture(true);camera.position.set(10,10,20);camera.lookAt(0,2,0);
  field.setWeather({kind:'snow',code:75,cover:100,day:false});field.update(1);
  assert.equal(field.snow.visible,true);assert.equal(field.rain.visible,false);
  const before=field.snow.geometry.attributes.position.array.slice();field.update(2);assert.deepEqual(field.snow.geometry.attributes.position.array,before);
  field.setWeather({kind:'clear',code:0,cover:0,day:true});assert.equal(field.snow.visible,false);assert.equal(field.clouds.visible,false);
});

test('cutaway interiors stay dry even when their roofs are omitted for viewing',()=>{
  const shelter=new THREE.Box3(new THREE.Vector3(-10,0,3),new THREE.Vector3(-5,3,7));
  const {camera,field}=fixture(false,[shelter]);camera.position.set(-7.5,2.5,8.5);camera.lookAt(-7.5,1.5,4);
  field.setWeather({kind:'rain',code:63,cover:100,day:true});
  const point=new THREE.Vector3();
  for(let frame=0;frame<6;frame++){
    field.update(frame*.05);const positions=field.rain.geometry.attributes.position;
    for(let i=0;i<positions.count;i+=2){point.fromBufferAttribute(positions,i);assert.equal(shelter.containsPoint(point),false,'no drop starts beneath the office roof');}
  }
});

test('one sky dome surrounds every camera direction and distinguishes broken clouds from overcast',()=>{
  const {camera,field}=fixture();camera.position.set(-65,82,94);camera.lookAt(0,2,0);
  field.setWeather({kind:'clear',code:1,cover:25,day:true});field.update(1);
  assert.equal(field.clouds.visible,true);const partial=field.clouds.material.uniforms.cover.value;
  field.setWeather({kind:'cloudy',code:3,cover:100,day:true});assert.ok(field.clouds.material.uniforms.cover.value>partial+.4);
  const raycaster=new THREE.Raycaster();field.clouds.updateMatrixWorld();
  for(let i=0;i<16;i++){const angle=i*Math.PI/8;raycaster.set(camera.position,new THREE.Vector3(Math.cos(angle),i%2?.8:.02,Math.sin(angle)).normalize());assert.ok(raycaster.intersectObject(field.clouds).length>0,'clouds cover azimuth '+i);}
  raycaster.set(camera.position,new THREE.Vector3(0,1,0));assert.ok(raycaster.intersectObject(field.clouds).length>0,'zenith covered');
  const time=field.clouds.material.uniforms.time.value;field.update(1.05);assert.ok(field.clouds.material.uniforms.time.value>time);
  assert.ok(field.clouds.geometry.attributes.position.count<2000,'one bounded sky draw');
});
