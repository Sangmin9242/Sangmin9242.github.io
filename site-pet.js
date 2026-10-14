import * as THREE from './vendor/three.module.js';
import { createMaltipoo } from './maltipoo-model.js?v=20261015-life';
import { createDogBehaviour } from './dog-behaviour.js?v=20261015-life';

const copy = {
  en: { title:'A little companion', intro:'A small maltipoo, always nearby.', pet:'Pet gently', treat:'Give a treat', call:'Call to the office', close:'Back to the site', near:'Coming closer…', sit:'Happy to see you.', rest:'A little rest.', walk:'Exploring the site.', run:'Off for a little run!', sniff:'Something smells interesting.', petStatus:'That feels lovely! ♥', treatStatus:'A little treat. Yum!', callStatus:'On the way back to the office.', wait:'Ready again in', seconds:'s' },
  ko: { title:'작은 동반자', intro:'연구실 곁을 함께하는 작은 말티푸.', pet:'쓰다듬기', treat:'간식 주기', call:'연구실로 부르기', close:'현장으로 돌아가기', near:'가까이 다가가는 중…', sit:'반가워요.', rest:'잠깐 쉬는 중이에요.', walk:'주변을 구경하고 있어요.', run:'신나게 달리는 중이에요!', sniff:'킁킁, 무슨 냄새일까요?', petStatus:'쓰다듬어 주니 좋아요! ♥', treatStatus:'냠냠, 맛있어요!', callStatus:'연구실로 돌아가는 중이에요.', wait:'다시 줄 수 있어요', seconds:'초' },
};
Object.assign(copy.en,{free:'Let me explore',stay:'Stay beside me',sleep:'Curled up for a little nap.',pee:'A very serious little leg lift…',poop:'Taking a tiny outdoor break.'});
Object.assign(copy.ko,{free:'자유롭게 놀기',stay:'곁에서 쉬기',sleep:'눈을 감고 편하게 자고 있어요.',pee:'한쪽 다리를 번쩍, 쉬하는 중이에요…',poop:'밖에서 잠깐 응가하는 중이에요.'});

export function sitePet({ world, camera, container, reducedMotion, getLanguage, onClose }) {
  const dog = createMaltipoo(), behaviour = createDogBehaviour({ reducedMotion });
  world.add(dog);
  const state = behaviour.state, anchor = new THREE.Vector3(), lastPosition = new THREE.Vector3();
  let selected=false,freePlay=true, lastHearts=0, heartAge=9, lastPose='', poseAge=1;
  const panel=document.querySelector('#pet-panel'), status=document.querySelector('#pet-status');
  const petButton=document.querySelector('#pet-stroke'), treatButton=document.querySelector('#pet-treat'), callButton=document.querySelector('#pet-call');
  const rig=[]; dog.traverse(node=>{if(node.isGroup)rig.push({node,position:node.position.clone(),quaternion:node.quaternion.clone(),scale:node.scale.clone()});});
  // Local fill keeps a tiny companion legible during a nighttime close-up.
  const fill=new THREE.PointLight(0xffe4c5,0,4.5,2);world.add(fill);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#ff8a9b';ctx.beginPath();ctx.moveTo(64,108);ctx.bezierCurveTo(46,89,9,64,13,36);ctx.bezierCurveTo(17,9,51,9,64,31);ctx.bezierCurveTo(77,9,111,9,115,36);ctx.bezierCurveTo(119,64,82,89,64,108);ctx.fill();
  const texture=new THREE.CanvasTexture(canvas);
  const hearts=Array.from({length:3},()=>{const heart=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false}));heart.scale.setScalar(.13);heart.visible=false;world.add(heart);return heart;});
  const treat=new THREE.Mesh(new THREE.CapsuleGeometry(.022,.055,3,8),new THREE.MeshStandardMaterial({color:0xb77943,roughness:.95}));
  treat.rotation.z=Math.PI/2;treat.visible=false;world.add(treat);
  // A fixed set of small cartoon props is reused every cycle. No debris or
  // geometry accumulates, and all marks fade after a few session seconds.
  const stream=new THREE.Mesh(new THREE.CylinderGeometry(.004,.006,1,7),new THREE.MeshBasicMaterial({color:0xf3d46c,transparent:true,opacity:.72,depthWrite:false}));
  stream.name='Short urine stream';stream.visible=false;world.add(stream);
  const wet=new THREE.Mesh(new THREE.CircleGeometry(.115,22),new THREE.MeshStandardMaterial({color:0x9a9366,roughness:.45,transparent:true,opacity:.38,depthWrite:false}));
  wet.name='Temporary wet mark';wet.rotation.x=-Math.PI/2;wet.visible=false;world.add(wet);
  const poop=new THREE.Group();poop.name='Tiny cartoon poop';poop.visible=false;world.add(poop);
  const poopMaterial=new THREE.MeshStandardMaterial({color:0x805335,roughness:1,transparent:true});
  const poopGeometry=new THREE.SphereGeometry(1,12,8);
  for(const [x,y,z,scale] of [[-.018,.026,0,.041],[.020,.028,.006,.036],[0,.062,0,.024]]){
    const piece=new THREE.Mesh(poopGeometry,poopMaterial);piece.position.set(x,y,z);piece.scale.set(scale,scale*.65,scale*.82);piece.castShadow=true;poop.add(piece);
  }
  let peeCount=0,poopCount=0,wetBorn=-Infinity,poopBorn=-Infinity,poopPending=false;
  const streamStart=new THREE.Vector3(),streamEnd=new THREE.Vector3(),streamDirection=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  function updateToiletEffects(){
    if(state.peeCount<peeCount||state.poopCount<poopCount){wetBorn=poopBorn=-Infinity;poopPending=false;}
    if(state.peeCount!==peeCount){peeCount=state.peeCount;wetBorn=-Infinity;}
    if(state.poopCount!==poopCount){poopCount=state.poopCount;poopPending=state.zone==='outdoors';}
    stream.visible=state.pose==='pee'&&state.zone==='outdoors'&&state.actionTime>.55&&state.actionTime<2.85;
    if(stream.visible){
      streamStart.copy(dog.localToWorld(new THREE.Vector3(.085,.185,-.19)));
      streamEnd.copy(dog.localToWorld(new THREE.Vector3(.29,.005,-.25)));
      streamDirection.subVectors(streamEnd,streamStart);stream.position.copy(streamStart).add(streamEnd).multiplyScalar(.5);
      stream.quaternion.setFromUnitVectors(up,streamDirection.clone().normalize());stream.scale.set(1,streamDirection.length(),1);
      if(!Number.isFinite(wetBorn)){wetBorn=state.time;wet.position.copy(streamEnd);wet.position.y=state.y+.002;}
    }
    const wetAge=state.time-wetBorn;wet.visible=wetAge>=0&&wetAge<9;
    wet.scale.set(THREE.MathUtils.clamp(wetAge,.2,1),THREE.MathUtils.clamp(wetAge,.2,1)*.7,1);
    wet.material.opacity=.38*THREE.MathUtils.clamp((9-wetAge)/4,0,1);
    if(poopPending&&state.pose==='poop'&&state.zone==='outdoors'&&state.actionTime>1.05){
      poopPending=false;poopBorn=state.time;poop.position.copy(dog.localToWorld(new THREE.Vector3(0,0,-.28)));poop.userData.floorY=state.y+.002;poop.rotation.y=dog.rotation.y;
    }
    // An interrupted squat never deposits a piece after the dog walks away.
    if(state.pose!=='poop')poopPending=false;
    const poopAge=state.time-poopBorn;poop.visible=poopAge>=0&&poopAge<8;
    if(poop.visible){poop.position.y=poop.userData.floorY+Math.max(0,.135-1.8*poopAge*poopAge);poopMaterial.opacity=THREE.MathUtils.clamp((8-poopAge)/3,0,1);}
  }
  const words=()=>copy[getLanguage()==='ko'?'ko':'en'];
  function setText(node,value){if(node.textContent!==value)node.textContent=value;}
  function refresh(){
    const c=words();setText(document.querySelector('#pet-title'),c.title);setText(document.querySelector('#pet-description'),c.intro);
    setText(petButton,c.pet);setText(callButton,c.call);setText(document.querySelector('#pet-free'),freePlay?c.stay:c.free);document.querySelector('#pet-free').setAttribute('aria-pressed',String(freePlay));setText(document.querySelector('#pet-close'),c.close);
    setText(treatButton,c.treat+(state.treatCooldown>0?` · ${Math.ceil(state.treatCooldown)}${c.seconds}`:''));
    const near=camera.position.distanceTo(dog.position)<5;
    const busy=state.action==='call'||state.paused;
    petButton.disabled=!near||busy||state.petCooldown>0;
    treatButton.disabled=!near||busy||state.treatCooldown>0;
    callButton.disabled=busy;
    const message=!near?c.near:state.action==='pet'?c.petStatus:state.action==='treat'?c.treatStatus:state.action==='call'?c.callStatus:c[state.action]||c.sit;
    setText(status,message);panel.dataset.action=state.action;
  }
  petButton.onclick=()=>{if(!petButton.disabled)behaviour.interact('pet');refresh();};
  treatButton.onclick=()=>{if(!treatButton.disabled)behaviour.interact('treat');refresh();};
  callButton.onclick=()=>{behaviour.interact('call');refresh();};
  document.querySelector('#pet-close').onclick=onClose;
  document.querySelector('#pet-free').onclick=()=>{freePlay=!freePlay;behaviour.setFocused(!freePlay);refresh();};
  function select(value){
    selected=value;freePlay=true;behaviour.setFocused(false);panel.hidden=!value;
    document.body.classList.toggle('pet-open',value);
    if(value){lastPosition.copy(dog.position);refresh();document.querySelector('#pet-close').focus({preventScroll:true});}
  }
  function update(dt,paused){
    behaviour.setPaused(paused);behaviour.update(dt);
    const delta=paused||!Number.isFinite(dt)||dt<=0?0:Math.min(dt,.25);
    dog.position.set(state.x,state.y,state.z);
    dog.rotation.y+=Math.atan2(Math.sin(state.heading-dog.rotation.y),Math.cos(state.heading-dog.rotation.y))*(reducedMotion?1:Math.min(1,delta*9));
    const pose=state.pose==='wag'?'pet':state.pose==='sniff'?'eat':state.pose;
    if(pose!==lastPose){for(const r of rig){r.position.copy(r.node.position);r.quaternion.copy(r.node.quaternion);r.scale.copy(r.node.scale);}poseAge=0;lastPose=pose;}
    poseAge+=delta;dog.userData.pose({type:pose,time:reducedMotion?0:state.time,blend:1});
    const transition=reducedMotion?1:THREE.MathUtils.smoothstep(poseAge,0,.32);
    if(transition<1)for(const r of rig){if(r.node===dog)continue;r.node.position.lerpVectors(r.position,r.node.position,transition);r.node.quaternion.slerpQuaternions(r.quaternion,r.node.quaternion,transition);r.node.scale.lerpVectors(r.scale,r.node.scale,transition);}
    dog.updateMatrixWorld(true);anchor.copy(dog.position).add(new THREE.Vector3(0,.68,0));
    updateToiletEffects();
    if(state.hearts!==lastHearts){lastHearts=state.hearts;heartAge=0;}
    heartAge+=delta;
    const head=dog.localToWorld(dog.userData.headAnchor.clone());
    hearts.forEach((heart,i)=>{const age=heartAge-i*.18;heart.visible=age>=0&&age<1.8;heart.position.copy(head).add(new THREE.Vector3((i-1)*.13,.18+(reducedMotion?0:age*.18),0));heart.material.opacity=reducedMotion?1:Math.max(0,1-age/1.8);});
    treat.visible=state.action==='treat'&&state.actionTime<2.6;treat.position.copy(dog.localToWorld(new THREE.Vector3(0,.028,.43)));treat.scale.setScalar(Math.max(.15,1-state.actionTime/3));
    fill.intensity=selected?1.7:0;fill.position.copy(dog.position).add(new THREE.Vector3(.4,1.3,1));
    container.dataset.petPose=state.pose;container.dataset.petAction=state.action;container.dataset.petPosition=JSON.stringify(dog.position.toArray());container.dataset.petHearts=String(state.hearts);container.dataset.petTreats=String(state.treats);container.dataset.petFocused=String(selected);container.dataset.petHeading=String(dog.rotation.y);
    container.dataset.petZone=state.zone;container.dataset.petSleeping=String(dog.userData.closedEyes);container.dataset.petUrineStream=String(stream.visible);container.dataset.petWetMark=String(wet.visible);container.dataset.petPoopVisible=String(poop.visible);
    if(selected)refresh();
  }
  update(0,false);
  return { dog,anchor,state,update,refresh,select,
    followDelta(){const delta=dog.position.clone().sub(lastPosition);lastPosition.copy(dog.position);return delta;},
  };
}
