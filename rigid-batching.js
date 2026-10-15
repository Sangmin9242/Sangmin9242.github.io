import {Material, Matrix4, Mesh, NormalBlending, Object3D, ObjectSpaceNormalMap} from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

const callbacks=['onBeforeRender','onAfterRender','onBeforeShadow','onAfterShadow'];
const attributes=new Set(['position','normal','tangent','uv','uv1','uv2','color']);
const groupedPrimitives=new Set(['BoxGeometry','CylinderGeometry','ExtrudeGeometry']);

function containsFunction(value,seen=new Set()) {
  if(typeof value==='function')return true;
  if(!value||typeof value!=='object'||seen.has(value))return false;
  seen.add(value);return Object.values(value).some(child=>containsFunction(child,seen));
}

function eligible(mesh,matrix) {
  if(!mesh.isMesh||mesh.children.length||mesh.isSkinnedMesh||mesh.isInstancedMesh||mesh.isBatchedMesh||mesh.userData.rigidBatch)return false;
  const data=mesh.userData;
  if(data.rigidStatic!==true||data.noBatch||data.batchOptOut||data.interactive||data.panel||data.calendar||containsFunction(data))return false;
  if(callbacks.some(key=>mesh[key]!==Object3D.prototype[key]))return false;
  const material=mesh.material,geometry=mesh.geometry;
  if(!material||Array.isArray(material)||!material.visible||material.transparent||material.transmission>0||material.blending!==NormalBlending)return false;
  if(material.isShaderMaterial||material.displacementMap||material.normalMap&&material.normalMapType===ObjectSpaceNormalMap||material.onBeforeCompile!==Material.prototype.onBeforeCompile||material.onBeforeRender!==Material.prototype.onBeforeRender)return false;
  if(!geometry?.isBufferGeometry||geometry.isInstancedBufferGeometry||!geometry.attributes.position||Object.keys(geometry.morphAttributes).length)return false;
  const count=geometry.index?.count??geometry.attributes.position.count;
  if(!count||count%3||geometry.drawRange.start!==0||geometry.drawRange.count<count)return false;
  if(geometry.groups.length) {
    if(!groupedPrimitives.has(geometry.type))return false;
    let end=0;for(const group of geometry.groups){if(group.start!==end)return false;end+=group.count;}
    if(end!==count)return false;
  }
  for(const [name,attribute] of Object.entries(geometry.attributes)) {
    if(!attributes.has(name)||attribute.isInterleavedBufferAttribute||attribute.isInstancedBufferAttribute)return false;
    if(['position','normal','tangent'].includes(name)&&(!(attribute.array instanceof Float32Array)&&!(attribute.array instanceof Float64Array)||attribute.normalized))return false;
  }
  // Reflected objects switch winding at draw time; a baked reflection would lose it.
  return matrix.elements.every(Number.isFinite)&&matrix.determinant()>0;
}

function counts(root) {
  let meshes=0,triangles=0;
  root.traverse(object=>{
    if(!object.isMesh)return;meshes++;
    const geometry=object.geometry;
    if(geometry?.attributes.position)triangles+=Math.floor(Math.min(geometry.drawRange.count,(geometry.index?.count??geometry.attributes.position.count)-geometry.drawRange.start)/3);
  });
  return {meshes,triangles};
}

/**
 * Batch a known rigid CAD model. Only the supplied joint roots may move inside
 * the model; all other intermediate transforms/visibility must remain constant.
 * Only mesh leaves explicitly marked userData.rigidStatic=true are candidates;
 * this declares their transforms relative to the nearest joint remain constant.
 * Named transform groups remain attached. Preserved nodes retain their complete
 * subtrees, including geometry used by nozzle bounds and other external queries.
 */
export function batchRigidModel(model,{joints=[],preserve=[]}={}) {
  const before=counts(model),boundaries=new Set([model,...joints]),retained=new Set(preserve),buckets=new Map(),ids=new WeakMap();let nextId=0;
  const identity=object=>{if(!object)return 0;if(!ids.has(object))ids.set(object,++nextId);return ids.get(object);};
  function visit(node,root,matrix,ancestorsSafe) {
    if(!node.visible||retained.has(node)||node.userData.noBatch||node.userData.batchOptOut)return;
    if(node.matrixAutoUpdate)node.updateMatrix();
    if(boundaries.has(node)){root=node;matrix=new Matrix4();}
    else matrix=new Matrix4().multiplyMatrices(matrix,node.matrix);
    // Moving meshes across a non-default intermediate group changes sort order.
    const safe=ancestorsSafe&&!(node.isGroup&&node.renderOrder!==0);
    if(safe&&eligible(node,matrix)) {
      const format=Object.keys(node.geometry.attributes).sort().map(name=>{
        const attribute=node.geometry.attributes[name];return [name,attribute.itemSize,attribute.normalized,attribute.array.constructor.name,attribute.gpuType].join(':');
      }).join('|');
      const key=[identity(root),identity(node.material),node.geometry.index?'indexed':'nonindexed',format,node.castShadow,node.receiveShadow,node.layers.mask,node.renderOrder,node.frustumCulled,identity(node.customDepthMaterial),identity(node.customDistanceMaterial)].join('|');
      if(!buckets.has(key))buckets.set(key,{root,items:[]});
      buckets.get(key).items.push({mesh:node,matrix});
    }
    for(const child of node.children)visit(child,root,matrix,safe);
  }
  visit(model,model,new Matrix4(),true);let groups=0;
  for(const {root,items} of buckets.values()) {
    if(items.length<2)continue;
    const geometries=items.map(({mesh,matrix})=>{const geometry=mesh.geometry.clone();geometry.clearGroups();geometry.applyMatrix4(matrix);return geometry;});
    const geometry=mergeGeometries(geometries,false);for(const copy of geometries)copy.dispose();
    if(!geometry)continue;
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const first=items[0].mesh,batch=new Mesh(geometry,first.material);batch.name='rigid-cad-batch';batch.userData.rigidBatch=true;batch.userData.originalCount=items.length;
    batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;batch.layers.mask=first.layers.mask;
    batch.renderOrder=first.renderOrder;batch.frustumCulled=first.frustumCulled;batch.customDepthMaterial=first.customDepthMaterial;batch.customDistanceMaterial=first.customDistanceMaterial;
    for(const {mesh} of items)mesh.removeFromParent();root.add(batch);groups++;
  }
  const after=counts(model);
  return {before:before.meshes,after:after.meshes,meshesRemoved:before.meshes-after.meshes,groups,trianglesBefore:before.triangles,trianglesAfter:after.triangles};
}
