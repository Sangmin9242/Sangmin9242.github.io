import * as THREE from './vendor/three.module.js';
import { sportsAvatar } from './sports-avatar.js?v=20261014-sports-pairs';
import { sportsFacilities } from './sports-facilities.js?v=20261014-sports-pairs';
import { scoreBowling, rollLayout, demoPlans } from './bowling-score.js';

export function hobbyWorld({world,reducedMotion,getLanguage=()=> 'en'}){
  const annex=new THREE.Group();annex.name='Sports annex';annex.position.set(19,0,-1);world.add(annex);
  const facility=sportsFacilities(annex),{football,bowling,ball,bowlingBalls,pins,sweepBars}=facility;
  const gripPoint=new THREE.Vector3();
  const person=sportsAvatar({identity:'sangmin',kit:'football'});annex.add(person);
  const goalkeeper=sportsAvatar({identity:'guest',kit:'football',color:0xba6741});football.add(goalkeeper);
  const partner=sportsAvatar({identity:'guest',gender:'female',kit:'bowling',color:0x927490});bowling.add(partner);
  const roomPoint=(x,z)=>new THREE.Vector3(x,.03,z).applyMatrix4(bowling.matrix);const roomInverse=bowling.matrix.clone().invert();
  const fieldStart=new THREE.Vector3(-.8,0,3.5),laneStart=roomPoint(-1.15,11.5),yAxis=new THREE.Vector3(0,1,0),turn=new THREE.Quaternion();
  function makePath(points){const curve=new THREE.CurvePath();for(let i=1;i<points.length;i++)if(points[i].distanceTo(points[i-1])>.01)curve.add(new THREE.LineCurve3(points[i-1],points[i]));return curve;}
  const transitPoints=[fieldStart,new THREE.Vector3(-3.6,0,8.6),new THREE.Vector3(15.2,0,8.8),new THREE.Vector3(15.2,0,15.15),laneStart],walkPath=makePath(transitPoints);
  let preparedWalkKey='',preparedWalk=walkPath;
  function bowlingPosePoint(){const phase=gameTime%8,done=Math.floor(gameTime/8)>=demoPlans.sangmin.length,z=done?11.5:11.5-THREE.MathUtils.smoothstep(phase,0,1.8)*2.2+THREE.MathUtils.smoothstep(phase,6.4,7.7)*2.2;return roomPoint(-1.15,z);}
  function currentWalk(){const key=gameTime.toFixed(6);if(key!==preparedWalkKey){preparedWalkKey=key;preparedWalk=makePath([...transitPoints.slice(0,-1),bowlingPosePoint()]);}return preparedWalk;}

  let mode='auto',start=performance.now()/1000,transition=null,previous=start,gameTime=0,scoreKey='';
  const data=document.querySelector('#scene').dataset;
  data.footballPlayers='2';data.bowlingPlayers='2';data.bowlingPartnerGender='female';data.sportsAnnex=JSON.stringify(annex.position.toArray());
  person.position.copy(fieldStart);
  function setKit(kind){const kit=kind==='bowling'?'bowling':'football';if(person.userData.kit!==kit)person.userData.setKit(kit);data.hobbyKit=kit;}
  function facing(direction){turn.setFromAxisAngle(yAxis,Math.atan2(direction.x,direction.z));person.quaternion.slerp(turn,.2);}
  function select(kind){
    if(kind===mode&&transition)return;const now=performance.now()/1000,current=person.position.clone(),target=kind==='bowling'?bowlingPosePoint():fieldStart,points=[current];
    if(current.distanceTo(target)>.35&&!reducedMotion){
      const roomLocal=current.clone().applyMatrix4(roomInverse),inside=roomLocal.x>-3.43&&roomLocal.x<3.43&&roomLocal.z>-12.4&&roomLocal.z<14.4;
      if(kind==='bowling'&&!inside){
        if(current.z<8.8)points.push(new THREE.Vector3(-3.6,0,8.6),new THREE.Vector3(15.2,0,8.8));
        else if(current.x<14.8&&current.z<10.65)points.push(new THREE.Vector3(15.2,0,8.8));
        points.push(new THREE.Vector3(15.2,0,15.15));
      }else if(kind!=='bowling'&&current.z>=8.6){
        if(inside)points.push(new THREE.Vector3(15.2,0,current.z));
        if(current.z>8.8)points.push(new THREE.Vector3(15.2,0,8.8));
        points.push(new THREE.Vector3(-3.6,0,8.6));
      }
      points.push(target.clone());const curve=makePath(points);transition={curve,started:now,duration:Math.max(.5,curve.getLength()/2.7)};
    }else transition=null;
    mode=kind;start=now;facility.setFocus(kind);setKit(kind);
  }
  function footballMotion(t){
    setKit('football');const u=Math.min(t/4.6,1),x=-.8*(1-u)+Math.sin(u*Math.PI*4)*.12,z=3.5-u*6.1;
    person.position.set(x,0,z);person.rotation.y=Math.PI;person.userData.pose(t,t<4.6||t>6);
    goalkeeper.position.set(Math.sin(t*.8)*.12,0,-6.4);goalkeeper.rotation.y=0;goalkeeper.userData.pose(t,t>=6&&t<7.5,.13);
    if(t<4.6){ball.position.set(x,.13,z-.42);data.footballPhase='dribble';}
    else if(t<6){const s=(t-4.6)/1.4;ball.position.set(s*.9,.13+Math.sin(s*Math.PI)*.45,-3.02-s*4.73);person.userData.sportRig.legs[1].leg.rotation.x=-Math.sin(Math.min((t-4.6)*4,Math.PI))*.95;goalkeeper.position.x=s*.35;data.footballPhase='shot';}
    else if(t<7.5){const u=(t-6)/1.5;goalkeeper.position.set(.35+u*.55,0,-6.4-u*.65);person.position.copy(new THREE.Vector3(0,0,-2.6)).lerp(fieldStart,u);person.rotation.y=0;ball.position.set(.9,.13,-7.75+u*.6);data.footballPhase='goal';}
    else if(t<9.2){const s=(t-7.5)/1.7;ball.position.set(.9+(-.8-.9)*s,.13,-7.15+s*10.23);person.position.copy(fieldStart);person.rotation.y=Math.PI;person.userData.pose(t,false);goalkeeper.position.set(.9*(1-s),0,-7.05+s*.65);goalkeeper.userData.sportRig.legs[0].leg.rotation.x=-Math.sin(s*Math.PI)*.6;data.footballPhase='pass';}
    else{person.position.copy(fieldStart);person.rotation.y=Math.PI;person.userData.pose(t,false);ball.position.set(-.8,.13,3.08);data.footballPhase='ready';}
    ball.rotation.x=-t*7;data.footballPartnerPosition=JSON.stringify(goalkeeper.position.toArray());
  }
  const layouts=[demoPlans.sangmin,demoPlans.partner].map(plan=>plan.map((_,i)=>rollLayout(plan,i)));
  const shotDuration=8,impact=5.4,gameDuration=Math.max(demoPlans.sangmin.length,demoPlans.partner.length)*shotDuration+12;
  function bowler(actor,lane,t,index,active){
    const x=lane?1.15:-1.15,plan=lane?demoPlans.partner:demoPlans.sangmin,layout=layouts[lane][Math.min(index,plan.length-1)],done=index>=plan.length,phase=done?0:t;
    if(actor===person)setKit('bowling');const approach=THREE.MathUtils.smoothstep(phase,0,1.8),back=THREE.MathUtils.smoothstep(phase,6.4,7.7),z=11.5-approach*2.2+back*2.2;
    if(actor===person)actor.position.copy(roomPoint(x,z));else actor.position.set(x,.03,z);actor.rotation.y=Math.PI+(actor===person?bowling.rotation.y:0);
    const bend=approach*(1-back);actor.userData.pose(phase,active&&!done&&(phase<1.8||phase>6.4),bend);
    const rig=actor.userData.sportRig;rig.hip.position.y=Math.max(...rig.legs.map(({leg,knee})=>.415*Math.cos(leg.rotation.x)+.415*Math.cos(leg.rotation.x+knee.rotation.x)+.07));rig.upper.rotation.x=.9*bend;rig.arms[1].arm.rotation.x=.65*(1-approach)-.9*bend;
    actor.updateWorldMatrix(true,true);const hand=rig.arms[1].elbow.getObjectByName('hand');gripPoint.set(0,-.07,.035);hand.localToWorld(gripPoint);bowling.worldToLocal(gripPoint);
    actor.userData.bowlingRelease??=gripPoint.clone();
    const ball=bowlingBalls[lane];ball.visible=!done&&(phase<6.4||!active);
    if(phase<1.8){ball.position.copy(gripPoint);actor.userData.bowlingRelease.copy(gripPoint);}
    else{const progress=THREE.MathUtils.clamp((phase-1.8)/(impact-1.8),0,1);const release=actor.userData.bowlingRelease;ball.position.set(THREE.MathUtils.lerp(release.x,x,Math.min(progress*3,1)),THREE.MathUtils.lerp(release.y,.15,Math.min(progress*6,1)),THREE.MathUtils.lerp(release.z,facility.head-.2,progress));}
    ball.rotation.x=-phase*10;
    const fall=THREE.MathUtils.smoothstep(phase,impact,6.2),clearing=THREE.MathUtils.smoothstep(phase,6.6,7.6);
    pins[lane].forEach((pin,i)=>{
      const hit=layout.hit.includes(i);if(done){pin.visible=layout.standing.includes(i)&&!hit;pin.rotation.set(0,0,0);pin.position.y=.042;return;}pin.visible=layout.standing.includes(i)&&!(hit&&phase>6.6);pin.rotation.set(hit?-fall*(1.4+(i%3)*.1):0,0,hit?fall*(i%2?.23:-.23):0);
      pin.position.y=.042+(hit?fall*.065:Math.sin(clearing*Math.PI)*.65);
    });
    const sweep=sweepBars[lane];sweep.visible=!done&&phase>6.6&&phase<7.6;sweep.position.z=facility.head+.55-clearing*1.9;
    if(lane===0){data.bowlingPhase=done?'finished':!active?'waiting':phase<1.8?'windup':phase<impact?'rolling':phase<6.6?'pins-falling':'reset';data.bowlingPinFall=String(fall);data.bowlingStandingPins=String(layout.standing.length);data.bowlingHitPins=String(layout.pins);}
  }
  function scores(clock){
    const counts=[demoPlans.sangmin,demoPlans.partner].map((plan,i)=>reducedMotion?plan.length:Math.min(plan.length,Math.max(0,Math.floor((clock-i*2-impact)/shotDuration)+1)));
    const results=[scoreBowling(demoPlans.sangmin.slice(0,counts[0])),scoreBowling(demoPlans.partner.slice(0,counts[1]))],lang=getLanguage(),key=counts.join(',')+lang;
    data.bowlingSangminScore=String(results[0].total);data.bowlingPartnerScore=String(results[1].total);data.bowlingRollCounts=JSON.stringify(counts);
    if(key===scoreKey)return;scoreKey=key;
    const names=[lang==='ko'?'이상민':'Sangmin',lang==='ko'?'플레이어 2':'Player 2'],ctx=facility.scoreCanvas.getContext('2d');
    ctx.fillStyle='#101e2a';ctx.fillRect(0,0,1024,256);ctx.font='bold 27px sans-serif';ctx.fillStyle='#dfeeea';ctx.fillText(lang==='ko'?'친선 게임':'Friendly game',20,36);
    const tbody=document.querySelector('#bowling-score-table tbody');tbody?.replaceChildren();
    results.forEach((result,row)=>{
      const y=90+row*86,leading=result.total>results[1-row].total;ctx.fillStyle=leading?'#95dcc5':'#ecf0f2';ctx.font='23px sans-serif';ctx.fillText(names[row],15,y+26);
      const tr=document.createElement('tr'),name=document.createElement('th');name.scope='row';name.textContent=names[row];tr.classList.toggle('leading',leading);tr.append(name);
      result.frames.forEach((frame,i)=>{
        const x=150+i*74;ctx.strokeStyle='#405765';ctx.strokeRect(x,y-20,74,67);ctx.fillStyle='#ebefea';ctx.font='21px sans-serif';ctx.fillText(frame.marks.join(' '),x+8,y+3);ctx.fillStyle='#9dcbbd';ctx.fillText(frame.cumulative===null?'':String(frame.cumulative),x+8,y+32);
        const td=document.createElement('td'),marks=document.createElement('span'),total=document.createElement('b');marks.textContent=frame.marks.join(' ')||'·';total.textContent=frame.cumulative===null?'':String(frame.cumulative);td.append(marks,total);tr.append(td);
      });const total=document.createElement('td');total.className='score-total';total.textContent=String(result.total);tr.append(total);tbody?.append(tr);ctx.fillStyle=leading?'#95dcc5':'#ecf0f2';ctx.font='bold 35px sans-serif';ctx.fillText(String(result.total),915,y+28);
    });facility.scoreTexture.needsUpdate=true;
  }
  function animate(time){
    const delta=Math.max(0,time-previous);previous=time;const night=Number(data.streetLights)>0;facility.setLights(night);data.hobbyLights=String(night?3:0);
    data.footballPhase='inactive';data.bowlingPhase='inactive';goalkeeper.userData.pose(time,false,.08);
    if(transition){
      const u=THREE.MathUtils.clamp((time-transition.started)/transition.duration,0,1);person.position.copy(transition.curve.getPointAt(u));facing(transition.curve.getTangentAt(Math.min(u,.999)));person.userData.pose(time,true);
      bowler(partner,1,0,0,false);scores(gameTime);data.hobbyActivity='walking';data.hobbyAvatarPosition=JSON.stringify(person.position.toArray());if(u<1)return;transition=null;start=time;
    }
    const elapsed=Math.max(0,time-start),cycle=elapsed%96;let activity=mode,t=mode==='football'?elapsed%12:elapsed;
    if(mode==='auto'){activity=cycle<12?'football':cycle<30?'walking':cycle<78?'bowling':'walking';t=cycle<12?cycle:cycle<78?cycle-30:cycle-78;}
    if(reducedMotion){activity=mode==='bowling'?'bowling':'football';t=0;}
    if(activity==='football'){footballMotion(t);bowler(partner,1,0,0,false);}
    else if(activity==='bowling'){
      if(!reducedMotion&&world.visible)gameTime=(gameTime+delta)%gameDuration;
      for(const [actor,lane] of [[person,0],[partner,1]]){const clock=Math.max(0,gameTime-lane*2),index=Math.floor(clock/shotDuration);bowler(actor,lane,reducedMotion?0:clock%shotDuration,index,!reducedMotion);}
    }else{
      const u=cycle<30?(cycle-12)/18:1-(cycle-78)/18;person.position.copy(currentWalk().getPointAt(THREE.MathUtils.clamp(u,0,1)));const heading=currentWalk().getTangentAt(THREE.MathUtils.clamp(u,.001,.999));if(cycle>=78)heading.negate();facing(heading);person.userData.pose(time,true);bowler(partner,1,0,0,false);
    }
    scores(gameTime);data.hobbyActivity=activity;data.hobbyAvatarPosition=JSON.stringify(person.position.toArray());
  }
  goalkeeper.position.set(0,0,-6.4);ball.position.set(-.8,.13,3.08);bowler(partner,1,0,0,false);scores(0);
  const anchor=group=>group.localToWorld(new THREE.Vector3(0,1,0));annex.updateMatrixWorld(true);
  return {football,bowling,animate,select,reset(){select('auto');},anchors:{football:anchor(football),bowling:anchor(bowling)}};
}
