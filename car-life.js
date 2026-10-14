import * as THREE from './vendor/three.module.js';
import {roadOutline,driveway as D} from './driveway-layout.js?v=20261015-road-gallery';
import { boardingAvatar } from './boarding-avatar.js?v=20261014-refined';
import { createCarTrip } from './car-trip.js?v=20261015-road-gallery';

const phaseText={
  'walking-out':['작업자가 차량으로 이동 중','Worker walking to the car'],
  'door-opening':['운전석 문 여는 중','Opening the driver door'],
  entering:['운전석에 탑승 중','Getting into the driver seat'],
  'door-closing':['문을 닫는 중','Closing the door'],
  reversing:['주차 자리에서 후진 중','Backing out of the parking bay'],
  'reverse-turn':['후진하여 출차 중','Turning out of the parking bay'],
  leaving:['주차장을 나가는 중','Leaving the car park'],
  'exit-turn':['진입로로 회전 중','Turning onto the access road'],
  'leaving-neck':['볼링장 옆 진입로로 이동 중','Driving beside the bowling room'],
  'outbound-bend':['외곽 도로로 회전 중','Turning onto the perimeter road'],
  'outbound-cross':['시설 앞 외곽 도로를 따라 이동 중','Driving around the facilities'],
  'outer-exit-turn':['외곽 진입로로 회전 중','Turning onto the outer access road'],
  'outer-return-turn':['시설을 피해 복귀 중','Returning around the facilities'],
  'return-cross':['외곽 도로를 따라 복귀 중','Returning along the perimeter road'],
  'inbound-bend':['주차장 진입로로 회전 중','Turning towards the car park'],
  'returning-neck':['볼링장 옆 진입로로 복귀 중','Returning beside the bowling room'],
  'leaving-road':['도로를 따라 주행 중','Driving along the access road'],
  'road-turn':['복귀를 위해 회전 중','Turning around for the return'],
  away:['8초 후 복귀합니다','Returning after an 8 second stop'],
  'returning-road':['주차장으로 돌아오는 중','Returning to the car park'],
  'return-turn':['주차장 진입 중','Entering the car park'],
  returning:['주차 자리로 이동 중','Approaching the parking bay'],
  'parking-turn':['주차 자리로 회전 중','Turning into the parking bay'],
  parking:['원래 자리에 주차 중','Parking in the original bay'],
  'door-opening-exit':['하차를 위해 문 여는 중','Opening the door to get out'],
  exiting:['작업자가 하차 중','Worker getting out'],
  'door-closing-exit':['차량 문을 닫는 중','Closing the car door'],
  'walking-home':['작업자가 건물로 복귀 중','Worker walking back to the building'],
  complete:['주차와 복귀 완료','Parked. Worker returned to the building'],
  idle:['탑승하면 작업자가 운전합니다','Board to let the worker drive'],
};
const array=p=>p?.toArray?.() ?? p;
function accessRoad(world){
  const group=new THREE.Group();group.name='parking-access-road';
  const asphalt=new THREE.MeshStandardMaterial({color:0x4b514e,roughness:.97});
  const paint=new THREE.MeshStandardMaterial({color:0xbbbcb0,roughness:.92});
  function rectangle(x,z,width,length,material,y=-.105,height=.06){const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,height,length),material);mesh.position.set(x,y,z);mesh.receiveShadow=true;group.add(mesh);return mesh;}
  const outline=new THREE.Shape();roadOutline.forEach(([x,z],i)=>i?outline.lineTo(x,-z):outline.moveTo(x,-z));outline.closePath();
  const road=new THREE.Mesh(new THREE.ShapeGeometry(outline),asphalt);road.name='Continuous access pavement';road.rotation.x=-Math.PI/2;road.position.y=-.075;road.receiveShadow=true;group.add(road);
  // Markings float a centimetre above the surface to keep depth ordering stable.
  for(let x=-20;x<8;x+=3.2)rectangle(x,16.5,1.5,.055,paint,-.064,.002);
  for(let z=22;z<30;z+=3.2)rectangle(D.neckX,z,.055,1.5,paint,-.064,.002);
  for(let x=18;x<46;x+=3.2)rectangle(x,D.crossZ,1.5,.055,paint,-.064,.002);
  for(let z=40;z<53;z+=3.2)rectangle(D.loopX,z,.055,1.5,paint,-.064,.002);
  for(const z of [13.8,19.2])rectangle(-6.25,z,31.5,.045,paint,-.064,.002);
  world.add(group);return group;
}

export function carLife({world,parking,container,getLanguage=()=> 'en',reducedMotion=false,onSelect,onClose,onBoard,onComplete,onFollow}={}){
  const cars=parking.cars, trips=new Map();
  for(const record of cars){
    const u=record.group.userData;
    trips.set(record.id,createCarTrip({id:record.id,...record.dimensions,position:record.position ?? record.group.position.toArray(),wheelRadius:u.wheelRadius,wheelbase:u.wheelbase,driverEntry:array(u.driverEntry),driverSeat:array(u.driverSeat)}));
  }
  accessRoad(world);
  const worker=boardingAvatar({worker:true});worker.name='car-driver-worker';worker.visible=false;world.add(worker);
  const rig=worker.userData.sportRig, vest=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),new THREE.MeshStandardMaterial({color:0xe6b825,roughness:.85}));
  vest.scale.set(.218,.30,.15);vest.position.set(0,.29,0);rig.upper.add(vest);
  const reflective=new THREE.MeshStandardMaterial({color:0xdce5dc,roughness:.45});
  for(const x of [-.1,.1]){const strip=new THREE.Mesh(new THREE.BoxGeometry(.027,.46,.012),reflective);strip.position.set(x,.29,.144);rig.upper.add(strip);}
  const belt=new THREE.Mesh(new THREE.BoxGeometry(.37,.032,.012),reflective);belt.position.set(0,.12,.146);rig.upper.add(belt);
  const helmets=rig.upper.children.filter(object=>object.isMesh && object.material?.color?.getHex()===0xdfded3);
  const shoes=rig.legs.map(({knee})=>knee.children.find(object=>object.isMesh && object.geometry.type==='SphereGeometry'));
  const footBounds=new THREE.Box3();
  let selectedCar=null, activeCar=null, following=false, poseTime=0, lastPhase='';
  const panel=document.createElement('aside');panel.id='car-panel';panel.className='car-panel';panel.hidden=true;panel.setAttribute('aria-labelledby','car-title');
  panel.innerHTML='<div class="car-panel-head"><span class="car-eyebrow">PARKING</span><button id="car-close" type="button" aria-label="Close car information">×</button></div><h2 id="car-title"></h2><p class="car-description" id="car-description"></p><div class="car-fleet" role="group"></div><div class="car-actions"><button id="car-board" type="button"></button><button id="car-return" type="button" hidden></button></div><label class="car-follow-label"><input id="car-follow" type="checkbox"><span id="car-follow-text"></span></label><p id="car-status" role="status" aria-live="polite"></p>';
  (container?.closest('.world') ?? document.querySelector('.world') ?? document.body).append(panel);
  const query=id=>panel.querySelector(id), title=query('#car-title'),boardButton=query('#car-board'),returnButton=query('#car-return'),followInput=query('#car-follow'),status=query('#car-status');
  const fleet=panel.querySelector('.car-fleet'),fleetButtons=[];
  for(const record of cars){const button=document.createElement('button');button.type='button';button.className='car-fleet-item';button.textContent=record.model;button.dataset.carId=record.id;button.addEventListener('click',()=>select(record.id));fleet.append(button);fleetButtons.push(button);}
  query('#car-close').addEventListener('click',()=>close());
  boardButton.addEventListener('click',()=>board());
  returnButton.addEventListener('click',()=>{trips.get(activeCar?.id)?.returnNow();refresh();});
  followInput.addEventListener('change',()=>{following=followInput.checked;onFollow?.(following);});
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();close();}});
  // Physical beams illuminate the same meshes as the scene's other lights.
  const beams=[];
  for(const side of [-1,1]){const light=new THREE.SpotLight(0xfff6dc,0,24,.28,.45,1.8),target=new THREE.Object3D();light.position.set(side*.52,.63,1.9);target.position.set(side*.52,.15,15);light.target=target;beams.push({light,target});}
  function setFollow(value){following=value;followInput.checked=value;onFollow?.(value);}
  function refresh(){
    const ko=getLanguage()==='ko',lang=ko?0:1,trip=trips.get(activeCar?.id ?? selectedCar?.id),s=trip?.state;
    if(selectedCar){title.textContent=selectedCar.model;}
    query('#car-description').textContent=ko?'작업자가 탑승해 출차하고, 8초 후 돌아와 같은 자리에 주차합니다.':'The worker boards, drives out, waits 8 seconds, then returns to the same parking bay.';
    query('#car-close').setAttribute('aria-label',ko?'차량 정보 닫기':'Close car information');
    fleet.setAttribute('aria-label',ko?'차량 선택':'Choose a vehicle');
    boardButton.textContent=ko?(activeCar?'운행 중':'탑승'):(activeCar?'Trip in progress':'Board');boardButton.disabled=!!activeCar || !selectedCar;
    returnButton.textContent=ko?'지금 복귀':'Return now';returnButton.hidden=s?.phase!=='away';
    query('#car-follow-text').textContent=ko?'작업자와 차량 따라가기':'Follow the worker and car';followInput.checked=following;followInput.disabled=typeof reducedMotion==='function'?reducedMotion():reducedMotion;
    for(const button of fleetButtons){button.disabled=!!activeCar && button.dataset.carId!==activeCar.id;button.setAttribute('aria-pressed',String(button.dataset.carId===selectedCar?.id));}
    status.textContent=(phaseText[s?.phase ?? 'idle'] ?? phaseText.idle)[lang];
    panel.dataset.phase=s?.phase ?? 'idle';
  }
  function select(id){
    const record=cars.find(item=>item.id===id);if(!record)return false;
    selectedCar=activeCar ?? record;panel.hidden=false;document.body.classList.add('car-open');refresh();onSelect?.(selectedCar.id);if(activeCar)onFollow?.(following);return true;
  }
  function close(notify=true){panel.hidden=true;document.body.classList.remove('car-open');if(notify)onClose?.();}
  function board(){
    if(!selectedCar||activeCar)return false;
    const trip=trips.get(selectedCar.id);if(!trip.board())return false;
    activeCar=selectedCar;activeCar.group.userData.parked=false;lastPhase='';poseTime=0;
    for(const beam of beams){activeCar.group.add(beam.light,beam.target);}
    setFollow(!(typeof reducedMotion==='function'?reducedMotion():reducedMotion));
    apply(trip.state);refresh();onBoard?.(activeCar.id);return true;
  }
  function applyPose(s){
    const w=s.worker;worker.userData.pose(poseTime,w.walking,w.crouch);
    const blend=w.seated;
    if(blend>0){
      const oldY=rig.hip.position.y,oldUpper=rig.upper.rotation.x,angles=[...rig.legs.flatMap(({leg,knee})=>[leg.rotation.x,knee.rotation.x]),...rig.arms.flatMap(({arm,elbow})=>[arm.rotation.x,elbow.rotation.x])];
      worker.userData.seated();rig.hip.position.y=.54;
      rig.hip.position.y=THREE.MathUtils.lerp(oldY,rig.hip.position.y,blend);rig.upper.rotation.x=THREE.MathUtils.lerp(oldUpper,rig.upper.rotation.x,blend);
      let i=0;for(const {leg,knee} of rig.legs){leg.rotation.x=THREE.MathUtils.lerp(angles[i++],leg.rotation.x,blend);knee.rotation.x=THREE.MathUtils.lerp(angles[i++],knee.rotation.x,blend);}for(const {arm,elbow} of rig.arms){arm.rotation.x=THREE.MathUtils.lerp(angles[i++],arm.rotation.x,blend);elbow.rotation.x=THREE.MathUtils.lerp(angles[i++],elbow.rotation.x,blend);}
    }
    helmets.forEach(helmet=>helmet.visible=blend<.08 && w.crouch<.1);
  }
  function apply(s){
    const group=activeCar.group;group.position.set(s.car.x,s.car.y,s.car.z);group.rotation.y=s.car.heading;
    group.userData.setDoor?.(s.door);group.userData.setDrive?.({wheelAngle:s.wheelAngle,steering:s.steering,headlights:s.headlights,braking:s.braking,reversing:s.reversing});
    worker.visible=s.driverVisible;
    if(s.inside){if(worker.parent!==group)group.attach(worker);const local=group.worldToLocal(new THREE.Vector3(s.worker.x,s.worker.y,s.worker.z));worker.position.copy(local);worker.rotation.set(0,0,0);}
    else {if(worker.parent!==world)world.attach(worker);worker.position.set(s.worker.x,s.worker.y,s.worker.z);worker.rotation.set(0,s.worker.heading,0);}
    applyPose(s);
    // The shared avatar's feet extend below its gait pivots. Keep the planted
    // shoe on the route surface, and blend that correction away while seated.
    if(!s.inside && s.worker.seated<1){
      worker.updateWorldMatrix(true,true);
      const lowest=Math.min(...shoes.map(shoe=>footBounds.setFromObject(shoe).min.y));
      worker.position.y+=(s.worker.y-lowest)*(1-s.worker.seated);
    }
    for(const beam of beams)beam.light.intensity=s.headlights?1.7:0;
  }
  function update(dt,paused=false){
    if(!activeCar || paused || !Number.isFinite(dt) || dt<=0)return;
    const trip=trips.get(activeCar.id);poseTime+=dt;trip.update(dt);apply(trip.state);
    if(trip.state.phase!==lastPhase){lastPhase=trip.state.phase;refresh();}
    if(!trip.isActive()){
      const completed=activeCar;completed.group.userData.parked=true;worker.visible=false;world.attach(worker);for(const beam of beams){beam.light.removeFromParent();beam.target.removeFromParent();}
      activeCar=null;setFollow(false);refresh();onComplete?.(completed.id);
    }
  }
  function focusPoint(){const s=trips.get(activeCar?.id)?.state;if(s)return new THREE.Vector3(s.inside?s.car.x:s.worker.x,(s.inside?s.car.y+1:s.worker.y+1),s.inside?s.car.z:s.worker.z);return selectedCar?selectedCar.group.position.clone().add(new THREE.Vector3(0,1,0)):new THREE.Vector3(-4,1,22.45);}
  refresh();
  return {select,close,board,update,refresh,isActive:()=>!!activeCar,selected:()=>selectedCar,focusPoint,getWorker:()=>worker,panel,get tripState(){return trips.get(activeCar?.id ?? selectedCar?.id)?.state ?? null;},anchors:{parking:new THREE.Vector3(-4,1,22.45)}};
}
