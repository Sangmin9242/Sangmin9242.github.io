import test from 'node:test';
import assert from 'node:assert/strict';
import {roadOutline,forecourtPads} from '../driveway-layout.js';

let createCarDriving;
try { ({createCarDriving}=await import('../car-driving.js')); }
catch(error) { if(error.code!=='ERR_MODULE_NOT_FOUND')throw error; }
test('manual driving controller exists',()=>assert.equal(typeof createCarDriving,'function'));
const openRoad=[[-200,-200],[200,-200],[200,200],[-200,200]];
const spec={position:[0,-.075,0],width:1.86,length:4.9,wheelbase:2.84,wheelRadius:.329,roadOutline:openRoad,forecourtPads:[]};
const near=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<=e,`${a} != ${b}`);
function run(d,seconds,fps=60){for(let i=0;i<Math.round(seconds*fps);i++)d.update(1/fps);}
function paved(x,z){
  if(forecourtPads.some(p=>Math.abs(x-p.x)<=p.width/2+1e-7&&Math.abs(z-p.z)<=p.length/2+1e-7))return true;
  let yes=false;
  for(let i=0,j=roadOutline.length-1;i<roadOutline.length;j=i++){
    const a=roadOutline[i],b=roadOutline[j];
    if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;
  }
  return yes;
}
if(createCarDriving){
  test('occupancy rejects the actual late Grandeur exit turn and accepts its parked checkpoint',()=>{
    const candidate={x:11.210793116044563,y:-.075,z:16.94661058590711,heading:1.060084881616945};
    const d=createCarDriving({car:candidate,width:2.3259999752,length:4.9575103306,wheelbase:2.84});
    assert.equal(typeof d.canOccupy,'function');const before=structuredClone(d.state);
    assert.equal(d.canOccupy(),false);assert.equal(d.canOccupy({x:-4,y:-.075,z:22.45,heading:0}),true);assert.deepEqual(d.state,before);
  });
  test('occupancy uses the same parked-obstacle clearance as moving collision checks',()=>{
    const d=createCarDriving({...spec,obstacles:[{x:0,z:8,width:2,length:4,heading:Math.PI/4}]});
    assert.equal(typeof d.canOccupy,'function');assert.equal(d.canOccupy(),true);assert.equal(d.canOccupy({x:0,y:-.075,z:8,heading:0}),false);
    d.setInput({throttle:1});run(d,5);assert.equal(d.state.blocked,true);assert.equal(d.canOccupy(),true);
  });
  test('occupancy rejects every nonfinite pose component without changing state',()=>{
    const d=createCarDriving(spec);assert.equal(typeof d.canOccupy,'function');const before=structuredClone(d.state);
    for(const key of ['x','y','z','heading'])for(const value of [NaN,Infinity,-Infinity,undefined])assert.equal(d.canOccupy({...d.state.car,[key]:value}),false,`${key} must be finite`);
    assert.equal(d.canOccupy(null),false);assert.deepEqual(d.state,before);
  });
  test('forward throttle accelerates, caps speed and spins wheels in travel direction',()=>{
    const d=createCarDriving(spec);d.setInput({throttle:1});run(d,4);
    assert.ok(d.state.speed>7.5&&d.state.speed<=8);assert.ok(d.state.car.z>18);near(d.state.car.x,0);assert.ok(d.state.wheelAngle>0);
  });
  test('down brakes forward travel before reversing and caps reverse speed',()=>{
    const d=createCarDriving(spec);d.setInput({throttle:1});run(d,2);const forward=d.state.speed;
    d.setInput({throttle:-1});run(d,.2);assert.ok(d.state.speed>0&&d.state.speed<forward);
    run(d,4);assert.ok(d.state.speed<0&&d.state.speed>=-3.5);const z=d.state.car.z,w=d.state.wheelAngle;run(d,.5);assert.ok(d.state.car.z<z&&d.state.wheelAngle<w);
  });
  test('coast and space brake slow the car; brake never adds reverse travel',()=>{
    const coast=createCarDriving(spec),brake=createCarDriving(spec);
    for(const d of [coast,brake]){d.setInput({throttle:1});run(d,2);}
    const fast=coast.state.speed;coast.clearInput();brake.setInput({throttle:1,brake:true});
    run(coast,.5);run(brake,.5);assert.ok(coast.state.speed<fast&&coast.state.speed>brake.state.speed);
    run(brake,4);near(brake.state.speed,0);assert.ok(brake.state.car.z>0);
  });
  test('steering turns only while moving and reverse turns the opposite way',()=>{
    const forward=createCarDriving(spec),reverse=createCarDriving(spec),still=createCarDriving(spec);
    still.setInput({steer:1});run(still,2);near(still.state.car.heading,0);near(still.state.car.x,0);
    forward.setInput({throttle:1,steer:1});reverse.setInput({throttle:-1,steer:1});run(forward,1);run(reverse,1);
    assert.ok(forward.state.car.heading<0&&forward.state.car.x<0);assert.ok(reverse.state.car.heading>0&&reverse.state.car.x<0);
  });
  test('right and left steering match the driver view at each compass heading',()=>{
    for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2])for(const steer of [-1,1]){
      const d=createCarDriving({...spec,car:{x:0,y:-.075,z:0,heading}});
      d.setInput({throttle:1,steer});run(d,.8);
      const rightward=-Math.cos(heading)*d.state.car.x+Math.sin(heading)*d.state.car.z;
      assert.ok(rightward*steer>0,'positive right input must move toward the camera right');
    }
  });
  test('road boundary rejects an entire car footprint before its centre leaves',()=>{
    const d=createCarDriving({...spec,roadOutline:[[-5,-10],[5,-10],[5,10],[-5,10]]});d.setInput({throttle:1});run(d,6);
    assert.equal(d.state.blocked,true);assert.ok(d.state.car.z<=7.51);near(d.state.speed,0);
  });
  test('road and adjoining pad form one driveable union',()=>{
    const d=createCarDriving({...spec,roadOutline:[[-5,-10],[5,-10],[5,2],[-5,2]],forecourtPads:[{x:0,z:7,width:10,length:10}]});
    d.setInput({throttle:1});run(d,2);assert.ok(d.state.car.z>2);assert.equal(d.state.blocked,false);
  });
  test('concave boundary blocks a body edge bridging an unpaved notch',()=>{
    const d=createCarDriving({...spec,position:[0,-.075,-5],width:5,length:2,roadOutline:[[-10,-10],[10,-10],[10,10],[1,10],[1,0],[-1,0],[-1,10],[-10,10]]});
    d.setInput({throttle:1});run(d,4);assert.equal(d.state.blocked,true);assert.ok(d.state.car.z<=-1);
  });
  test('thin poles cannot be tunnelled through by a large update',()=>{
    const d=createCarDriving({...spec,obstacles:[{x:0,z:9,width:.25,length:.25}]});d.setInput({throttle:1});d.update(10);
    assert.equal(d.state.blocked,true);assert.ok(d.state.car.z<6.5);near(d.state.speed,0);
  });
  test('rotated obstacle corners and mirror allowance block travel',()=>{
    const d=createCarDriving({...spec,obstacles:[{x:2.05,z:8,width:1,length:4,heading:Math.PI/4}]});d.setInput({throttle:1});run(d,5);
    assert.equal(d.state.blocked,true);assert.ok(d.state.car.z<8);
    const mirror=createCarDriving({...spec,obstacles:[{x:1.15,z:8,width:.2,length:.4}]});mirror.setInput({throttle:1});run(mirror,5);assert.equal(mirror.state.blocked,true);
  });
  test('30, 60 and 144 fps give matching throttle, steering, coast and brake outcomes',()=>{
    const outcomes=[30,60,144].map(fps=>{const d=createCarDriving(spec);d.setInput({throttle:1,steer:.6});run(d,2,fps);d.setInput({throttle:-1,steer:-.4});run(d,2,fps);d.clearInput();run(d,1,fps);return d.state;});
    for(const s of outcomes.slice(1)){for(const k of ['x','z','heading'])near(s.car[k],outcomes[0].car[k],1e-8);for(const k of ['speed','steering','wheelAngle'])near(s[k],outcomes[0][k],1e-8);}
  });
  test('pause and invalid dt freeze all state; malformed controls cannot poison state',()=>{
    const d=createCarDriving(spec),stable=d.state;d.setInput({throttle:1,steer:.4});run(d,.5);const snapshot=structuredClone(d.state);
    for(const dt of [0,-1,NaN,Infinity])d.update(dt);d.update(30,true);assert.deepEqual(d.state,snapshot);assert.equal(d.state,stable);
    d.setInput({throttle:NaN,steer:Infinity,brake:false});run(d,1);for(const v of Object.values(d.state.car))assert.ok(Number.isFinite(v));assert.ok(Number.isFinite(d.state.wheelAngle));
  });
  test('all five parked vehicles can reverse away while their full body stays paved',()=>{
    const fleet=[[-14,4.38,1.72],[-9,4.66,1.89],[-4,4.9,1.86],[1,4.75,1.92],[6,4.86,1.86]];
    for(const [x,length,width] of fleet){const d=createCarDriving({position:[x,-.075,22.45],length,width,obstacles:fleet.filter(c=>c[0]!==x).map(([x,length,width])=>({x,z:22.45,length,width}))});
      d.setInput({throttle:-1});for(let i=0;i<100;i++){d.update(1/60);const c=d.state.car;for(const side of [-(width+.3)/2,(width+.3)/2])for(const front of [-(length+.08)/2,(length+.08)/2])assert.ok(paved(c.x+side*Math.cos(c.heading)+front*Math.sin(c.heading),c.z-side*Math.sin(c.heading)+front*Math.cos(c.heading)));}
      assert.ok(d.state.car.z<21.5,`car at ${x} reverses away`);
    }
  });
  test('finish retraces curved forward and reverse travel with no jump and exact checkpoint',()=>{
    const d=createCarDriving({...spec,car:{x:3,y:-.075,z:-4,heading:.25}}),checkpoint={...d.state.car},stable=d.state;
    d.setInput({throttle:1,steer:.6});run(d,2);d.setInput({throttle:-1,steer:-.4});run(d,3);
    const before={...d.state.car};d.finish();assert.equal(d.state.phase,'returning');assert.deepEqual(d.state.car,before);d.setInput({throttle:1,steer:1});
    let signed=false,prior={...d.state.car};
    for(let i=0;i<5000&&d.state.phase!=='complete';i++){d.update(1/60);const c=d.state.car,dx=c.x-prior.x,dz=c.z-prior.z;assert.ok(Math.hypot(dx,dz)<=4/60+1e-6,'return cannot jump or exceed 4 m/s');assert.ok(Math.abs(d.state.speed)<=4+1e-8);if(Math.abs(d.state.speed)>.01){signed=true;assert.ok((dx*Math.sin(c.heading)+dz*Math.cos(c.heading))*Math.sign(d.state.speed)>=-1e-4);}prior={...c};}
    assert.ok(signed);assert.equal(d.state.phase,'complete');assert.deepEqual(d.state.car,checkpoint);assert.equal(d.state,stable);near(d.state.speed,0);near(d.state.steering,0);
    const final=structuredClone(d.state);run(d,1);assert.deepEqual(d.state,final);
  });
  test('return pause freezes and finishing without movement completes without changing checkpoint',()=>{
    const idle=createCarDriving(spec);idle.setInput({steer:1});run(idle,5);idle.finish();assert.equal(idle.state.phase,'complete');near(idle.state.car.z,0);
    const d=createCarDriving(spec);d.setInput({throttle:-1});run(d,2);d.finish();const snapshot=structuredClone(d.state);d.update(1,true);assert.deepEqual(d.state,snapshot);
  });
  test('recovery slows through recorded direction changes instead of instantly changing gear',()=>{
    const d=createCarDriving(spec);d.setInput({throttle:1});run(d,2);d.setInput({throttle:-1});run(d,4);d.finish();
    let previous=0;const directions=new Set();
    for(let i=0;i<20000&&d.state.phase!=='complete';i++){d.update(1/240);const speed=d.state.speed;assert.ok(Math.abs(speed-previous)<.13,`speed changed from ${previous} to ${speed}`);if(Math.abs(speed)>.01)directions.add(Math.sign(speed));previous=speed;}
    assert.equal(d.state.phase,'complete');assert.deepEqual([...directions].sort(),[-1,1]);
  });
  test('null controls and tiny wheel dimensions preserve finite values',()=>{
    const d=createCarDriving({...spec,wheelRadius:1e-320,wheelbase:1e-320});assert.doesNotThrow(()=>d.setInput(null));
    d.setInput({throttle:1,steer:1});run(d,1);for(const v of [d.state.speed,d.state.wheelAngle,d.state.steering,...Object.values(d.state.car)])assert.ok(Number.isFinite(v));
  });
}
