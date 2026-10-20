import {Box3, Material, Mesh, NormalBlending, Object3D, ObjectSpaceNormalMap, Vector3} from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

const renderCallbacks=['onBeforeRender','onAfterRender','onBeforeShadow','onAfterShadow'];
const standardGroupedGeometry=new Set(['BoxGeometry','CylinderGeometry','ExtrudeGeometry']);

function containsFunction(value,seen=new Set()) {
  if(typeof value==='function')return true;
  if(!value||typeof value!=='object'||seen.has(value))return false;
  seen.add(value);
  return Object.values(value).some(child=>containsFunction(child,seen));
}

function eligible(mesh) {
  const data=mesh.userData;
  if(!mesh.isMesh||mesh.isSkinnedMesh||mesh.isInstancedMesh||mesh.isBatchedMesh||!mesh.visible||mesh.children.length||data.staticSite!==true||data.staticBatch)return false;
  if(data.panel||data.calendar||data.interactive||data.noBatch||data.batchOptOut||data.staticBatchOptOut||containsFunction(data))return false;
  if(renderCallbacks.some(key=>mesh[key]!==Object3D.prototype[key]))return false;
  const material=mesh.material,geometry=mesh.geometry;
  if(!material||Array.isArray(material)||!material.visible||material.transparent||material.transmission>0||material.blending!==NormalBlending)return false;
  // These shaders depend on the original object coordinates or transform.
  if(material.isShaderMaterial||material.displacementMap||material.normalMap&&material.normalMapType===ObjectSpaceNormalMap||material.onBeforeCompile!==Material.prototype.onBeforeCompile||material.onBeforeRender!==Material.prototype.onBeforeRender)return false;
  if(!geometry?.isBufferGeometry||geometry.isInstancedBufferGeometry||!geometry.attributes.position||Object.keys(geometry.morphAttributes).length)return false;
  const parameters=geometry.parameters;
  // car-life uses these individual thin boxes to discover physical collision poles.
  if(geometry.type==='BoxGeometry'&&parameters.width<=.15&&parameters.depth<=.15&&parameters.height>=2)return false;
  const count=geometry.index?.count??geometry.attributes.position.count;
  if(!count||count%3||geometry.drawRange.start!==0||geometry.drawRange.count<count)return false;
  if(geometry.groups.length) {
    if(!standardGroupedGeometry.has(geometry.type))return false;
    let end=0;
    for(const group of geometry.groups){if(group.start!==end)return false;end+=group.count;}
    if(end!==count)return false;
  }
  for(const [name,attribute] of Object.entries(geometry.attributes)) {
    if(attribute.isInterleavedBufferAttribute||attribute.isInstancedBufferAttribute||name==='skinIndex'||name==='skinWeight')return false;
    if(['position','normal','tangent'].includes(name)&&(!(attribute.array instanceof Float32Array)&&!(attribute.array instanceof Float64Array)||attribute.normalized))return false;
  }
  if(mesh.matrixAutoUpdate)mesh.updateMatrix();
  // A reflected mesh switches front-face winding at draw time; baking it would lose that switch.
  return mesh.matrix.elements.every(Number.isFinite)&&mesh.matrix.determinant()>0;
}

function geometryFormat(geometry) {
  const attributes=Object.keys(geometry.attributes).sort().map(name=>{
    const attribute=geometry.attributes[name];
    return [name,attribute.itemSize,attribute.normalized,attribute.array.constructor.name,attribute.gpuType].join(':');
  });
  return `${geometry.index?geometry.index.array.constructor.name:'nonindexed'}|${geometry.morphTargetsRelative}|${attributes.join('|')}`;
}

function sceneCounts(root) {
  let meshes=0,triangles=0;
  root.traverse(object=>{
    if(!object.isMesh)return;
    meshes++;
    const geometry=object.geometry;
    if(geometry?.attributes.position)triangles+=Math.floor(Math.min(geometry.drawRange.count,(geometry.index?.count??geometry.attributes.position.count)-geometry.drawRange.start)/3);
  });
  return {meshes,triangles};
}

/**
 * Merge explicitly marked static sibling meshes into parent-local, spatial batches.
 * Mark only meshes whose individual identity/transform is no longer needed with
 * userData.staticSite=true; userData.noBatch=true retains an otherwise marked mesh.
 * Parents are retained so labels, picking groups and subsequent group movement work.
 * Source geometries/materials are never disposed because other meshes may share them.
 * Compact models may opt out of spatial cells with spatial:false; parent/joint
 * boundaries still apply, so doors, limbs and kit visibility remain independent.
 */
export function batchStaticScene(root,{cellSize=12,spatial=true}={}) {
  if(!Number.isFinite(cellSize)||cellSize<=0)throw new RangeError('cellSize must be positive and finite');
  const before=sceneCounts(root),parents=[];
  root.traverse(object=>{if(object.children.length)parents.push(object);});
  const bounds=new WeakMap(),ids=new WeakMap();let nextId=0,groups=0;
  const identity=value=>{
    if(!value)return 0;
    if(!ids.has(value))ids.set(value,++nextId);
    return ids.get(value);
  };
  const center=new Vector3();
  for(const parent of parents) {
    const buckets=new Map();
    for(const mesh of parent.children) {
      if(!eligible(mesh))continue;
      const geometry=mesh.geometry;
      if(!bounds.has(geometry))bounds.set(geometry,new Box3().setFromBufferAttribute(geometry.attributes.position));
      bounds.get(geometry).getCenter(center).applyMatrix4(mesh.matrix);
      const cell=spatial?[center.x,center.y,center.z].map(value=>Math.floor(value/cellSize)).join(','):'joint';
      const key=[identity(mesh.material),geometryFormat(geometry),mesh.castShadow,mesh.receiveShadow,mesh.layers.mask,mesh.renderOrder,mesh.frustumCulled,identity(mesh.customDepthMaterial),identity(mesh.customDistanceMaterial),cell].join('|');
      if(!buckets.has(key))buckets.set(key,[]);
      buckets.get(key).push(mesh);
    }
    for(const originals of buckets.values()) {
      if(originals.length<2)continue;
      const geometries=originals.map(mesh=>{
        const geometry=mesh.geometry.clone();
        // Single-material Mesh rendering ignores primitive face/material groups.
        geometry.clearGroups();geometry.applyMatrix4(mesh.matrix);return geometry;
      });
      const merged=mergeGeometries(geometries,false);
      for(const geometry of geometries)geometry.dispose();
      if(!merged)continue;
      merged.computeBoundingBox();merged.computeBoundingSphere();
      const first=originals[0],batch=new Mesh(merged,first.material);
      batch.name='static-site-batch';batch.userData.staticBatch=true;batch.userData.originalCount=originals.length;
      batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;
      batch.layers.mask=first.layers.mask;batch.renderOrder=first.renderOrder;batch.frustumCulled=first.frustumCulled;
      batch.customDepthMaterial=first.customDepthMaterial;batch.customDistanceMaterial=first.customDistanceMaterial;
      // Keep the earliest original's slot; nonbatched siblings keep their relative order.
      const slot=parent.children.indexOf(first);
      for(const mesh of originals)parent.remove(mesh);
      parent.add(batch);
      parent.children.splice(parent.children.indexOf(batch),1);
      parent.children.splice(slot,0,batch);
      groups++;
    }
  }
  const after=sceneCounts(root);
  return {before:before.meshes,after:after.meshes,meshesRemoved:before.meshes-after.meshes,groups,trianglesBefore:before.triangles,trianglesAfter:after.triangles};
}
