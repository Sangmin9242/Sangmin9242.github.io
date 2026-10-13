import * as THREE from './vendor/three.module.js';

// A small airliner, with its nose along local +Z and wings along X.
export function airplane() {
  const group=new THREE.Group();group.name='Conference airplane';
  const white=new THREE.MeshStandardMaterial({color:0xe5e8e7,metalness:.35,roughness:.3});
  const trim=new THREE.MeshStandardMaterial({color:0xb77435,metalness:.45,roughness:.35});
  const glass=new THREE.MeshStandardMaterial({color:0x18313e,metalness:.5,roughness:.15});
  const rubber=new THREE.MeshStandardMaterial({color:0x252b2c,roughness:.8});
  function mesh(geometry,material,position=[0,0,0]){const m=new THREE.Mesh(geometry,material);m.position.set(...position);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
  const profile=[[-1.85,.018],[-1.65,.09],[-1.2,.155],[.65,.17],[1.12,.145],[1.4,.1],[1.65,.018]].map(([y,r])=>new THREE.Vector2(r,y));
  const body=mesh(new THREE.LatheGeometry(profile,32),white,[0,.48,0]);body.rotation.x=Math.PI/2;
  function foil(vertices,material){const s=new THREE.Shape();vertices.forEach(([x,z],i)=>i?s.lineTo(x,z):s.moveTo(x,z));s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:.035,bevelEnabled:true,bevelSize:.015,bevelThickness:.012,bevelSegments:2,steps:1});const m=mesh(g,material,[0,.44,0]);m.rotation.x=Math.PI/2;return m;}
  for(const side of [-1,1]){
    foil([[side*.13,.34],[side*1.5,-.55],[side*1.56,-.8],[side*.16,-.3]],white);
    foil([[side*.06,-1.1],[side*.62,-1.42],[side*.63,-1.65],[side*.09,-1.5]],white);
    const engine=mesh(new THREE.CylinderGeometry(.105,.12,.4,24),white,[side*.57,.31,.15]);engine.rotation.x=Math.PI/2;
    const fan=mesh(new THREE.CircleGeometry(.085,24),glass,[side*.57,.31,.355]);
    for(let z=-1.05;z<.9;z+=.16){const w=mesh(new THREE.SphereGeometry(1,10,8),glass,[side*.155,.535,z]);w.scale.set(.009,.025,.033);}
    const wheel=mesh(new THREE.CylinderGeometry(.08,.08,.06,16),rubber,[side*.2,.065,-.35]);wheel.rotation.z=Math.PI/2;
    mesh(new THREE.CylinderGeometry(.015,.015,.22,8),white,[side*.2,.2,-.35]);
  }
  const finShape=new THREE.Shape();finShape.moveTo(0,0);finShape.lineTo(0,.58);finShape.lineTo(.15,.64);finShape.lineTo(.62,0);finShape.closePath();
  const fin=mesh(new THREE.ExtrudeGeometry(finShape,{depth:.025,bevelEnabled:false}),trim,[0,.51,-1.65]);fin.rotation.y=-Math.PI/2;
  const cockpit=mesh(new THREE.SphereGeometry(1,24,16),glass,[0,.55,1.22]);cockpit.scale.set(.115,.038,.14);
  const frontWheel=mesh(new THREE.CylinderGeometry(.06,.06,.045,16),rubber,[0,.065,1.05]);frontWheel.rotation.z=Math.PI/2;
  mesh(new THREE.CylinderGeometry(.012,.012,.22,8),white,[0,.2,1.05]);
  return group;
}
