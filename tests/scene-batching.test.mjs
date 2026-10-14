import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';

let batchStaticScene;
try { ({batchStaticScene}=await import('../scene-batching.js')); }
catch(error) { if(error.code!=='ERR_MODULE_NOT_FOUND')throw error; }
test('static scene batching is available',()=>assert.equal(typeof batchStaticScene,'function'));

function box(parent,material,position=[1,1,1],geometry=new THREE.BoxGeometry(1,1,1)) {
  const mesh=new THREE.Mesh(geometry,material);
  mesh.position.set(...position);mesh.userData.staticSite=true;parent.add(mesh);return mesh;
}
function meshes(root) { const result=[];root.traverse(o=>{if(o.isMesh)result.push(o);});return result; }
function vertices(root) {
  root.updateMatrixWorld(true);
  const values=[];
  for(const mesh of meshes(root)) {
    const geometry=mesh.geometry,position=geometry.getAttribute('position'),normal=geometry.getAttribute('normal');
    const normalMatrix=new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
    const uv=geometry.getAttribute('uv'),color=geometry.getAttribute('color');
    for(let i=0;i<position.count;i++) {
      const point=new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld);
      const direction=normal?new THREE.Vector3().fromBufferAttribute(normal,i).applyNormalMatrix(normalMatrix):null;
      values.push([...point.toArray(),...(direction?.toArray()||[]),...(uv?[uv.getX(i),uv.getY(i)]:[]),...(color?[color.getX(i),color.getY(i),color.getZ(i)]:[])]);
    }
  }
  return values.sort((a,b)=>{for(let i=0;i<a.length;i++){if(Math.abs(a[i]-b[i])>1e-5)return a[i]-b[i];}return 0;});
}
function closeVertices(actual,expected) {
  assert.equal(actual.length,expected.length);
  for(let i=0;i<actual.length;i++)for(let j=0;j<actual[i].length;j++)assert.ok(Math.abs(actual[i][j]-expected[i][j])<2e-5,`vertex ${i}, component ${j}: ${actual[i][j]} != ${expected[i][j]}`);
}

if(batchStaticScene) {
  test('merging siblings reduces draw objects without removing triangles or disposing shared geometry',()=>{
    const root=new THREE.Group(),material=new THREE.MeshStandardMaterial(),geometry=new THREE.BoxGeometry(1,1,1);
    let disposed=false;geometry.addEventListener('dispose',()=>{disposed=true;});
    box(root,material,[1,1,1],geometry);box(root,material,[3,1,1],geometry);
    const unflagged=box(root,material,[5,1,1],geometry);unflagged.userData.staticSite=false;
    const stats=batchStaticScene(root);
    assert.equal(stats.before,3);assert.equal(stats.after,2);assert.equal(stats.meshesRemoved,1);assert.equal(stats.groups,1);
    assert.equal(stats.trianglesBefore,36);assert.equal(stats.trianglesAfter,36);
    assert.equal(disposed,false);assert.ok(root.children.includes(unflagged));
    const batch=meshes(root).find(m=>m.userData.staticBatch);
    assert.equal(batch.material,material);assert.equal(batch.userData.originalCount,2);assert.equal(batch.geometry.index.count,72);
    const again=batchStaticScene(root);assert.equal(again.meshesRemoved,0);
  });
  test('baking local transforms preserves world positions normals UVs and colors as parents move',()=>{
    const root=new THREE.Group(),parent=new THREE.Group(),material=new THREE.MeshStandardMaterial();root.add(parent);
    parent.position.set(13,2,-7);parent.rotation.set(.2,.6,-.1);parent.scale.set(1.4,.9,1.1);
    const label=new THREE.Object3D();label.name='building-label';parent.add(label);
    const geometry=new THREE.BoxGeometry(1,2,1);
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(Array.from({length:geometry.attributes.position.count*3},(_,i)=>(i%3)/3),3));
    const a=box(parent,material,[2,2,3],geometry),b=box(parent,material,[5,3,2],geometry);
    a.rotation.set(.3,.2,.1);a.scale.set(1.2,.7,.9);b.rotation.set(-.2,.4,.3);b.scale.set(.8,1.3,1.1);
    const before=vertices(root),bounds=new THREE.Box3().setFromObject(root,true);
    batchStaticScene(root);closeVertices(vertices(root),before);
    const afterBounds=new THREE.Box3().setFromObject(root,true);
    assert.ok(bounds.min.distanceTo(afterBounds.min)<1e-5);assert.ok(bounds.max.distanceTo(afterBounds.max)<1e-5);
    assert.equal(parent.parent,root);assert.ok(parent.children.includes(label));
    const expectedParent=new THREE.Group();expectedParent.position.copy(parent.position);expectedParent.rotation.copy(parent.rotation);expectedParent.scale.copy(parent.scale);
    expectedParent.add(a,b);expectedParent.position.x+=8;expectedParent.rotation.y+=.5;
    parent.position.x+=8;parent.rotation.y+=.5;
    closeVertices(vertices(root),vertices(expectedParent));
  });
  test('spatial cells and parent boundaries retain useful independent culling objects',()=>{
    const root=new THREE.Group(),material=new THREE.MeshStandardMaterial();
    for(const x of [1,2,25,26])box(root,material,[x,1,1]);
    const other=new THREE.Group();root.add(other);box(other,material,[1,1,1]);box(other,material,[2,1,1]);
    const stats=batchStaticScene(root,{cellSize:12});
    assert.equal(stats.groups,3);assert.equal(root.children.filter(o=>o.isMesh).length,2);assert.equal(other.children.length,1);
    for(const m of meshes(root)){m.geometry.computeBoundingBox();assert.ok(m.geometry.boundingBox.max.x-m.geometry.boundingBox.min.x<3);}
  });
  test('collision poles interactive objects dynamic children and unsafe rendering stay individually addressable',()=>{
    const root=new THREE.Group(),material=new THREE.MeshStandardMaterial(),kept=[];
    box(root,material);box(root,material,[3,1,1]);
    kept.push(box(root,material,[1,2,1],new THREE.BoxGeometry(.1,3,.1)));
    const child=box(root,material);child.add(new THREE.Object3D());kept.push(child);
    for(const data of [{panel:'digital'},{calendar:true},{interactive:true},{noBatch:true},{batchOptOut:true},{staticBatchOptOut:true},{animate(){}}]){
      const mesh=box(root,material);Object.assign(mesh.userData,data);kept.push(mesh);
    }
    const invisible=box(root,material);invisible.visible=false;kept.push(invisible);
    kept.push(box(root,new THREE.MeshStandardMaterial({transparent:true,opacity:.4})));
    for(const unsafeMaterial of [new THREE.ShaderMaterial(),new THREE.MeshStandardMaterial({displacementMap:new THREE.Texture()}),new THREE.MeshStandardMaterial({normalMap:new THREE.Texture(),normalMapType:THREE.ObjectSpaceNormalMap})]){
      kept.push(box(root,unsafeMaterial));kept.push(box(root,unsafeMaterial,[3,1,1]));
    }
    kept.push(box(root,[material,material]));
    const morph=box(root,material);morph.geometry.morphAttributes.position=[morph.geometry.attributes.position.clone()];kept.push(morph);
    const reflected=box(root,material);reflected.scale.x=-1;kept.push(reflected);
    const partial=box(root,material);partial.geometry.setDrawRange(0,3);kept.push(partial);
    const callback=box(root,material);callback.onBeforeRender=()=>{};kept.push(callback);
    const skinned=new THREE.SkinnedMesh(new THREE.BoxGeometry(),material);skinned.userData.staticSite=true;root.add(skinned);kept.push(skinned);
    const instanced=new THREE.InstancedMesh(new THREE.BoxGeometry(),material,1);instanced.userData.staticSite=true;root.add(instanced);kept.push(instanced);
    const stats=batchStaticScene(root);assert.equal(stats.meshesRemoved,1);
    for(const mesh of kept)assert.equal(mesh.parent,root);
  });
  test('material identity geometry formats and shadow flags prevent incompatible merges',()=>{
    const root=new THREE.Group(),material=new THREE.MeshStandardMaterial();
    const pairs=[];
    for(const setup of [()=>{},m=>{m.castShadow=true;},m=>{m.receiveShadow=true;},m=>{m.layers.set(2);},m=>{m.renderOrder=4;},m=>{m.frustumCulled=false;},m=>{m.material=material.clone();},m=>{m.geometry=m.geometry.toNonIndexed();m.geometry.clearGroups();},m=>{m.geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(72),3));}]){
      const a=box(root,material),b=box(root,material,[3,1,1]);setup(a);
      b.castShadow=a.castShadow;b.receiveShadow=a.receiveShadow;b.layers.mask=a.layers.mask;b.renderOrder=a.renderOrder;b.frustumCulled=a.frustumCulled;b.material=a.material;
      b.geometry=a.geometry.clone();pairs.push([a,b]);
    }
    const stats=batchStaticScene(root);assert.equal(stats.groups,pairs.length);assert.equal(stats.after,pairs.length);
    for(const [a] of pairs)assert.ok(meshes(root).some(m=>m.material===a.material&&m.castShadow===a.castShadow&&m.receiveShadow===a.receiveShadow&&m.layers.mask===a.layers.mask&&m.renderOrder===a.renderOrder&&m.frustumCulled===a.frustumCulled));
  });
  test('raycasting a batched building still reaches the same world surface and normal',()=>{
    const root=new THREE.Group(),building=new THREE.Group(),material=new THREE.MeshStandardMaterial();root.add(building);
    box(building,material,[1,1,1]);box(building,material,[3,1,1]);root.updateMatrixWorld(true);
    const ray=new THREE.Raycaster(new THREE.Vector3(1,1,5),new THREE.Vector3(0,0,-1));
    const before=ray.intersectObject(building,true)[0];assert.equal(before.distance,3.5);
    batchStaticScene(root);root.updateMatrixWorld(true);
    const after=ray.intersectObject(building,true)[0];assert.equal(after.distance,before.distance);assert.deepEqual(after.point.toArray(),before.point.toArray());assert.deepEqual(after.face.normal.toArray(),before.face.normal.toArray());
    assert.equal(after.object.parent,building);assert.equal(after.object.userData.staticBatch,true);
  });
}
