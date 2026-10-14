import test from 'node:test';
import assert from 'node:assert/strict';
import {createCarDriving} from '../car-driving.js';
import {roadOutline,forecourtPads,parkingLampPositions,parkingBollardPositions,drivewayLampSpecs} from '../driveway-layout.js';

let createParkingReturn;
try { ({createParkingReturn}=await import('../car-parking-return.js')); }
catch(error) { if(error.code!=='ERR_MODULE_NOT_FOUND')throw error; }
test('a direct parking return controller exists',()=>assert.equal(typeof createParkingReturn,'function'));

const openRoad=[[-60,-60],[80,-60],[80,80],[-60,80]];
const pose=(x,z,heading=0)=>({x,y:-.075,z,heading});
const fleet=[[-14,4.44,2.05],[-9,4.73,2.28],[-4,4.9575103306,2.3259999752],[1,4.82,2.32],[6,4.93,2.28]];
function occupancy(car,{width=2.326,length=4.958,road=roadOutline,pads=forecourtPads,obstacles=[]}={}) {
  return createCarDriving({car,width,length,roadOutline:road,forecourtPads:pads,obstacles}).canOccupy;
}
function finish(controller,canOccupy,{frames=18000,dt=1/60}={}) {
  let previous={...controller.state.car},previousSpeed=0,travel=0;
  for(let i=0;i<frames&&controller.state.phase==='returning';i++) {
    controller.update(dt);
    const {car,speed}=controller.state,distance=Math.hypot(car.x-previous.x,car.z-previous.z);
    assert.ok(distance<=4*dt+1e-6,`return jumped ${distance} at ${JSON.stringify(car)}`);
    assert.ok(Math.abs(speed)<=4+1e-7);
    assert.ok(Math.abs(speed-previousSpeed)<=4.5*dt+1e-6,`gear or brake jumped ${previousSpeed} -> ${speed}`);
    assert.ok(canOccupy(car),`return left valid pavement or hit an obstacle: ${JSON.stringify(car)}`);
    if(distance>1e-6) {
      assert.ok(Math.abs(Math.atan2(Math.sin(car.heading-previous.heading),Math.cos(car.heading-previous.heading)))<=distance*.34+1e-6,'car heading must turn through travel');
      assert.ok((car.x-previous.x)*Math.sin(car.heading)*Math.sign(speed)+(car.z-previous.z)*Math.cos(car.heading)*Math.sign(speed)>=-1e-4,'speed agrees with body travel');
    }
    previous={...car};previousSpeed=speed;travel+=distance;
  }
  assert.equal(controller.state.phase,'complete',`planner did not finish: ${JSON.stringify(controller.state)}`);
  return travel;
}
if(createParkingReturn) {
  test('current pose returns straight home without a history or outbound route',()=>{
    const car=pose(-4,17),target=pose(-4,22.45),canOccupy=occupancy(car);
    const c=createParkingReturn({car,target,wheelbase:2.84,wheelRadius:.329,canOccupy});
    assert.deepEqual(c.state.car,car);const travel=finish(c,canOccupy);
    assert.ok(travel<5.46,'direct home connector must not visit an outbound road');assert.deepEqual(c.state.car,target);
  });
  test('all five bays accept full measured bodies with parked neighbors and poles',()=>{
    for(const [x,length,width] of fleet) {
      const car=pose(x,17),target=pose(x,22.45);
      const obstacles=fleet.filter(o=>o[0]!==x).map(([x,length,width])=>({x,z:22.45,width:width+.35,length:length+.08}));
      obstacles.push(...[...parkingLampPositions,...parkingBollardPositions,...drivewayLampSpecs].map(([x,z])=>({x,z,width:.5,length:.5})));
      const canOccupy=occupancy(car,{width,length,obstacles});assert.ok(canOccupy(car));
      const c=createParkingReturn({car,target,wheelbase:2.84,canOccupy});finish(c,canOccupy);assert.deepEqual(c.state.car,target);
    }
  });
  test('a blocked straight connector detours around an obstacle using a bicycle path',()=>{
    const car=pose(0,-14),target=pose(0,14);
    const canOccupy=occupancy(car,{road:openRoad,pads:[],obstacles:[{x:0,z:0,width:5,length:5}]});
    const c=createParkingReturn({car,target,canOccupy,roadOutline:openRoad,forecourtPads:[]});
    const travel=finish(c,canOccupy);assert.ok(travel>28);assert.deepEqual(c.state.car,target);
  });
  test('a far access road pose returns around the actual concave road corners',()=>{
    const car=pose(53.5,56,0),target=pose(-4,22.45),canOccupy=occupancy(car);
    assert.ok(canOccupy(car));const c=createParkingReturn({car,target,wheelbase:2.84,canOccupy});
    finish(c,canOccupy,{frames:40000});assert.deepEqual(c.state.car,target);
  });
  test('all five bays return from either access road direction around parked neighbors',()=>{
    const poles=[...parkingLampPositions,...parkingBollardPositions,...drivewayLampSpecs].map(([x,z])=>({x,z,width:.5,length:.5}));
    for(const [x,length,width] of fleet)for(const heading of [0,Math.PI]) {
      const car=pose(53.5,54,heading),target=pose(x,22.45);
      const obstacles=[...poles,...fleet.filter(o=>o[0]!==x).map(([x,length,width])=>({x,z:22.45,width:width+.35,length:length+.08}))];
      const canOccupy=occupancy(car,{width,length,obstacles});assert.ok(canOccupy(car));
      const c=createParkingReturn({car,target,wheelbase:2.84,canOccupy});finish(c,canOccupy,{frames:40000});assert.deepEqual(c.state.car,target);
    }
  });
  test('a stopped near-pole sideways aisle pose can turn and park without replaying anything',()=>{
    const car=pose(-16,16.5,Math.PI/2),target=pose(-4,22.45);
    const obstacles=[...parkingLampPositions,...parkingBollardPositions,...drivewayLampSpecs].map(([x,z])=>({x,z,width:.5,length:.5}));
    obstacles.push(...fleet.filter(o=>o[0]!==-4).map(([x,length,width])=>({x,z:22.45,width:width+.35,length:length+.08})));
    const canOccupy=occupancy(car,{obstacles});assert.ok(canOccupy(car));
    const c=createParkingReturn({car,target,wheelbase:2.84,canOccupy});finish(c,canOccupy);assert.deepEqual(c.state.car,target);
  });
  test('pause, invalid time, and a completed return preserve state',()=>{
    const car=pose(0,0),target=pose(0,3),canOccupy=occupancy(car,{road:openRoad,pads:[]});
    const c=createParkingReturn({car,target,canOccupy,roadOutline:openRoad,forecourtPads:[]});
    const before=structuredClone(c.state);for(const dt of [0,-1,NaN,Infinity])c.update(dt);c.update(5,true);assert.deepEqual(c.state,before);
    finish(c,canOccupy);const complete=structuredClone(c.state);c.update(100);assert.deepEqual(c.state,complete);
  });
  test('invalid or fully trapped poses report blocked without teleporting',()=>{
    const car=pose(0,0),target=pose(10,10);
    const c=createParkingReturn({car,target,canOccupy:p=>p.x===0&&p.z===0});
    for(let i=0;i<200&&c.state.phase==='returning';i++)c.update(1/60);
    assert.equal(c.state.phase,'blocked');assert.deepEqual(c.state.car,car);assert.equal(c.state.speed,0);
  });
  test('planning limits collision work in one update while holding the current pose',()=>{
    const car=pose(53.5,54),target=pose(-4,22.45),occupy=occupancy(car);let calls=0;
    const c=createParkingReturn({car,target,canOccupy:p=>{calls++;return occupy(p);},maxWorkPerUpdate:100,planningBudgetMs:100});
    c.update(1/60);assert.ok(calls<=502,`one update performed ${calls} collision checks`);assert.deepEqual(c.state.car,car);
  });
  test('a slight lateral offset connects exactly inside a narrow lane using short gear changes',()=>{
    const road=[[-3,-20],[3,-20],[3,30],[-3,30]],car=pose(.4,0),target=pose(0,0),canOccupy=occupancy(car,{road,pads:[]});
    const c=createParkingReturn({car,target,canOccupy,roadOutline:road,forecourtPads:[],maxExpansions:1});
    const travel=finish(c,canOccupy,{frames:2000});assert.ok(travel<8);assert.deepEqual(c.state.car,target);
  });
  test('common sideways and north-facing neck stops find parking routes within a bounded planning wait',()=>{
    for(const [car,x,width,length,wheelbase,limit] of [
      [pose(-3.9,16.51,1.55),-9,2.28,4.73,2.87,120],
      [pose(13,25),-4,2.3259999752,4.9575103306,2.84,600],
      [pose(13,21.5,.15),-4,2.3259999752,4.9575103306,2.84,600],
    ]) {
      const target=pose(x,22.45),obstacles=[...[...parkingLampPositions,...parkingBollardPositions,...drivewayLampSpecs].map(([x,z])=>({x,z,width:.5,length:.5})),...fleet.filter(o=>o[0]!==x).map(([x,length,width])=>({x,z:22.45,width:width+.35,length:length+.08}))];
      const canOccupy=occupancy(car,{width,length,obstacles}),canPlanOccupy=occupancy(car,{width:width+.08,length:length+.08,obstacles});assert.ok(canOccupy(car));
      const c=createParkingReturn({car,target,wheelbase,canOccupy,canPlanOccupy});
      for(let i=0;i<limit&&c.state.planning;i++){c.update(1/60);assert.deepEqual(c.state.car,car);}
      assert.equal(c.state.planning,false,`too much planning at ${JSON.stringify(car)}`);finish(c,canOccupy);assert.deepEqual(c.state.car,target);
    }
  });
}
