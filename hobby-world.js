import * as THREE from './vendor/three.module.js';
import { boardingAvatar } from './boarding-avatar.js?v=20261014-hobbies';

export function hobbyWorld({world,reducedMotion}) {
  const football=new THREE.Group(),bowling=new THREE.Group();
  football.position.set(19,0,-1);bowling.position.set(19,0,13);
  world.add(football,bowling);
  const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.8,...extra});
  const white=material(0xeeeae0),steel=material(0x566775,{metalness:.5}),wood=material(0xc39860,{roughness:.35});
  function box(parent,w,h,d,x,y,z,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.receiveShadow=true;m.castShadow=true;parent.add(m);return m;}
  function line(parent,points,color=0xf0eee1){const m=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color}));parent.add(m);return m;}
  function rod(parent,a,b,r=.025,mat=white){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,start.distanceTo(end),10),mat);m.position.copy(start).add(end).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());parent.add(m);return m;}
  function sign(parent,text,x,y,z,w){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#173a4a';ctx.fillRect(0,0,512,128);ctx.fillStyle='#e9f1ed';ctx.font='500 58px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,83);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;return box(parent,w,w/4,.05,x,y,z,material(0xffffff,{map,emissive:0xffffff,emissiveMap:map,emissiveIntensity:.3}));}
  // A small practice pitch, with goal frames and netting at both ends.
  box(football,9.4,.12,12.4,0,-.06,0,material(0x3c5147));
  for(let i=0;i<8;i++)box(football,9,.015,1.5,0,.0075,-5.25+i*1.5,material(i%2?0x3e7653:0x467f5a));
  line(football,[[-4.1,.026,-5.5],[4.1,.026,-5.5],[4.1,.026,5.5],[-4.1,.026,5.5],[-4.1,.026,-5.5]]);
  line(football,[[-4.1,.026,0],[4.1,.026,0]]);
  const center=new THREE.Mesh(new THREE.TorusGeometry(.95,.018,6,48),white);center.rotation.x=Math.PI/2;center.position.y=.026;football.add(center);
  for(const side of [-1,1]){
    const z=side*5.5,back=z+side*.6;
    for(const x of [-1.4,1.4]){rod(football,[x,.02,z],[x,1.5,z]);rod(football,[x,1.5,z],[x,1.5,back]);rod(football,[x,0,back],[x,1.5,back]);}
    rod(football,[-1.4,1.5,z],[1.4,1.5,z]);rod(football,[-1.4,1.5,back],[1.4,1.5,back]);
    for(let x=-1.4;x<=1.41;x+=.2)line(football,[[x,.03,back],[x,1.5,back]],0xc6d3cd);
    for(let y=.1;y<=1.5;y+=.2)line(football,[[-1.4,y,back],[1.4,y,back]],0xc6d3cd);
    line(football,[[-2.3,.027,z],[-2.3,.027,z-side*1.5],[2.3,.027,z-side*1.5],[2.3,.027,z]]);
  }
  box(football,.5,.12,3,-4.7,.5,0,wood);for(const z of [-1,1])box(football,.12,.5,.12,-4.7,.24,z,steel);
  sign(football,'Football',0,1.1,-6.3,2.3);for(const x of [-.8,.8])rod(football,[x,0,-6.3],[x,1.4,-6.3],.035,steel);
  const ballCanvas=document.createElement('canvas');ballCanvas.width=256;ballCanvas.height=128;const ctx=ballCanvas.getContext('2d');ctx.fillStyle='#eeeae2';ctx.fillRect(0,0,256,128);ctx.fillStyle='#24323a';for(let row=0;row<4;row++)for(let col=0;col<8;col++){const x=col*32+(row%2)*16,y=row*32+16;ctx.beginPath();for(let k=0;k<5;k++){const a=k*Math.PI*2/5;ctx.lineTo(x+Math.cos(a)*9,y+Math.sin(a)*9);}ctx.closePath();ctx.fill();}const footballMap=new THREE.CanvasTexture(ballCanvas);footballMap.colorSpace=THREE.SRGBColorSpace;
  const ball=new THREE.Mesh(new THREE.SphereGeometry(.15,24,16),material(0xffffff,{map:footballMap}));ball.castShadow=true;football.add(ball);
  // Open-front room keeps the athlete and the two polished lanes visible.
  box(bowling,8.5,.16,11,0,-.08,0,material(0x4a5157));
  box(bowling,8.5,3.1,.16,0,1.55,-5.5,material(0x173a4a));
  for(const x of [-4.2,4.2]){box(bowling,.15,2.2,11,x,1.1,0,material(0x54727e));box(bowling,.17,.08,11,x,2.25,0,steel);}
  const pins=[];
  const profile=[[0,0],[.085,.035],[.1,.13],[.085,.23],[.045,.32],[.047,.39],[.062,.44],[.045,.49],[0,.5]].map(p=>new THREE.Vector2(...p));
  for(const laneX of [-1.25,1.25]){
    box(bowling,1.3,.025,8,laneX,.0125,-.25,wood);
    for(let i=0;i<6;i++)line(bowling,[[laneX-.55+i*.22,.03,-4.25],[laneX-.55+i*.22,.03,3.75]],0xa7804a);
    for(const side of [-1,1])box(bowling,.18,.04,8,laneX+side*.75,.005,-.25,steel);
    line(bowling,[[laneX-.65,.032,2.2],[laneX+.65,.032,2.2]],0x27475b);
    for(let row=0;row<4;row++)for(let col=0;col<=row;col++){
      const pin=new THREE.Group();pin.position.set(laneX+(col-row/2)*.23,.026,-3.05-row*.23);bowling.add(pin);
      const body=new THREE.Mesh(new THREE.LatheGeometry(profile,16),white);pin.add(body);
      for(const y of [.32,.37]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.048,.012,6,16),material(0xc75452));ring.rotation.x=Math.PI/2;ring.position.y=y;pin.add(ring);}
      if(laneX<0)pins.push(pin);
    }
  }
  sign(bowling,'Bowling',0,2.15,-5.38,3.4);
  box(bowling,1.8,.4,.8,2.65,.2,4.1,material(0x8c7661));box(bowling,.4,.65,1,0,.325,2.9,steel);
  for(let i=0;i<3;i++){const rackBall=new THREE.Mesh(new THREE.SphereGeometry(.16,20,12),material([0x426a9b,0x9462a0,0xc47b56][i],{roughness:.2}));rackBall.position.set(0,.75,2.55+i*.34);bowling.add(rackBall);}
  const bowlingBall=new THREE.Mesh(new THREE.SphereGeometry(.145,24,16),material(0x5c4b98,{roughness:.18,metalness:.15}));bowling.add(bowlingBall);
  const person=boardingAvatar({sport:true});world.add(person);
  const fieldStart=new THREE.Vector3(18.2,0,1.7),laneStart=new THREE.Vector3(17.75,0,16.2);
  const walkPath=new THREE.CatmullRomCurve3([fieldStart,new THREE.Vector3(19,0,4.7),new THREE.Vector3(14.1,0,6.5),new THREE.Vector3(14.1,0,19),new THREE.Vector3(17.75,0,19),laneStart]);
  const sportLights=[];
  for(const [parent,x,z,height,intensity] of [[football,4.8,0,5.3,650],[bowling,4.5,1.5,3.7,420]]){
    box(parent,.09,height,.09,x,height/2,z,steel);box(parent,.6,.15,.5,x,height,z,steel);
    const light=new THREE.SpotLight(0xffefd5,0,22,1.15,.8,2);light.position.set(x,height-.12,z);light.target.position.set(0,0,0);parent.add(light,light.target);sportLights.push({light,intensity});
  }
  let mode='auto',start=performance.now()/1000,transition=null;
  const data=document.querySelector('#scene').dataset;
  function select(kind){
    if(kind===mode&&transition)return;
    const now=performance.now()/1000,target=kind==='bowling'?laneStart:fieldStart,current=person.position.clone(),points=[current];
    if(current.distanceTo(target)>.5&&!reducedMotion){
      const insideRoom=current.x>14.8&&current.x<23.2&&current.z>7.5&&current.z<18.5;
      if(kind==='bowling'&&!insideRoom){
        if(current.z<6.5)points.push(new THREE.Vector3(19,0,4.7),new THREE.Vector3(14.1,0,6.5));
        if(current.z<18.5)points.push(new THREE.Vector3(14.1,0,19));
        points.push(new THREE.Vector3(17.75,0,19));
      }else if(kind!=='bowling'&&current.z>=6.5){
        if(insideRoom)points.push(new THREE.Vector3(17.75,0,19),new THREE.Vector3(14.1,0,19));
        else if(current.z>=18.5)points.push(new THREE.Vector3(14.1,0,19));
        points.push(new THREE.Vector3(14.1,0,6.5),new THREE.Vector3(19,0,4.7));
      }
      points.push(target.clone());const curve=new THREE.CatmullRomCurve3(points);transition={curve,started:now,duration:Math.max(.5,curve.getLength()/2.5)};
    }else transition=null;
    mode=kind;start=now;
  }
  function footballMotion(t){
    const p=person.userData.sportRig,u=Math.min(t/4.8,1),x=-.8*(1-u)+Math.sin(u*Math.PI*4)*.16,z=2.7-u*5.1;
    person.position.set(19+x,0,-1+z);person.rotation.y=Math.PI;person.userData.pose(t,t<4.8||t>7.2);
    if(t<4.8){ball.position.set(x+Math.sin(t*8)*.035,.17,z-.47);data.footballPhase='dribble';}
    else if(t<6.2){const s=(t-4.8)/1.4;ball.position.set(0,.17+Math.sin(s*Math.PI)*.48,-2.87-s*2.55);p.legs[1].leg.rotation.x=-Math.sin(Math.min((t-4.8)*4,Math.PI))*.9;data.footballPhase='shot';}
    else if(t<7.2){ball.position.set(0,.17,-5.42+(t-6.2)*.3);data.footballPhase='goal';}
    else{const s=(t-7.2)/1.3;person.position.copy(new THREE.Vector3(19,0,-3.4)).lerp(fieldStart,s);person.rotation.y=0;ball.position.set(-.8*s,.17,-5.12+s*7.35);data.footballPhase='return';}
    ball.rotation.x=-t*6;
  }
  function bowlingMotion(t){
    person.position.copy(laneStart);person.rotation.y=Math.PI;person.userData.pose(t,false);const {upper,arms}=person.userData.sportRig;
    const throwing=THREE.MathUtils.smoothstep(t,.5,1.8);upper.rotation.x=.25*Math.sin(throwing*Math.PI);arms[1].arm.rotation.x=.7-throwing*1.5;arms[1].elbow.rotation.x=-.1;
    if(t<1.8){bowlingBall.visible=true;bowlingBall.position.set(-1.5,.7-throwing*.55,3.0-throwing*.65);data.bowlingPhase='windup';}
    else if(t<5){bowlingBall.visible=true;bowlingBall.position.set(-1.25,.17,2.35-(t-1.8)/3.2*5.5);data.bowlingPhase='rolling';}
    else{bowlingBall.visible=t<6.2;bowlingBall.position.set(-1.25,.17,-3.15-(t-5)*.7);data.bowlingPhase=t<6.5?'pins-falling':'reset';}
    const fall=THREE.MathUtils.smoothstep(t,5,6.1)*(1-THREE.MathUtils.smoothstep(t,8,9));
    pins.forEach((pin,i)=>{pin.rotation.x=-fall*(1.2+(i%3)*.15);pin.rotation.z=fall*((i%2?1:-1)*.3);pin.position.y=.026+fall*.08;});data.bowlingPinFall=String(fall);bowlingBall.rotation.x=-t*8;
  }
  function animate(time){
    const night=Number(data.streetLights)>0;sportLights.forEach(({light,intensity})=>light.intensity=night?intensity:0);data.hobbyLights=String(night?2:0);
    if(transition){
      const progress=THREE.MathUtils.clamp((time-transition.started)/transition.duration,0,1),point=transition.curve.getPointAt(progress),heading=transition.curve.getTangentAt(progress);
      person.position.copy(point);person.rotation.y=Math.atan2(heading.x,heading.z);person.userData.pose(time,true);
      data.hobbyActivity='walking';data.footballPhase='inactive';data.bowlingPhase='inactive';data.hobbyAvatarPosition=JSON.stringify(person.position.toArray());
      if(progress<1)return;transition=null;start=time;
    }
    const elapsed=Math.max(0,time-start),cycle=elapsed%31.5;
    let activity=mode,t=mode==='football'?elapsed%8.5:elapsed%10;
    if(mode==='auto'){activity=cycle<8.5?'football':cycle<15?'walking':cycle<25?'bowling':'walking';t=cycle<8.5?cycle:cycle<25?cycle-15:cycle-25;}
    if(reducedMotion){activity=mode==='bowling'?'bowling':'football';t=0;}
    data.footballPhase='inactive';data.bowlingPhase='inactive';
    if(activity==='football')footballMotion(t);else if(activity==='bowling')bowlingMotion(t);else{
      const u=cycle<15?(cycle-8.5)/6.5:1-(cycle-25)/6.5,point=walkPath.getPointAt(THREE.MathUtils.clamp(u,0,1)),direction=walkPath.getTangentAt(THREE.MathUtils.clamp(u,0,1));person.position.copy(point);person.rotation.y=Math.atan2(direction.x,direction.z)+(cycle>=25?Math.PI:0);person.userData.pose(time,true);
    }
    data.hobbyActivity=activity;data.hobbyAvatarPosition=JSON.stringify(person.position.toArray());data.hobbyLights=String(night?2:0);
  }
  ball.position.set(-.8,.17,2.23);bowlingBall.position.set(-1.5,.7,3);person.position.copy(fieldStart);
  return {football,bowling,animate,select,reset(){select('auto');},anchors:{football:new THREE.Vector3(19,1,-1),bowling:new THREE.Vector3(19,1,13)}};
}
