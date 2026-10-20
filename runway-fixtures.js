import * as THREE from './vendor/three.module.js';

/** Fixed runway fittings, with the same geometry/materials and additive halos. */
export function runwayFixtures({world,halo}){
  const fixtures=[];
  const inset=(x,z,color)=>fixtures.push({x,z,color});
  for(let z=-32;z<=32;z+=4)for(const x of [-51.65,-36.35])inset(x,z,0xffe9b9);
  for(let z=-30;z<=30;z+=3)inset(-44,z,0xe9f4ff);
  for(const sign of [-1,1])for(let dx=-6;dx<=6;dx+=1.5){inset(-44+dx,sign*33.8,0x70e6ae);inset(-44+dx,sign*34.6,0xff6c60);}
  const group=new THREE.Group();group.name='Runway inset lighting';world.add(group);
  const transform=new THREE.Object3D(),tint=new THREE.Color();
  function instances(name,geometry,material,items,offsetY,scale,flat=false,coloured=false){
    const mesh=new THREE.InstancedMesh(geometry,material,items.length);mesh.name=name;
    for(const [i,item] of items.entries()){
      transform.position.set(item.x,-.085+offsetY,item.z);transform.rotation.set(flat?-Math.PI/2:0,0,0);transform.scale.set(...scale);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);
      if(coloured)mesh.setColorAt(i,tint.setHex(item.color));
    }
    mesh.instanceMatrix.needsUpdate=true;group.add(mesh);return mesh;
  }
  instances('Runway fixture rims',new THREE.CylinderGeometry(.14,.14,.022,12),new THREE.MeshStandardMaterial({color:0x485258,metalness:.7,roughness:.45}),fixtures,0,[1,1,1]);
  const lenses=[];
  for(const color of new Set(fixtures.map(f=>f.color))){
    const material=new THREE.MeshStandardMaterial({color:0xadb6ba,emissive:color,emissiveIntensity:0});
    lenses.push(instances('Runway fixture lenses',new THREE.CylinderGeometry(.085,.085,.012,12),material,fixtures.filter(f=>f.color===color),.014,[1,1,1]));
  }
  const pools=instances('Runway light pools',new THREE.PlaneGeometry(2.2,2.2),new THREE.MeshBasicMaterial({map:halo,color:0xffffff,transparent:true,opacity:.62,depthWrite:false,blending:THREE.AdditiveBlending}),fixtures,.018,[1,1,1],true,true);

  // Reuse Three's Sprite shader, extending only the per-instance centre, size
  // and tint. Perspective, camera-facing quads, fog and colour conversion match
  // the original SpriteMaterial; no per-frame billboard matrices are uploaded.
  const uniforms=THREE.UniformsUtils.clone(THREE.ShaderLib.sprite.uniforms);
  uniforms.map.value=halo;uniforms.center.value.set(.5,.5);uniforms.diffuse.value.setHex(0xffffff);
  const vertexShader=THREE.ShaderLib.sprite.vertexShader
    .replace('#include <common>','#include <common>\nvarying vec3 fixtureColor;')
    .replace('vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );','fixtureColor = instanceColor;\nmat4 fixtureMatrix = modelMatrix * instanceMatrix;\nvec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(0.,0.,0.,1.);')
    .replaceAll('modelMatrix[','fixtureMatrix[');
  const fragmentShader=THREE.ShaderLib.sprite.fragmentShader
    .replace('#include <common>','#include <common>\nvarying vec3 fixtureColor;')
    .replace('vec4 diffuseColor = vec4( diffuse, opacity );','vec4 diffuseColor = vec4(diffuse * fixtureColor, opacity);');
  const glowMaterial=new THREE.ShaderMaterial({uniforms,vertexShader,fragmentShader,defines:{USE_MAP:'',MAP_UV:'uv',USE_SIZEATTENUATION:''},fog:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
  const glows=instances('Runway light halos',new THREE.PlaneGeometry(1,1),glowMaterial,fixtures,.045,[1.35,1.35,1],false,true);
  function setNight(night){lenses.forEach(mesh=>{mesh.material.emissiveIntensity=night?14:0;});pools.visible=glows.visible=night;}
  setNight(false);
  return {group,count:fixtures.length,setNight};
}
