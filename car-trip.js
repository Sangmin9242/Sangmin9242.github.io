// Deterministic, renderer-independent trip. +Z is the car's forward axis.
const PI = Math.PI, R = 3.5;
const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => { const t=clamp(value); return t*t*(3-2*t); };
const mix = (a,b,t) => a+(b-a)*t;
const heading = angle => Math.atan2(Math.sin(angle),Math.cos(angle));
const point = value => Array.isArray(value) ? {x:value[0],y:value[1],z:value[2]} : value;
const distance = (a,b) => Math.hypot(b.x-a.x,b.z-a.z);

export function createCarTrip(spec, options={}) {
  const parked={x:spec.x ?? spec.position?.[0] ?? 0, y:spec.y ?? spec.position?.[1] ?? -.075, z:spec.z ?? spec.position?.[2] ?? 22.45, heading:0};
  const width=spec.width ?? spec.dimensions?.width ?? 1.86;
  const radius=spec.wheelRadius ?? .33, wheelbase=spec.wheelbase ?? 2.8;
  const entry=point(spec.driverEntry) ?? {x:-width/2-.55,y:-.06,z:.45};
  const seat=point(spec.driverSeat) ?? {x:-.34,y:0,z:.2};
  const start={x:-1.6,y:.08,z:.1};
  const doorPoint={x:parked.x+entry.x,y:parked.y+entry.y,z:parked.z+entry.z};
  const seatPoint={x:parked.x+seat.x,y:parked.y+seat.y,z:parked.z+seat.z};
  const portalX=parked.x-width/2-.7;
  const walk=[start,{x:-2.1,y:.08,z:.1},{x:-2.8,y:-.135,z:.1},{x:-4.5,y:-.135,z:.1},{x:-4.5,y:-.135,z:10},{x:portalX,y:-.135,z:10},{x:portalX,y:-.135,z:10.8},{x:portalX,y:-.075,z:11.2},{x:portalX,y:-.075,z:doorPoint.z},doorPoint];
  const walkLengths=walk.slice(1).map((p,i)=>distance(walk[i],p));
  const walkLength=walkLengths.reduce((a,b)=>a+b,0);
  const phases=[];
  let end=0, driven=0, active=false, elapsed=0, waitShortened=false;
  function add(name,duration,sample,length=0) {
    const phase={name,start:end,duration,sample,driven,length};phases.push(phase);end+=duration;driven+=length;
  }
  function walkAt(t,reverse=false) {
    let remaining=walkLength*(reverse?1-t:t), p=walk[walk.length-1], angle=PI/2;
    for(let i=0;i<walkLengths.length;i++) {
      if(remaining<=walkLengths[i]) {
        const a=walk[i],b=walk[i+1],q=walkLengths[i]>0?remaining/walkLengths[i]:1;
        p={x:mix(a.x,b.x,q),y:mix(a.y,b.y,q),z:mix(a.z,b.z,q)};
        angle=Math.atan2(b.x-a.x,b.z-a.z)+(reverse?PI:0);break;
      }
      remaining-=walkLengths[i];
    }
    return {...p,heading:heading(angle),walking:true,crouch:0,seated:0};
  }
  function driver(t,exiting=false) {
    const q=exiting?1-t:t, travel=ease((q-.2)/.8);
    return {x:mix(doorPoint.x,seatPoint.x,travel),y:mix(doorPoint.y,seatPoint.y,travel),z:mix(doorPoint.z,seatPoint.z,travel),heading:mix(PI/2,0,ease(q)),walking:false,crouch:ease(q/.2)*.65*(1-ease((q-.45)/.55)),seated:ease((q-.35)/.65)};
  }
  const outside=()=>({...doorPoint,heading:PI/2,walking:false,crouch:0,seated:0});
  const seatedWorker=()=>({...seatPoint,heading:0,walking:false,crouch:0,seated:1});
  const still=(door,inside=false,worker=outside)=>()=>({door,inside,worker:worker()});
  const drive=(path,sign,steering=0)=>t=>({car:path(ease(t)),inside:true,door:0,worker:seatedWorker(),driveSign:sign,steering,rate:6*t*(1-t)});
  const car=(x,z,h)=>({x,y:parked.y,z,heading:heading(h)});
  add('walking-out',walkLength/1.55,t=>({worker:walkAt(t),door:0,inside:false}));
  add('door-opening',.9,t=>({worker:outside(),door:ease(t),inside:false}));
  add('entering',2.4,t=>({worker:driver(t),door:1,inside:false}));
  add('door-closing',.85,t=>({worker:seatedWorker(),door:1-ease(t),inside:true}));
  add('reversing',2.8,drive(q=>car(parked.x,mix(parked.z,20,q),0),-1),-(parked.z-20));
  add('reverse-turn',4.4,drive(q=>{const a=q*PI/2;return car(parked.x-R*(1-Math.cos(a)),20-R*Math.sin(a),a);},-1,-Math.atan(wheelbase/R)),-R*PI/2);
  add('leaving',Math.max(5,(30-(parked.x-R))/5),drive(q=>car(mix(parked.x-R,30,q),16.5,PI/2),1),30-(parked.x-R));
  add('exit-turn',3,drive(q=>{const a=q*PI/2;return car(30+R*Math.sin(a),20-R*Math.cos(a),PI/2-a);},1,-Math.atan(wheelbase/R)),R*PI/2);
  add('leaving-road',7,drive(q=>car(33.5,mix(20,55,q),0),1),35);
  add('road-turn',4.5,drive(q=>{const a=q*PI;return car(37.5-4*Math.cos(a),55+4*Math.sin(a),a);},1,Math.atan(wheelbase/4)),4*PI);
  add('away',options.waitSeconds ?? 8,()=>({car:car(41.5,55,PI),inside:true,door:0,worker:seatedWorker()}));
  add('returning-road',7,drive(q=>car(41.5,mix(55,20,q),PI),1),35);
  add('return-turn',3,drive(q=>{const a=q*PI/2;return car(38+R*Math.cos(a),20-R*Math.sin(a),PI+a);},1,Math.atan(wheelbase/R)),R*PI/2);
  add('returning',Math.max(5,(38-parked.x-R)/5),drive(q=>car(mix(38,parked.x+R,q),16.5,3*PI/2),1),38-parked.x-R);
  add('parking-turn',4.4,drive(q=>{const a=q*PI/2;return car(parked.x+R-R*Math.sin(a),16.5+R*(1-Math.cos(a)),3*PI/2+a);},1,Math.atan(wheelbase/R)),R*PI/2);
  add('parking',2.8,drive(q=>car(parked.x,mix(20,parked.z,q),0),1),parked.z-20);
  add('door-opening-exit',.9,t=>({car:{...parked},worker:seatedWorker(),door:ease(t),inside:true}));
  add('exiting',2.4,t=>({car:{...parked},worker:driver(t,true),door:1,inside:false}));
  add('door-closing-exit',.85,t=>({car:{...parked},worker:outside(),door:1-ease(t),inside:false}));
  add('walking-home',walkLength/1.55,t=>({car:{...parked},worker:walkAt(t,true),door:0,inside:false}));
  const state={};
  function idle(phase='idle') {
    Object.assign(state,{phase,elapsed,progress:phase==='complete'?1:0,car:{...parked},worker:{...start,heading:0,walking:false,crouch:0,seated:0},door:0,signedSpeed:0,wheelAngle:phase==='complete'?driven/radius:0,steering:0,inside:false,driverVisible:false,headlights:false,braking:false,reversing:false,active:false});
  }
  function sample() {
    if(elapsed>=end) {active=false;idle('complete');return;}
    const phase=phases.find(p=>elapsed<p.start+p.duration), t=clamp((elapsed-phase.start)/phase.duration);
    const values=phase.sample(t);
    const vehicle=values.car ?? {...parked};
    const worker=values.worker;
    if(values.inside && values.car) {
      const s=Math.sin(vehicle.heading),c=Math.cos(vehicle.heading);
      Object.assign(worker,{x:vehicle.x+seat.x*c+seat.z*s,y:vehicle.y+seat.y,z:vehicle.z-seat.x*s+seat.z*c,heading:vehicle.heading});
    }
    const signedSpeed=values.driveSign?(Math.abs(phase.length)/phase.duration)*values.rate*values.driveSign:0;
    Object.assign(state,{phase:phase.name,elapsed,progress:elapsed/end,car:vehicle,worker,door:values.door ?? 0,signedSpeed,wheelAngle:(phase.driven+phase.length*ease(t))/radius,steering:values.steering ?? 0,inside:!!values.inside,driverVisible:true,headlights:!!values.inside,braking:!!values.inside && (Math.abs(signedSpeed)<.05 || t>.72),reversing:signedSpeed<-.01,active:true});
  }
  idle();
  return {state,duration:end,phases:phases.map(p=>({name:p.name,start:p.start,duration:p.duration})),board(){if(active)return false;active=true;elapsed=0;waitShortened=false;sample();return true;},update(dt,paused=false){if(!active||paused||!Number.isFinite(dt)||dt<=0)return state;elapsed=Math.min(end,elapsed+dt);sample();return state;},isActive(){return active;},reset(){active=false;elapsed=0;idle();},returnNow(){if(active&&state.phase==='away'&&!waitShortened){const wait=phases.find(p=>p.name==='away');elapsed=wait.start+wait.duration;waitShortened=true;sample();return true;}return false;}};
}
