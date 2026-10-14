import test from 'node:test';
import assert from 'node:assert/strict';

let createCarTrip;
try { ({ createCarTrip } = await import('../car-trip.js')); }
catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }
test('car trip controller exists', () => assert.equal(typeof createCarTrip, 'function'));

const cars = [
  { id:'accent', x:-14, length:4.38, width:1.72 },
  { id:'glc', x:-9, length:4.66, width:1.89 },
  { id:'grandeur', x:-4, length:4.9, width:1.86 },
  { id:'tesla', x:1, length:4.75, width:1.92 },
  { id:'malibu', x:6, length:4.86, width:1.86 },
];
const near = (a,b,eps=1e-6) => assert.ok(Math.abs(a-b)<eps, `${a} != ${b}`);
function overlap(a,b) {
  const axes = [[Math.cos(a.heading),-Math.sin(a.heading)],[Math.sin(a.heading),Math.cos(a.heading)],[1,0],[0,1]];
  for (const [x,z] of axes) {
    const distance=Math.abs((a.x-b.x)*x+(a.z-b.z)*z);
    const ra=a.width/2*Math.abs(x*Math.cos(a.heading)-z*Math.sin(a.heading))+a.length/2*Math.abs(x*Math.sin(a.heading)+z*Math.cos(a.heading));
    const rb=b.width/2*Math.abs(x)+b.length/2*Math.abs(z);
    if(distance>=ra+rb+.025) return false;
  }
  return true;
}
if (createCarTrip) {
  test('round trip walks, boards, closes door, drives, waits, parks and walks home', () => {
    const trip=createCarTrip(cars[2]), phases=new Set(); trip.board();
    let wait=0, last=structuredClone(trip.state), seated=false;
    for(let i=0;i<25000 && trip.isActive();i++) {
      trip.update(.01); const s=trip.state; phases.add(s.phase);
      const distance=Math.hypot(s.car.x-last.car.x,s.car.z-last.car.z);
      assert.ok(distance<.085, 'car cannot teleport');
      assert.ok(Math.hypot(s.worker.x-last.worker.x,s.worker.z-last.worker.z)<.09, 'worker cannot teleport');
      if(s.inside) { seated=true; assert.ok(s.driverVisible); }
      if(Math.abs(s.signedSpeed)>.01) { assert.ok(s.inside); assert.equal(s.door,0); }
      if(s.phase==='away') wait+=.01;
      last=structuredClone(s);
    }
    assert.ok(seated); assert.ok(wait>=7.98 && wait<=8.02);
    for(const phase of ['walking-out','door-opening','entering','door-closing','reversing','reverse-turn','leaving','away','returning','parking-turn','parking','door-opening-exit','exiting','door-closing-exit','walking-home','complete']) assert.ok(phases.has(phase),phase);
    assert.equal(trip.isActive(),false); near(trip.state.car.x,-4); near(trip.state.car.z,22.45); near(trip.state.car.heading,0);
    near(trip.state.worker.x,-1.6); near(trip.state.worker.z,.1); assert.equal(trip.state.driverVisible,false);
  });
  test('every full car body clears the four parked vehicles and faces signed travel', () => {
    for(const selected of cars) {
      const trip=createCarTrip(selected); trip.board();
      for(let i=0;i<16000 && trip.isActive();i++) {
        const before={...trip.state.car}, previousPhase=trip.state.phase; trip.update(.015); const s=trip.state;
        for(const other of cars.filter(c=>c.id!==selected.id)) assert.equal(overlap({...s.car,...selected,x:s.car.x,z:s.car.z}, {...other,z:22.45}),false,`${selected.id} ${s.phase} hits ${other.id}`);
        const dx=s.car.x-before.x,dz=s.car.z-before.z,d=Math.hypot(dx,dz);
        if(previousPhase===s.phase && d>1e-5 && Math.abs(s.signedSpeed)>.01) assert.ok((dx*Math.sin(s.car.heading)+dz*Math.cos(s.car.heading))*Math.sign(s.signedSpeed)/d>.97, `${s.phase} heading disagrees with travel`);
      }
      assert.equal(trip.isActive(),false);
    }
  });
  test('time partitioning produces matching phase, positions, wheel spin and door', () => {
    const a=createCarTrip(cars[0]),b=createCarTrip(cars[0]);a.board();b.board();
    for(let i=0;i<1200;i++)a.update(1/30);
    for(let i=0;i<5760;i++)b.update(1/144);
    assert.equal(a.state.phase,b.state.phase);
    for(const key of ['x','z','heading'])near(a.state.car[key],b.state.car[key]);
    near(a.state.door,b.state.door);near(a.state.wheelAngle,b.state.wheelAngle);
  });
  test('busy board, pause, invalid times and reset preserve valid state', () => {
    const trip=createCarTrip(cars[1]);assert.equal(trip.board(),true);trip.update(2);const before=structuredClone(trip.state);
    assert.equal(trip.board(),false); for(const dt of [-1,NaN,Infinity,0])trip.update(dt);trip.update(99,true);assert.deepEqual(trip.state,before);
    trip.update(80); trip.reset();assert.equal(trip.isActive(),false);near(trip.state.car.x,-9);near(trip.state.car.z,22.45);assert.equal(trip.state.door,0);assert.equal(trip.state.driverVisible,false);
    assert.equal(trip.board(),true);
  });
  test('worker walks around office and parked cars; cabin entry only uses the open driver door', () => {
    for(const spec of cars) {
      const trip=createCarTrip(spec);trip.board();
      for(let i=0;i<24000 && trip.isActive();i++) {
        trip.update(.01);const s=trip.state,w=s.worker;
        if(w.walking && !s.inside) {
          assert.ok(!(w.x> -10.56 && w.x< -5.04 && w.z>2.97 && w.z<7.53),'worker intersects office');
          assert.ok(!(w.x> -3.77 && w.x<2.77 && w.z>2.03 && w.z<5.77),'worker intersects robot work area');
          for(const car of cars) assert.ok(!(w.x>car.x-car.width/2-.2 && w.x<car.x+car.width/2+.2 && w.z>22.45-car.length/2-.2 && w.z<22.45+car.length/2+.2),'worker intersects parked car');
        }
        if(s.phase==='entering' || s.phase==='exiting') assert.equal(s.door,1);
      }
    }
  });
  test('walking feet stay on the outdoor ground and raised parking pad', () => {
    const trip=createCarTrip({...cars[0],driverEntry:[-1.41,0,.45]});trip.board();
    for(let i=0;i<23000 && trip.isActive();i++) {
      trip.update(.01);const w=trip.state.worker;
      if(!w.walking)continue;
      if(w.x<-2.81 && w.z<10.79)near(w.y,-.135);
      if(w.z>11.21)near(w.y,-.075);
      if(w.x>-2.09 && w.z<.11)near(w.y,.08);
    }
  });
  test('return now only shortens the parked roadside wait and follows the return road', () => {
    const trip=createCarTrip(cars[3]);trip.board();assert.equal(trip.returnNow(),false);
    const wait=trip.phases.find(p=>p.name==='away');trip.update(wait.start+1);
    const position={...trip.state.car};assert.equal(trip.returnNow(),true);assert.equal(trip.state.phase,'returning-road');
    near(trip.state.car.x,position.x);near(trip.state.car.z,position.z);trip.update(.5);assert.ok(trip.state.car.z<position.z);
    trip.update(200);assert.equal(trip.state.phase,'complete');near(trip.state.car.x,1);near(trip.state.car.z,22.45);
  });
}
