import * as THREE from './vendor/three.module.js';
import { boardingAvatar } from './boarding-avatar.js?v=20261014-refined';
import { carryConferenceGear, parkConferenceGear } from './conference-gear.js';
export function trainBoarding({world,avatar,train,luggage,box}){
  const person=boardingAvatar();person.visible=false;world.add(person);train.updateMatrixWorld(true);avatar.updateMatrixWorld(true);
  const entry=train.localToWorld(train.userData.entry.clone());entry.y-=.05;
  const start=avatar.getWorldPosition(new THREE.Vector3());start.y=0;const pickup=new THREE.Vector3(-5.8,0,7.2),platformEdge=new THREE.Vector3(-20.34,entry.y,-1.8),bottom=new THREE.Vector3(-17.34,0,-1.8);
  const route=new THREE.CatmullRomCurve3([pickup,new THREE.Vector3(-12,0,7.2),new THREE.Vector3(-15,0,4),bottom]);
  for(let i=0;i<6;i++)box(world,[.52,.055,1.05],[bottom.x-3*(i+.5)/6,entry.y*(i+1)/6,-1.8],0x909fa8,{metalness:.5});
  const duration=15,origin=train.position.clone(),data=document.querySelector('#scene');
  function carry(){carryConferenceGear(luggage,person);}
  function face(v){person.rotation.y=Math.atan2(v.x,v.z);}
  function animate(elapsed){if(elapsed>=duration){carry();person.visible=false;train.userData.setDoor(0);data.dataset.trainDoor='0';data.dataset.trainPassenger='boarded';return {point:train.position.clone(),phase:'train-boarded',flightElapsed:elapsed-duration};}
    avatar.visible=false;person.visible=true;let phase;
    if(elapsed<.65){person.position.copy(start);person.userData.pose(elapsed,false,.45*(1-THREE.MathUtils.smoothstep(elapsed,0,.65)));phase='train-standing';}
    else if(elapsed<2.1){const u=(elapsed-.65)/1.45;person.position.copy(start).lerp(pickup,u);face(pickup.clone().sub(start));person.userData.pose(elapsed,true);phase='train-walking';}
    else if(elapsed<2.65){person.position.copy(pickup);face(route.getTangentAt(0));person.userData.pose(elapsed,false);phase='train-pickup';}
    else if(elapsed<8.8){const u=(elapsed-2.65)/6.15;person.position.copy(route.getPointAt(u));face(route.getTangentAt(u));person.userData.pose(elapsed,true);phase='train-walking';}
    else if(elapsed<10){const u=(elapsed-8.8)/1.2;person.position.copy(bottom).lerp(platformEdge,u);person.position.y=entry.y*Math.ceil(u*6)/6;face(new THREE.Vector3(-1,0,0));person.userData.pose(elapsed,true);phase='train-platform';}
    else if(elapsed<12.5){const u=(elapsed-10)/2.5;person.position.copy(platformEdge).lerp(entry,u);face(new THREE.Vector3(-1,0,0));person.userData.pose(elapsed,true);phase='train-boarding';}
    else if(elapsed<13.5){const u=elapsed-12.5;person.position.copy(entry).add(new THREE.Vector3(-u*.7,0,0));person.userData.pose(elapsed,true);person.visible=u<.97;phase='train-boarding';}
    else{person.visible=false;phase='train-door-closing';}
    if(elapsed>=2.1)carry();
    const open=THREE.MathUtils.smoothstep(elapsed,8,9)*(1-THREE.MathUtils.smoothstep(elapsed,13.6,14.6));train.userData.setDoor(open);data.dataset.trainDoor=String(open);data.dataset.trainPassenger=elapsed>=13.5?'boarded':person.userData.carryingConferenceGear?'with-conference-gear':'walking';data.dataset.trainAvatarPosition=JSON.stringify(person.position.toArray());
    const fixed=platformEdge.clone().lerp(entry,.5).add(new THREE.Vector3(0,.8,0)),point=elapsed>=8.8?bottom.clone().add(new THREE.Vector3(0,.8,0)).lerp(fixed,THREE.MathUtils.smoothstep(elapsed,8.8,10)):person.position.clone().add(new THREE.Vector3(0,.8,0));
    return {point,cameraOffset:new THREE.Vector3(6,2.7,elapsed>=8.8?0:5),phase,flightElapsed:0};
  }
  return {duration,animate,start(){parkConferenceGear(luggage,world,pickup);person.visible=true;avatar.visible=false;},reset(){person.visible=false;person.userData.towing=false;avatar.visible=true;parkConferenceGear(luggage,world,pickup);train.position.copy(origin);train.userData.setDoor(0);data.dataset.trainPassenger='waiting';}};
}
