import * as THREE from './vendor/three.module.js';
import { boardingAvatar } from './boarding-avatar.js?v=20261014-luggage';

export function boardingSequence({world,researcher,avatar,plane,box,beam}){
  const person=boardingAvatar();person.scale.setScalar(1.1);person.visible=false;world.add(person);
  researcher.updateMatrixWorld(true);plane.updateMatrixWorld(true);
  const start=avatar.getWorldPosition(new THREE.Vector3());start.y=0;
  const pickup=new THREE.Vector3(-5.8,0,7.2),luggage=new THREE.Group();
  world.add(luggage);luggage.position.copy(pickup);
  box(luggage,[.43,.58,.26],[0,.36,0],0xa76737,{metalness:.25,roughness:.65});
  for(const x of [-.12,0,.12])box(luggage,[.012,.49,.008],[x,.36,.134],0xc08b55);
  for(const x of [-.16,.16]){
    beam(luggage,[x,.59,0],[x,.82,0],.015,0xc7cccc);
    const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.045,12),new THREE.MeshStandardMaterial({color:0x22282a}));wheel.rotation.z=Math.PI/2;wheel.position.set(x,.07,-.06);luggage.add(wheel);
  }
  beam(luggage,[-.16,.82,0],[.16,.82,0],.024,0x273239);
  const entry=plane.localToWorld(new THREE.Vector3(-.26,.34,.9)),bottom=entry.clone().add(new THREE.Vector3(0,-entry.y,3.4));
  const stairs=new THREE.Group();stairs.position.copy(bottom);stairs.visible=false;world.add(stairs);
  const steps=12;
  for(let i=0;i<steps;i++)box(stairs,[1.05,.075,3.4/steps+.025],[0,entry.y*(i+1)/steps,-3.4*(i+.5)/steps],0x909795,{metalness:.6,roughness:.4});
  for(const x of [-.55,.55]){
    beam(stairs,[x,.9,0],[x,entry.y+.9,-3.4],.025,0xc1c7c3);
    for(let i=0;i<=4;i++){const q=i/4;beam(stairs,[x,entry.y*q,-3.4*q],[x,entry.y*q+.9,-3.4*q],.022,0xc1c7c3);}
  }
  const door=new THREE.Group();door.position.set(-.247,.60,.75);plane.add(door);
  const panel=new THREE.Mesh(new THREE.BoxGeometry(.012,.54,.31),new THREE.MeshStandardMaterial({color:0xe5e8e7,metalness:.35,roughness:.3}));panel.position.z=.155;door.add(panel);
  const portal=new THREE.Mesh(new THREE.PlaneGeometry(.3,.52),new THREE.MeshStandardMaterial({color:0x1b2930,roughness:.7}));portal.position.set(-.246,.6,.9);portal.rotation.y=-Math.PI/2;portal.visible=false;plane.add(portal);
  const walk=new THREE.CatmullRomCurve3([pickup,pickup.clone().add(new THREE.Vector3(0,0,2)),new THREE.Vector3(bottom.x,0,bottom.z+1),bottom]);
  const duration=11.5;panel.visible=false;
  const data=document.querySelector('#scene');data.dataset.planeScale=String(plane.scale.x);data.dataset.boardingDoorHeight=String(.52*plane.scale.y);
  function setTow(active){person.userData.towing=active;if(active){if(luggage.parent!==person)person.add(luggage);luggage.position.set(.23,.01,-.38);luggage.rotation.set(.25,0,0);luggage.scale.setScalar(1/1.1);}}
  function face(direction){person.rotation.y=Math.atan2(direction.x,direction.z);}
  function animate(elapsed){
    if(elapsed<duration){person.visible=true;avatar.visible=false;stairs.visible=true;let phase;
      if(elapsed<.65){person.position.copy(start);person.userData.pose(elapsed,false,.45*(1-THREE.MathUtils.smoothstep(elapsed,0,.65)));phase='standing';}
      else if(elapsed<2.1){const t=THREE.MathUtils.clamp((elapsed-.65)/1.45,0,1);person.position.copy(start).lerp(pickup,t);face(pickup.clone().sub(start));person.userData.pose(elapsed,true);phase='walking';}
      else if(elapsed<2.65){person.position.copy(pickup);setTow(true);face(walk.getTangentAt(0));person.userData.pose(elapsed,false);phase='pickup';}
      else if(elapsed<8.4){const t=THREE.MathUtils.clamp((elapsed-2.65)/5.75,0,1);person.position.copy(walk.getPointAt(t));face(walk.getTangentAt(t));setTow(true);person.userData.pose(elapsed,true);phase='walking';}
      else{const t=THREE.MathUtils.clamp((elapsed-8.4)/3.1,0,1),climb=Math.min(t/.8,1);person.position.copy(bottom).lerp(entry,climb);if(t>.8)person.position.z-=(t-.8)/.2*1.1;person.rotation.y=Math.PI;setTow(true);person.userData.pose(elapsed,true,0);person.visible=t<.98;phase='boarding';}
      const opened=THREE.MathUtils.smoothstep(elapsed,7.7,8.4)*(1-THREE.MathUtils.smoothstep(elapsed,11.1,11.5));door.rotation.y=-opened*Math.PI*.55;portal.visible=opened>.02;panel.visible=opened>.015;
      data.dataset.luggageState=person.userData.towing?'towing':'parked';data.dataset.boardingUpright=String(elapsed>=8.4);data.dataset.luggagePosition=JSON.stringify(luggage.getWorldPosition(new THREE.Vector3()).toArray());
      return {point:person.position.clone().add(new THREE.Vector3(0,.8,0)),phase,flightElapsed:0};
    }
    person.visible=false;stairs.visible=false;door.rotation.y=0;portal.visible=false;panel.visible=false;data.dataset.luggageState='boarded';return {point:plane.position.clone(),phase:'boarded',flightElapsed:elapsed-duration};
  }
  function reset(){person.visible=false;avatar.visible=true;person.userData.towing=false;world.add(luggage);luggage.position.copy(pickup);luggage.rotation.set(0,0,0);luggage.scale.setScalar(1);stairs.visible=false;door.rotation.y=0;portal.visible=false;panel.visible=false;data.dataset.luggageState='parked';}
  return {duration,animate,start(){person.visible=true;avatar.visible=false;},reset};
}
