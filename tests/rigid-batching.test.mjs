import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';

let batchRigidModel;
try { ({batchRigidModel}=await import('../rigid-batching.js')); }
catch(error) { if(error.code!=='ERR_MODULE_NOT_FOUND')throw error; }

test('rigid CAD batching is available',()=>assert.equal(typeof batchRigidModel,'function'));

function mesh(parent,material,position=[0,0,0],geometry=new THREE.BoxGeometry(.7,.6,.5)) {
  const object=new THREE.Mesh(geometry,material);object.position.set(...position);
  object.castShadow=object.receiveShadow=true;object.userData.rigidStatic=true;parent.add(object);return object;
}
function part(parent,name,position=[0,0,0]) {
  const object=new THREE.Group();object.name=name;object.position.set(...position);parent.add(object);return object;
}
function meshCount(root) { let count=0;root.traverse(object=>{if(object.isMesh)count++;});return count; }
function vertices(root) {
  root.updateMatrixWorld(true);const result=[];
  root.traverse(object=>{
    if(!object.isMesh)return;
    const geometry=object.geometry,position=geometry.attributes.position,normal=geometry.attributes.normal,uv=geometry.attributes.uv;
    const normalMatrix=new THREE.Matrix3().getNormalMatrix(object.matrixWorld);
    for(let i=0;i<position.count;i++) {
      const point=new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(object.matrixWorld);
      const direction=normal?new THREE.Vector3().fromBufferAttribute(normal,i).applyNormalMatrix(normalMatrix):new THREE.Vector3();
      result.push([object.material.uuid,...point.toArray(),...direction.toArray(),...(uv?[uv.getX(i),uv.getY(i)]:[])]);
    }
  });
  return result.sort((a,b)=>{
    if(a[0]!==b[0])return a[0].localeCompare(b[0]);
    for(let i=1;i<a.length;i++)if(Math.abs(a[i]-b[i])>1e-5)return a[i]-b[i];
    return 0;
  });
}
function sameVertices(actual,expected) {
  assert.equal(actual.length,expected.length);
  for(let i=0;i<actual.length;i++) {
    assert.equal(actual[i][0],expected[i][0]);
    for(let j=1;j<actual[i].length;j++)assert.ok(Math.abs(actual[i][j]-expected[i][j])<3e-5,`vertex ${i} component ${j}: ${actual[i][j]} != ${expected[i][j]}`);
  }
}
function sameBounds(actual,expected) {
  assert.ok(actual.min.distanceTo(expected.min)<3e-5);
  assert.ok(actual.max.distanceTo(expected.max)<3e-5);
}

if(batchRigidModel) {
  test('unmarked leaves retain their identities even when marked for site batching',()=>{
    const root=new THREE.Group(),material=new THREE.MeshStandardMaterial();
    const a=mesh(part(root,'unmarked-a'),material),b=mesh(part(root,'unmarked-b'),material,[2,0,0]);
    const parents=[a.parent,b.parent];
    delete a.userData.rigidStatic;delete b.userData.rigidStatic;
    a.userData.staticSite=b.userData.staticSite=true;
    assert.equal(batchRigidModel(root).meshesRemoved,0);
    assert.equal(a.parent,parents[0]);assert.equal(b.parent,parents[1]);
    a.userData.rigidStatic=b.userData.rigidStatic='true';
    assert.equal(batchRigidModel(root).meshesRemoved,0);
  });

  test('merges nested rigid parts without crossing moving joints or changing world surfaces',()=>{
    const model=new THREE.Group();model.position.set(7,2,-3);model.rotation.set(.2,.3,-.1);model.scale.set(1.3,.8,1.1);
    const base=part(model,'base',[1,0,0]),joint1=part(base,'joint1',[0,1.2,0]),joint2=part(joint1,'joint2',[0,1.1,0]);
    base.rotation.set(.15,-.2,.1);base.scale.set(.7,1.4,.9);
    joint1.rotation.set(.1,.2,.3);joint2.rotation.set(.2,-.1,.15);
    const material=new THREE.MeshStandardMaterial(),other=new THREE.MeshStandardMaterial({color:0xaabbcc});
    const originalGroups=[];
    for(const [index,root] of [base,joint1,joint2].entries()) {
      const a=part(root,`housing-${index}`,[-.8,.2,0]),b=part(root,`cover-${index}`,[.9,.1,.2]);originalGroups.push(a,b);
      a.rotation.set(.2,.3,.1);a.scale.set(.8,1.2,1.1);b.rotation.set(-.1,.2,.4);
      mesh(a,material);mesh(b,material,[0,.2,0]);mesh(b,other,[0,.8,0]);
    }
    const nozzle=part(joint2,'nozzle',[0,1,0]);const nozzleMesh=mesh(nozzle,material);mesh(nozzleMesh,other,[0,.4,0]);
    const reference=model.clone(true),before=vertices(model),nozzleBounds=new THREE.Box3().setFromObject(nozzle);
    let disposed=false;originalGroups[0].children[0].geometry.addEventListener('dispose',()=>{disposed=true;});
    const result=batchRigidModel(model,{joints:[base,joint1,joint2],preserve:[nozzle]});
    assert.equal(result.before,11);assert.equal(result.after,8);assert.equal(result.meshesRemoved,3);
    assert.equal(result.trianglesBefore,132);assert.equal(result.trianglesAfter,132);
    assert.equal(disposed,false);assert.equal(nozzleMesh.parent,nozzle);assert.equal(nozzleMesh.children.length,1);
    for(const group of originalGroups)assert.ok(group.parent,'named transform groups stay attached');
    sameVertices(vertices(model),before);sameBounds(new THREE.Box3().setFromObject(nozzle),nozzleBounds);
    const motion=root=>{
      root.position.x+=3;root.rotation.y+=.4;root.getObjectByName('base').rotation.z-=.3;
      root.getObjectByName('joint1').rotation.x+=.7;root.getObjectByName('joint2').rotation.y-=.5;
    };
    motion(model);motion(reference);sameVertices(vertices(model),vertices(reference));
    sameBounds(new THREE.Box3().setFromObject(model,true),new THREE.Box3().setFromObject(reference,true));
    sameBounds(new THREE.Box3().setFromObject(nozzle),new THREE.Box3().setFromObject(reference.getObjectByName('nozzle')));
    assert.equal(batchRigidModel(model,{joints:[base,joint1,joint2],preserve:[nozzle]}).meshesRemoved,0);
  });

  test('retains a mesh nozzle itself while merging other parts and preserving raycast surfaces',()=>{
    const root=new THREE.Group(),joint=part(root,'joint',[2,.5,-1]);joint.rotation.y=.4;joint.scale.set(1.2,.8,1.1);
    const material=new THREE.MeshStandardMaterial();
    mesh(part(joint,'part-a'),material,[0,0,0]);mesh(part(joint,'part-b'),material,[0,2,0]);
    const nozzle=mesh(joint,material,[0,4,0]);nozzle.name='nozzle';
    root.updateMatrixWorld(true);
    const origin=joint.localToWorld(new THREE.Vector3(0,0,4)),direction=new THREE.Vector3(0,0,-1).transformDirection(joint.matrixWorld);
    const ray=new THREE.Raycaster(origin,direction),before=ray.intersectObject(root,true)[0],bounds=new THREE.Box3().setFromObject(nozzle);
    const worldNormal=hit=>hit.face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld));
    const previousNormal=worldNormal(before);
    const stats=batchRigidModel(root,{joints:[joint],preserve:[nozzle]});root.updateMatrixWorld(true);
    const after=ray.intersectObject(root,true)[0];
    assert.equal(stats.meshesRemoved,1);assert.equal(nozzle.parent,joint);
    assert.ok(Math.abs(after.distance-before.distance)<1e-6);assert.ok(after.point.distanceTo(before.point)<1e-6);
    assert.ok(worldNormal(after).distanceTo(previousNormal)<1e-6);sameBounds(new THREE.Box3().setFromObject(nozzle),bounds);
  });

  test('does not move meshes across groups that override inherited render sorting',()=>{
    const root=new THREE.Group(),material=new THREE.MeshStandardMaterial();root.renderOrder=9;
    const a=mesh(part(root,'default-sort-a'),material),b=mesh(part(root,'default-sort-b'),material,[2,0,0]);
    assert.equal(batchRigidModel(root).meshesRemoved,0);
    assert.equal(a.parent.name,'default-sort-a');assert.equal(b.parent.name,'default-sort-b');
  });

  test('keeps materials, shadow and render state separate and leaves unsafe meshes addressable',()=>{
    const root=new THREE.Group(),material=new THREE.MeshStandardMaterial(),kept=[];
    const addPair=(name,setup=()=>{})=>{
      const a=mesh(part(root,name+'-a'),material),b=mesh(part(root,name+'-b'),material,[2,0,0]);setup(a);setup(b);return [a,b];
    };
    addPair('plain');addPair('casts',object=>{object.castShadow=false;});addPair('receives',object=>{object.receiveShadow=false;});
    addPair('layer',object=>object.layers.set(2));addPair('order',object=>{object.renderOrder=3;});
    const distinct=material.clone();addPair('material',object=>{object.material=distinct;});
    const transparent=new THREE.MeshStandardMaterial({transparent:true,opacity:.5});
    kept.push(...addPair('transparent',object=>{object.material=transparent;}));
    kept.push(...addPair('custom-attribute',object=>object.geometry.setAttribute('partId',new THREE.Float32BufferAttribute(new Float32Array(24),1))));
    kept.push(...addPair('skin',object=>{object.isSkinnedMesh=true;}));
    kept.push(...addPair('callback',object=>{object.onBeforeRender=()=>{};}));
    kept.push(...addPair('reflected',object=>{object.scale.x=-1;}));
    kept.push(...addPair('hidden',object=>{object.parent.visible=false;}));
    kept.push(...addPair('partial',object=>object.geometry.setDrawRange(0,3)));
    const shader=new THREE.ShaderMaterial();kept.push(...addPair('shader',object=>{object.material=shader;}));
    const stats=batchRigidModel(root);
    assert.equal(stats.meshesRemoved,6);
    for(const object of kept)assert.ok(object.parent.name.endsWith('-a')||object.parent.name.endsWith('-b'));
    const batches=root.children.filter(object=>object.userData.rigidBatch);
    assert.equal(batches.length,6);assert.equal(meshCount(root),22);
    for(const batch of batches)assert.equal(batch.geometry.index.count,72);
  });
}
