import * as THREE from './vendor/three.module.js';
import { boardingAvatar } from './boarding-avatar.js';

export function boardingSequence({world,researcher,avatar,plane,box,beam}){
  const person=boardingAvatar();person.scale.setScalar(1.1);person.visible=false;world.add(person);
  researcher.updateMatrixWorld(true);plane.updateMatrixWorld(true);
  const start=avatar.getWorldPosition(new THREE.Vector3());start.y=0;
  const entry=plane.localToWorld(new THREE.Vector3(-.26,.34,.9));
  const stairs=new THREE.Group();stairs.position.set(entry.x,0,entry.z+1.05);stairs.visible=false;world.add(stairs);
  for(let i=0;i<6;i++)box(stairs,[.52,.055,.22],[0,.06+i*.065,-i*.18],0x909795,{metalness:.6,roughness:.4});
  for(const x of [-.28,.28]){beam(stairs,[x,.24,.08],[x,.63,-.93],.012,0xb2b8b4);for(const z of [0,-.9])beam(stairs,[x,.08,z],[x,z===0?.24:.63,z],.012,0xb2b8b4);}
  const door=new THREE.Group();door.position.set(-.247,.60,.75);plane.add(door);
  const white=new THREE.MeshStandardMaterial({color:0xe5e8e7,metalness:.35,roughness:.3});
  const panel=new THREE.Mesh(new THREE.BoxGeometry(.012,.54,.31),white);panel.position.z=.155;door.add(panel);
  const portal=new THREE.Mesh(new THREE.PlaneGeometry(.3,.52),new THREE.MeshStandardMaterial({color:0x1b2930,roughness:.7}));portal.position.set(-.246,.6,.9);portal.rotation.y=-Math.PI/2;portal.visible=false;plane.add(portal);
  const route=new THREE.CatmullRomCurve3([start,start.clone().add(new THREE.Vector3(0,0,1.3)),new THREE.Vector3(-4.3,0,8.7),new THREE.Vector3(-3.8,0,12.8),new THREE.Vector3(entry.x,0,entry.z+1.3)]);
  panel.visible=false;const duration=8.1;
  function animate(elapsed){if(elapsed<duration){person.visible=true;avatar.visible=false;stairs.visible=true;const standing=THREE.MathUtils.smoothstep(elapsed,0,.65);const walking=elapsed>=.65&&elapsed<6.8;
    if(elapsed<6.8){const progress=THREE.MathUtils.clamp((elapsed-.65)/6.15,0,1);person.position.copy(route.getPointAt(progress));person.position.y=-.15*THREE.MathUtils.smoothstep(progress,0,.12)*(1-THREE.MathUtils.smoothstep(progress,.92,1))-.22*(1-standing);const direction=route.getTangentAt(progress);person.rotation.y=Math.atan2(direction.x,direction.z);person.userData.pose(elapsed,walking,.45*(1-standing));}
    else{const progress=THREE.MathUtils.clamp((elapsed-6.8)/1.3,0,1);person.position.set(entry.x,entry.y*progress,entry.z+1.3*(1-progress));person.rotation.y=Math.PI;person.userData.pose(elapsed,true,THREE.MathUtils.smoothstep(progress,.2,.85));person.visible=progress<.9;}
    const opened=THREE.MathUtils.smoothstep(elapsed,6.3,6.8)*(1-THREE.MathUtils.smoothstep(elapsed,7.85,8.1));door.rotation.y=-opened*Math.PI*.55;portal.visible=opened>.02;panel.visible=opened>.015;
    return {point:person.position.clone().add(new THREE.Vector3(0,.8,0)),phase:elapsed<.65?'standing':elapsed<6.8?'walking':'boarding',flightElapsed:0};
  }person.visible=false;stairs.visible=false;door.rotation.y=0;portal.visible=false;panel.visible=false;return {point:plane.position.clone(),phase:'boarded',flightElapsed:elapsed-duration};}
  return {duration,animate,start(){person.visible=true;avatar.visible=false;},reset(){person.visible=false;avatar.visible=true;stairs.visible=false;door.rotation.y=0;portal.visible=false;panel.visible=false;}};
}
