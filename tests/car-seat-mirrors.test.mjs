import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {parkingCars} from '../parking-cars.js';
import {createCarCockpit} from '../car-cockpit.js';
import {createCarSideMirrors} from '../car-side-mirrors.js';

// Only canvas text drawing needs a browser; all model geometry remains real.
globalThis.document={createElement(){return {width:0,height:0,getContext(){return new Proxy({}, {get:(o,k)=>o[k]??(k==='createLinearGradient'?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});}};}};
const fleet=parkingCars(new THREE.Group()).cars;

test('Korean driver seat, entry, door and wheel are on the left when looking forward',()=>{
  for(const record of fleet){
    const car=record.group,seat=car.userData.driverSeat;
    const camera=new THREE.PerspectiveCamera();camera.position.copy(seat);camera.lookAt(seat.clone().add(new THREE.Vector3(0,0,1)));camera.updateMatrixWorld();
    const left=new THREE.Vector3(-1,0,0).applyQuaternion(camera.quaternion);
    assert.ok(seat.dot(left)>0,`${record.id}: driver seat is on driver's left`);
    assert.ok(car.userData.driverEntry.x>record.dimensions.width/2,`${record.id}: entry at left door`);
    assert.ok(car.userData.driverDoor.position.x>0,`${record.id}: left door hinge`);
    const leftMirror=[];car.traverse(n=>{if(n.userData.sideMirror===1)leftMirror.push(n);});
    assert.equal(leftMirror[0]?.parent,car.userData.driverDoor,`${record.id}: left mirror moves with driver door`);
    const rightMirror=[];car.traverse(n=>{if(n.userData.sideMirror===-1)rightMirror.push(n);});
    assert.equal(rightMirror[0]?.parent,car,`${record.id}: passenger mirror remains on body`);
    const sidePanels=car.children.filter(n=>n.name==='body-side');
    const atDoor=new THREE.Raycaster(car.localToWorld(new THREE.Vector3(2,.65,.45)),new THREE.Vector3(-1,0,0));
    assert.ok(atDoor.intersectObjects(sidePanels).every(hit=>car.worldToLocal(hit.point.clone()).x<0),`${record.id}: body shell leaves driver's door opening clear`);
    const geometry=car.getObjectByName('vehicle-interior').children.find(n=>n.userData.parts?.includes('steering-wheel')).geometry;
    // Steering is the torus in the merged black interior batch, at y > 0.6.
    const p=geometry.attributes.position,points=[];
    for(let i=0;i<p.count;i++)if(p.getZ(i)>.42&&p.getZ(i)<.73&&p.getY(i)>.65)points.push(p.getX(i));
    assert.ok(points.length&&points.reduce((a,b)=>a+b,0)/points.length>.15,`${record.id}: steering wheel left`);
    const before=new THREE.Box3().setFromObject(car.userData.driverDoor).min.x;
    car.userData.setDoor(1);car.updateMatrixWorld(true);
    assert.ok(new THREE.Box3().setFromObject(car.userData.driverDoor).max.x>car.position.x+record.dimensions.width/2+.6,`${record.id}: door opens outward`);
    car.userData.setDoor(0);assert.ok(Number.isFinite(before));
  }
});

test('mirror passes keep occupied car lights visible and restore individual mesh visibility after interruption',()=>{
  const scene=new THREE.Scene(),group=new THREE.Group(),camera=new THREE.PerspectiveCamera(),worker=new THREE.Group();
  scene.add(group,worker);const shown=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()),hidden=shown.clone(),light=new THREE.SpotLight();hidden.visible=false;group.add(shown,hidden,light);
  const priorTarget={name:'existing-target'};let target=priorTarget,passes=0,interrupt=false;
  const renderer={autoClear:false,xr:{enabled:true},shadowMap:{autoUpdate:true},getRenderTarget:()=>target,setRenderTarget:value=>{target=value;},clear(){},render(){
    passes++;assert.equal(group.visible,true,'car parent remains visible for light traversal');assert.equal(light.visible,true);assert.equal(light.parent.visible,true);
    assert.equal(shown.visible,false);assert.equal(hidden.visible,false);if(interrupt)throw new Error('interrupted');
  }};
  const mirrors=createCarSideMirrors({camera,scene,renderer,worker,record:{group,dimensions:{width:1.8}}});
  mirrors.update();assert.equal(passes,2);assert.equal(shown.visible,true);assert.equal(hidden.visible,false);assert.equal(target,priorTarget);
  mirrors.dispose();interrupt=true;
  const interrupted=createCarSideMirrors({camera,scene,renderer,worker,record:{group,dimensions:{width:1.8}}});
  assert.throws(()=>interrupted.update(),/interrupted/);
  assert.equal(shown.visible,true);assert.equal(hidden.visible,false);assert.equal(group.visible,true);assert.equal(worker.visible,true);assert.equal(light.visible,true);
  assert.equal(target,priorTarget);assert.equal(renderer.autoClear,false);assert.equal(renderer.xr.enabled,true);assert.equal(renderer.shadowMap.autoUpdate,true);interrupted.dispose();
});

test('both side mirror views fit inside forward PC and portrait cockpit and are removed on exit',()=>{
  for(const aspect of [1440/900,390/844]){
    const record=fleet[2],scene=new THREE.Scene();scene.add(record.group);
    const camera=new THREE.PerspectiveCamera(37,aspect,.1,100);camera.setViewOffset(1440,900,100,0,1440,900);
    const savedView={...camera.view},worker=new THREE.Group();
    const mirrorMaterials=[];record.group.traverse(n=>{if(n.userData.sideMirror)mirrorMaterials.push([n,n.material]);});
    const cockpit=createCarCockpit({camera,worker,getCar:()=>record,scene});
    cockpit.setActive(true);camera.updateMatrixWorld();scene.updateMatrixWorld(true);
    const mirrors=[];scene.traverse(n=>{if(n.userData.cockpitMirror)mirrors.push(n);});
    assert.equal(mirrors.length,2,'left and right mirror views exist');
    record.group.userData.manualSteering=-.4;cockpit.update();scene.updateMatrixWorld(true);
    const rim=record.group.getObjectByName('driver-cockpit-interior').userData.steering;
    const bottom=new THREE.Vector3(0,-.08,0).applyMatrix4(rim.matrixWorld).project(camera);
    const centre=new THREE.Vector3().applyMatrix4(rim.matrixWorld).project(camera);
    assert.ok(bottom.x<centre.x,'right turn moves bottom spoke screen-left, clockwise');
    for(const mirror of mirrors){
      const box=new THREE.Box3().setFromObject(mirror),corners=[];
      for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])corners.push(new THREE.Vector3(x,y,z).project(camera));
      assert.ok(corners.every(p=>Math.abs(p.x)<.98&&Math.abs(p.y)<.95&&p.z<1),'mirror remains wholly on screen');
    }
    cockpit.setActive(false);
    assert.equal(scene.getObjectByName('driver-side-mirror-views'),undefined);
    assert.equal(record.group.getObjectByName('driver-cockpit-interior'),undefined);
    assert.equal(camera.fov,37);assert.equal(camera.near,.1);assert.deepEqual(camera.view,savedView);
    for(const [mirror,original]of mirrorMaterials)assert.equal(mirror.material,original);
  }
});
