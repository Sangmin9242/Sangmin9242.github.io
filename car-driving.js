import {roadOutline as defaultRoad,forecourtPads as defaultPads} from './driveway-layout.js';

// Renderer-independent bicycle model. +Z is forward; the driver's right is -X.
const STEP=1/240,EPS=1e-8;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(n,fallback)=>Number.isFinite(n)?n:fallback;
const positive=(n,fallback)=>Number.isFinite(n)&&n>0?n:fallback;
const approach=(value,target,amount)=>value<target?Math.min(target,value+amount):Math.max(target,value-amount);
const cross=(a,b)=>a.x*b.z-a.z*b.x;
const normalize=a=>Math.atan2(Math.sin(a),Math.cos(a));

function rectangle(c,width,length){
  const s=Math.sin(c.heading||0),co=Math.cos(c.heading||0);
  return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([side,front])=>({x:c.x+side*width/2*co+front*length/2*s,z:c.z-side*width/2*s+front*length/2*co}));
}
function inside(p,polygon){
  let yes=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[j],b=polygon[i],dx=b.x-a.x,dz=b.z-a.z;
    if(Math.abs((p.x-a.x)*dz-(p.z-a.z)*dx)<EPS&&p.x>=Math.min(a.x,b.x)-EPS&&p.x<=Math.max(a.x,b.x)+EPS&&p.z>=Math.min(a.z,b.z)-EPS&&p.z<=Math.max(a.z,b.z)+EPS)return true;
    if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)yes=!yes;
  }
  return yes;
}
function covered(body,regions,boundaries){
  const paved=p=>regions.some(region=>p.x>=region.minX-EPS&&p.x<=region.maxX+EPS&&p.z>=region.minZ-EPS&&p.z<=region.maxZ+EPS&&inside(p,region.points));
  if(!body.every(paved))return false;
  // Split each body edge at pavement boundaries. This also catches concave notches
  // between otherwise valid corners and permits edges crossing adjoining pads.
  for(let i=0;i<4;i++){
    const a=body[i],b=body[(i+1)%4],r={x:b.x-a.x,z:b.z-a.z},cuts=[0,1];
    for(const [c,d] of boundaries){
      const s={x:d.x-c.x,z:d.z-c.z},den=cross(r,s);
      if(Math.abs(den)<EPS)continue;
      const q={x:c.x-a.x,z:c.z-a.z},t=cross(q,s)/den,u=cross(q,r)/den;
      if(t>EPS&&t<1-EPS&&u>=-EPS&&u<=1+EPS)cuts.push(t);
    }
    cuts.sort((a,b)=>a-b);
    for(let j=1;j<cuts.length;j++){
      const t=(cuts[j-1]+cuts[j])/2;
      if(!paved({x:a.x+r.x*t,z:a.z+r.z*t}))return false;
    }
  }
  return true;
}
function overlaps(a,b){
  for(const poly of [a,b])for(let i=0;i<2;i++){
    const p=poly[i],q=poly[i+1],axis={x:-(q.z-p.z),z:q.x-p.x};
    const aa=a.map(p=>p.x*axis.x+p.z*axis.z),bb=b.map(p=>p.x*axis.x+p.z*axis.z);
    if(Math.max(...aa)<=Math.min(...bb)+EPS||Math.max(...bb)<=Math.min(...aa)+EPS)return false;
  }
  return true;
}
function arc(start,distance,curvature){
  const angle=distance*curvature;
  if(Math.abs(curvature)<1e-10)return {...start,x:start.x+distance*Math.sin(start.heading),z:start.z+distance*Math.cos(start.heading)};
  return {...start,x:start.x+(Math.cos(start.heading)-Math.cos(start.heading+angle))/curvature,z:start.z+(Math.sin(start.heading+angle)-Math.sin(start.heading))/curvature,heading:normalize(start.heading+angle)};
}

export function createCarDriving(spec={}){
  const source=spec.car||{},position=spec.position||[];
  const initial={x:finite(source.x,finite(position[0],0)),y:finite(source.y,finite(position[1],-.075)),z:finite(source.z,finite(position[2],22.45)),heading:finite(source.heading,0)};
  const width=positive(spec.width,1.86)+.3,length=positive(spec.length,4.9)+.08;
  const wheelbase=clamp(positive(spec.wheelbase,2.8),.5,10),radius=clamp(positive(spec.wheelRadius,.33),.05,2);
  const road=spec.roadOutline??defaultRoad,pads=spec.forecourtPads??defaultPads;
  const polygons=[road.map(p=>({x:p[0],z:p[1]})),...pads.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)&&p.width>0&&p.length>0).map(p=>rectangle(p,p.width,p.length))].filter(p=>p.length>=3&&p.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.z)));
  const regions=polygons.map(points=>({points,minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minZ:Math.min(...points.map(p=>p.z)),maxZ:Math.max(...points.map(p=>p.z))}));
  const boundaries=polygons.flatMap(p=>p.map((a,i)=>[a,p[(i+1)%p.length]]));
  const obstacles=(spec.obstacles??[]).filter(o=>Number.isFinite(o.x)&&Number.isFinite(o.z)&&o.width>0&&o.length>0).map(o=>rectangle({...o,heading:finite(o.heading,0)},o.width+.06,o.length+.06));
  const state={phase:'driving',car:{...initial},speed:0,steering:0,wheelAngle:0,blocked:false};
  const input={throttle:0,steer:0,brake:false},history=[];
  let accumulator=0,returnDistance=0,returnSpeed=0,returnStopDistance=0;
  function canOccupy(car=state.car){
    if(!car||!['x','y','z','heading'].every(key=>Number.isFinite(car[key])))return false;
    const body=rectangle(car,width,length);
    return body.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z))&&covered(body,regions,boundaries)&&!obstacles.some(o=>overlaps(body,o));
  }
  function clearInput(){input.throttle=0;input.steer=0;input.brake=false;}
  function complete(){Object.assign(state.car,initial);state.phase='complete';state.speed=0;state.steering=0;state.blocked=false;accumulator=0;}
  function record(start,end,distance,curvature){
    const last=history.at(-1);
    if(last&&Math.abs(last.curvature-curvature)<1e-12&&Math.sign(last.distance)===Math.sign(distance)){last.distance+=distance;last.end={...end};}
    else history.push({start,end:{...end},distance,curvature,steering:state.steering});
  }
  function nextRunLength(){
    let distance=0;
    const sign=Math.sign(history.at(-1)?.distance??0);
    for(let i=history.length-1;i>=0&&Math.sign(history[i].distance)===sign;i--)distance+=Math.abs(history[i].distance);
    return distance;
  }
  function drive(){
    state.steering=approach(state.steering,-input.steer*.58,3*STEP);
    const prior=state.speed;
    if(input.brake)state.speed=approach(prior,0,8.5*STEP);
    else if(input.throttle===0)state.speed=approach(prior,0,.9*STEP);
    else if(prior*input.throttle<0)state.speed=approach(prior,0,5.5*Math.abs(input.throttle)*STEP);
    else state.speed=clamp(prior+input.throttle*(input.throttle>0?2.8:2)*STEP,-3.5,8);
    const distance=(prior+state.speed)/2*STEP;
    if(Math.abs(distance)<1e-12)return;
    const curvature=Math.tan(state.steering)/wheelbase,start={...state.car},candidate=arc(start,distance,curvature);
    if(!canOccupy(candidate)){state.speed=0;state.blocked=true;return;}
    state.blocked=false;Object.assign(state.car,candidate);state.wheelAngle+=distance/radius;record(start,candidate,distance,curvature);
  }
  function recover(){
    const remaining=Math.max(0,returnStopDistance);
    // Stop at recorded forward/reverse changes as well as the original checkpoint.
    returnSpeed=Math.min(4,returnSpeed+3*STEP,Math.sqrt(2*3*remaining));
    let budget=Math.min(remaining,returnSpeed*STEP),signedDistance=0,lastSteering=0;
    while(budget>1e-12&&history.length){
      const segment=history.at(-1),available=Math.abs(segment.distance)-returnDistance,take=Math.min(available,budget),sign=Math.sign(segment.distance);
      returnDistance+=take;returnStopDistance=Math.max(0,returnStopDistance-take);budget-=take;signedDistance-=sign*take;
      lastSteering=segment.steering;
      if(returnDistance>=Math.abs(segment.distance)-1e-10){
        Object.assign(state.car,segment.start);history.pop();returnDistance=0;
        if(history.length&&Math.sign(history.at(-1).distance)!==sign){returnSpeed=0;returnStopDistance=nextRunLength();break;}
      }
      else Object.assign(state.car,arc(segment.start,segment.distance-sign*returnDistance,segment.curvature));
    }
    state.speed=signedDistance/STEP;state.wheelAngle+=signedDistance/radius;state.steering=lastSteering;
    if(!history.length)complete();
  }
  return {
    state,clearInput,canOccupy,
    setInput(next={}){
      if(state.phase!=='driving')return;
      if(!next||typeof next!=='object'){clearInput();return;}
      for(const key of ['throttle','steer'])if(Object.hasOwn(next,key))input[key]=clamp(finite(next[key],0),-1,1);
      if(Object.hasOwn(next,'brake'))input.brake=next.brake===true;
    },
    update(dt,paused=false){
      if(paused||state.phase==='complete'||!Number.isFinite(dt)||dt<=0)return state;
      // Limit a single stalled-frame request, while keeping every admitted step small.
      accumulator+=Math.min(dt,10);
      const returning=state.phase==='returning',wheelBefore=state.wheelAngle;
      let steps=0;
      while(accumulator>=STEP-1e-10&&state.phase!=='complete'){
        accumulator=Math.max(0,accumulator-STEP);
        if(state.phase==='driving')drive();else recover();
        steps++;
      }
      // A render frame may straddle a recorded gear change. Report its signed
      // travel rather than only the last substep, keeping wheels and motion aligned.
      if(returning&&state.phase!=='complete'&&steps)state.speed=(state.wheelAngle-wheelBefore)*radius/(steps*STEP);
      return state;
    },
    finish(){
      if(state.phase!=='driving')return state;
      clearInput();state.speed=0;state.steering=0;state.blocked=false;accumulator=0;
      if(!history.length)complete();
      else{state.phase='returning';returnStopDistance=nextRunLength();returnSpeed=0;returnDistance=0;}
      return state;
    }
  };
}
