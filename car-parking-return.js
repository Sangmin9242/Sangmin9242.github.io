import {roadOutline as defaultRoad,forecourtPads as defaultPads} from './driveway-layout.js';

// A return is planned from the current pose. Every primitive and exact goal
// connector is checked by the caller's full vehicle occupancy predicate.
const TAU=Math.PI*2,STEP=1/120;
const mod=a=>((a%TAU)+TAU)%TAU;
const normalize=a=>Math.atan2(Math.sin(a),Math.cos(a));
const positive=(v,f)=>Number.isFinite(v)&&v>0?v:f;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const samePose=(a,b)=>distance(a,b)<1e-8&&Math.abs(normalize(a.heading-b.heading))<1e-8&&Math.abs(a.y-b.y)<1e-8;
function arc(start,length,curvature){
  if(Math.abs(curvature)<1e-10)return {...start,x:start.x+length*Math.sin(start.heading),z:start.z+length*Math.cos(start.heading)};
  const heading=start.heading+length*curvature;
  return {...start,x:start.x+(Math.cos(start.heading)-Math.cos(heading))/curvature,z:start.z+(Math.sin(heading)-Math.sin(start.heading))/curvature,heading:normalize(heading)};
}
class Heap {
  constructor(){this.items=[];}
  push(node){const a=this.items;a.push(node);let i=a.length-1;while(i>0){const p=(i-1)>>1;if(a[p].priority<=node.priority)break;a[i]=a[p];i=p;}a[i]=node;}
  pop(){const a=this.items,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].priority<a[c].priority)c++;if(a[c].priority>=last.priority)break;a[i]=a[c];i=c;}a[i]=last;}return first;}
  get size(){return this.items.length;}
}
function inside(x,z,points){let yes=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
function* roadGuide(road,pads,start,target){
  const xs=road.map(p=>p[0]),zs=road.map(p=>p[1]);
  for(const p of pads){xs.push(p.x-p.width/2,p.x+p.width/2);zs.push(p.z-p.length/2,p.z+p.length/2);}
  xs.push(start.x,target.x);zs.push(start.z,target.z);
  const cell=1,minX=Math.floor(Math.min(...xs))-2,minZ=Math.floor(Math.min(...zs))-2;
  const width=Math.ceil(Math.max(...xs)-minX)+3,height=Math.ceil(Math.max(...zs)-minZ)+3;
  // This guide influences search order only. Collision decisions always use
  // canOccupy, including when the user's drivable region differs from this guide.
  if(width*height>50000)return pose=>distance(pose,target);
  const paved=(x,z)=>pads.some(p=>Math.abs(x-p.x)<=p.width/2&&Math.abs(z-p.z)<=p.length/2)||inside(x,z,road);
  const costs=new Float64Array(width*height);costs.fill(Infinity);
  const tx=Math.round(target.x-minX),tz=Math.round(target.z-minZ),heap=new Heap();
  const targetIndex=tz*width+tx;costs[targetIndex]=0;heap.push({x:tx,z:tz,priority:0});
  let work=0;
  while(heap.size){
    if(work++%16===0)yield;
    const n=heap.pop(),index=n.z*width+n.x;if(n.priority!==costs[index])continue;
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const x=n.x+dx,z=n.z+dz;if(x<0||z<0||x>=width||z>=height)continue;
      if(!paved(minX+x,minZ+z))continue;
      if(dx&&dz&&(!paved(minX+n.x+dx,minZ+n.z)||!paved(minX+n.x,minZ+n.z+dz)))continue;
      const next=n.priority+Math.hypot(dx,dz),i=z*width+x;
      if(next<costs[i]){costs[i]=next;heap.push({x,z,priority:next});}
    }
  }
  return pose=>{
    const x=Math.round((pose.x-minX)/cell),z=Math.round((pose.z-minZ)/cell);
    const value=x>=0&&z>=0&&x<width&&z<height?costs[z*width+x]:Infinity;
    return Math.max(distance(pose,target),Number.isFinite(value)?value:0);
  };
}
// Six Dubins words, applied in either gear. Reverse uses the virtual travel
// heading, then converts curvature back to the physical vehicle heading.
function connectors(start,target,curvature){
  const radius=1/curvature,d=distance(start,target)/radius,bearing=Math.atan2(target.x-start.x,target.z-start.z),result=[];
  if(Math.abs(normalize(start.heading-target.heading))<1e-8){
    const dx=target.x-start.x,dz=target.z-start.z;
    const side=dx*Math.cos(start.heading)-dz*Math.sin(start.heading),forward=dx*Math.sin(start.heading)+dz*Math.cos(start.heading);
    if(Math.abs(side)<=2&&Math.abs(forward)<=14){
      const angle=Math.acos(Math.max(-1,Math.min(1,1-Math.abs(side)/(4*radius)))),length=radius*angle,k=Math.sign(side)*curvature;
      // Two short S turns, one in each gear, shift sideways while restoring
      // heading and longitudinal position. This avoids a full turning circle
      // when a discretized search pose differs slightly from a narrow lane.
      const shift=[{distance:length,curvature:k},{distance:length,curvature:-k},{distance:-length,curvature:k},{distance:-length,curvature:-k}].filter(s=>Math.abs(s.distance)>1e-8);
      const straight=Math.abs(forward)>1e-8?[{distance:forward,curvature:0}]:[];
      result.push({segments:[...straight,...shift],length:Math.abs(forward)+4*length},{segments:[...shift,...straight],length:Math.abs(forward)+4*length});
    }
  }
  for(const gear of [1,-1]){
    const a=mod(start.heading+(gear<0?Math.PI:0)-bearing),b=mod(target.heading+(gear<0?Math.PI:0)-bearing);
    const sa=Math.sin(a),sb=Math.sin(b),ca=Math.cos(a),cb=Math.cos(b),cab=Math.cos(a-b);
    function add(word,t,p,q){
      if(![t,p,q].every(Number.isFinite))return;
      for(const short of [false,true]){
        const segments=[t,p,q].map((v,i)=>({distance:gear*(short&&word[i]!=='S'?normalize(v):v)*radius,curvature:(word[i]==='S'?0:word[i]==='L'?curvature:-curvature)*gear})).filter(s=>Math.abs(s.distance)>1e-8);
        result.push({segments,length:segments.reduce((sum,s)=>sum+Math.abs(s.distance),0),gear});
      }
    }
    let p2=2+d*d-2*cab+2*d*(sa-sb),tmp;
    if(p2>=-1e-10){tmp=Math.atan2(cb-ca,d+sa-sb);add('LSL',mod(-a+tmp),Math.sqrt(Math.max(0,p2)),mod(b-tmp));}
    p2=2+d*d-2*cab+2*d*(sb-sa);
    if(p2>=-1e-10){tmp=Math.atan2(ca-cb,d-sa+sb);add('RSR',mod(a-tmp),Math.sqrt(Math.max(0,p2)),mod(-b+tmp));}
    p2=-2+d*d+2*cab+2*d*(sa+sb);
    if(p2>=-1e-10){const p=Math.sqrt(Math.max(0,p2));tmp=Math.atan2(-ca-cb,d+sa+sb)-Math.atan2(-2,p);add('LSR',mod(-a+tmp),p,mod(-b+tmp));}
    p2=d*d-2+2*cab-2*d*(sa+sb);
    if(p2>=-1e-10){const p=Math.sqrt(Math.max(0,p2));tmp=Math.atan2(ca+cb,d-sa-sb)-Math.atan2(2,p);add('RSL',mod(a-tmp),p,mod(b-tmp));}
    tmp=(6-d*d+2*cab+2*d*(sa-sb))/8;
    if(Math.abs(tmp)<=1){const p=mod(TAU-Math.acos(tmp)),t=mod(a-Math.atan2(ca-cb,d-sa+sb)+p/2);add('RLR',t,p,mod(a-b-t+p));}
    tmp=(6-d*d+2*cab+2*d*(-sa+sb))/8;
    if(Math.abs(tmp)<=1){const p=mod(TAU-Math.acos(tmp)),t=mod(-a-Math.atan2(ca-cb,d+sa-sb)+p/2);add('LRL',t,p,mod(b-a-t+p));}
  }
  return result.sort((a,b)=>a.length-b.length);
}

export function createParkingReturn(spec={}){
  const initial={...spec.car},target={...spec.target},canOccupy=typeof spec.canOccupy==='function'?spec.canOccupy:()=>false;
  const canPlanOccupy=typeof spec.canPlanOccupy==='function'?spec.canPlanOccupy:null;
  const wheelbase=Math.max(.5,Math.min(10,positive(spec.wheelbase,2.8))),wheelRadius=Math.max(.05,Math.min(2,positive(spec.wheelRadius,.33)));
  const curvature=Math.min(.32,Math.tan(.78)/wheelbase),primitive=1;
  const reverseSearch=distance(initial,target)>35,searchStart=reverseSearch?target:initial,searchGoal=reverseSearch?initial:target;
  const state={phase:'returning',car:{...initial},speed:0,steering:0,wheelAngle:0,blocked:false,planning:true};
  const open=new Heap(),visited=new Map();let guide=null,planner=null,expansions=0,path=null,runs=null,runIndex=0,runTime=0,runTravel=0,segmentIndex=0,segmentTravel=0,accumulator=0,dwell=0;
  const key=(car,gear)=>`${Math.round(car.x/.5)},${Math.round(car.z/.5)},${Math.round(mod(car.heading)/(TAU/64))%64},${gear}`;
  const valid=car=>car&&['x','y','z','heading'].every(k=>Number.isFinite(car[k]))&&canOccupy(car);
  function blocked(){state.phase='blocked';state.blocked=true;state.planning=false;state.speed=0;state.steering=0;}
  function complete(){Object.assign(state.car,target);state.phase='complete';state.speed=0;state.steering=0;state.planning=false;state.blocked=false;}
  function* checked(start,segment){
    const count=Math.max(1,Math.ceil(Math.abs(segment.distance)/.1));
    for(let i=1;i<=count;i++){
      yield;
      const car=arc(start,segment.distance*i/count,segment.curvature);
      if(!valid(car))return null;
      const margin=Math.min(1,distance(car,initial)/.5,distance(car,target)/.5);
      if(canPlanOccupy&&margin>=1){if(!canPlanOccupy(car))return null;}
      else for(const [dx,dz] of [[.04,0],[-.04,0],[0,.04],[0,-.04]])if(!canOccupy({...car,x:car.x+dx*margin,z:car.z+dz*margin}))return null;
    }
    return arc(start,segment.distance,segment.curvature);
  }
  function* connect(car,goal){
    for(const candidate of connectors(car,goal,curvature)){
      // Avoid giant loops near home; hybrid search can change gear instead.
      if(candidate.length>distance(car,goal)+12)continue;
      let end=car;for(const segment of candidate.segments){end=yield* checked(end,segment);if(!end)break;}
      if(end&&samePose(end,goal))return candidate.segments;
    }
    return null;
  }
  function accept(node,tail,reverse=false){
    const prior=[];for(let n=node;n.parent;n=n.parent)prior.push(n.segment);prior.reverse();
    let raw=[...prior,...tail];if(reverse)raw=raw.reverse().map(segment=>({...segment,distance:-segment.distance}));
    const merged=[];let car={...initial};
    for(const segment of raw){
      const last=merged.at(-1);
      if(last&&Math.sign(last.distance)===Math.sign(segment.distance)&&Math.abs(last.curvature-segment.curvature)<1e-9){last.distance+=segment.distance;last.end=arc(last.start,last.distance,last.curvature);}
      else merged.push({...segment,start:{...car},end:arc(car,segment.distance,segment.curvature)});
      car=arc(car,segment.distance,segment.curvature);
    }
    path=merged;runs=[];
    for(const segment of path){const gear=Math.sign(segment.distance),last=runs.at(-1);if(last?.gear===gear)last.length+=Math.abs(segment.distance);else runs.push({gear,length:Math.abs(segment.distance)});}
    for(const run of runs){
      run.peak=Math.min(4,Math.sqrt(2*run.length/(1/2.6+1/3)));
      run.accelerate=run.peak/2.6;run.decelerate=run.peak/3;
      run.cruise=Math.max(0,(run.length-run.peak**2/(2*2.6)-run.peak**2/(2*3))/run.peak);
      run.duration=run.accelerate+run.cruise+run.decelerate;
    }
    state.planning=false;if(!path.length)complete();
  }
  function* search(){
    if(!valid(initial)||!valid(target)||Math.abs(initial.y-target.y)>1e-8){blocked();return;}
    if(samePose(initial,target)){complete();return;}
    if(!guide){
      const tail=yield* connect(initial,target);if(tail){accept({car:initial},tail);return;}
      // Distant returns search outwards from the exact parking pose, avoiding
      // discretization of the narrow bay. Near home, search from the current
      // pose so a confined terminal aisle does not need an exact connector.
      // Reversing a newly computed route has no relation to driving history.
      guide=yield* roadGuide(spec.roadOutline??defaultRoad,spec.forecourtPads??defaultPads,searchStart,searchGoal);
      const root={car:searchStart,gear:0,cost:0,priority:guide(searchStart)*1.5};open.push(root);visited.set(key(searchStart,0),0);
    }
    while(state.phase==='returning'&&state.planning){
      yield;
      let node;do{node=open.pop();}while(node&&node.cost>visited.get(key(node.car,node.gear))+1e-8);
      if(!node||expansions++>=positive(spec.maxExpansions,180000)){blocked();return;}
      if(distance(node.car,searchGoal)<12){const tail=yield* connect(node.car,searchGoal);if(tail){accept(node,tail,reverseSearch);return;}}
      for(const gear of [1,-1])for(const curve of [0,-curvature,curvature,-curvature/2,curvature/2]){
        const segment={distance:primitive*gear,curvature:curve},car=yield* checked(node.car,segment);if(!car)continue;
        const cost=node.cost+primitive*(gear<0?1.08:1)+(node.gear&&node.gear!==gear?1.8:0)+Math.abs(curve)*.15;
        const k=key(car,gear);if(cost>=(visited.get(k)??Infinity)-1e-8)continue;
        visited.set(k,cost);open.push({car,gear,cost,parent:node,segment,priority:cost+guide(car)*1.5+Math.abs(normalize(car.heading-searchGoal.heading))*.25});
      }
    }
  }
  function plan(){
    if(!planner)planner=search();
    const deadline=performance.now()+Math.min(16,positive(spec.planningBudgetMs,7));
    const before=expansions,limit=Math.min(200,positive(spec.maxExpansionsPerUpdate,60)),work=Math.min(5000,positive(spec.maxWorkPerUpdate,1500));
    for(let i=0;i<work&&expansions-before<limit&&performance.now()<deadline;i++)if(planner.next().done)break;
  }
  function move(){
    if(dwell>0){dwell=Math.max(0,dwell-STEP);state.speed=0;return;}
    const run=runs[runIndex];runTime=Math.min(run.duration,runTime+STEP);
    let progress,speed;
    if(runTime<run.accelerate){speed=2.6*runTime;progress=2.6*runTime**2/2;}
    else if(runTime<run.accelerate+run.cruise){speed=run.peak;progress=run.peak**2/(2*2.6)+run.peak*(runTime-run.accelerate);}
    else {const remaining=run.duration-runTime;speed=3*remaining;progress=run.length-3*remaining**2/2;}
    let budget=Math.max(0,progress-runTravel),signed=0;runTravel=progress;
    state.speed=run.gear*speed;
    while(budget>1e-12&&segmentIndex<path.length){
      const s=path[segmentIndex],take=Math.min(budget,Math.abs(s.distance)-segmentTravel),next=arc(s.start,Math.sign(s.distance)*(segmentTravel+take),s.curvature);
      if(!valid(next)){blocked();return;}
      Object.assign(state.car,next);state.steering=Math.atan(s.curvature*wheelbase);segmentTravel+=take;budget-=take;signed+=Math.sign(s.distance)*take;
      if(segmentTravel>=Math.abs(s.distance)-1e-9){
        Object.assign(state.car,s.end);segmentIndex++;segmentTravel=0;
        if(segmentIndex===path.length){state.speed=0;complete();break;}
        if(Math.sign(path[segmentIndex].distance)!==run.gear){state.speed=0;dwell=.12;runIndex++;runTime=0;runTravel=0;break;}
      }
    }
    state.wheelAngle+=signed/wheelRadius;
  }
  return {state,update(dt,paused=false){
    if(paused||state.phase!=='returning'||!Number.isFinite(dt)||dt<=0)return state;
    if(state.planning){plan();return state;}
    accumulator+=Math.min(dt,1);
    while(accumulator>=STEP-1e-10&&state.phase==='returning'){accumulator=Math.max(0,accumulator-STEP);move();}
    return state;
  }};
}
