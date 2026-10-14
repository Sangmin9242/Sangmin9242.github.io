import test from 'node:test';
import assert from 'node:assert/strict';
import { createDogBehaviour } from '../dog-behaviour.js';
const near=(a,b,e=1e-7)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const advance=(dog,s,fps=60)=>{for(let i=0;i<Math.round(s*fps);i++)dog.update(1/fps);};
function clear(s){
  assert.ok(s.x>=-14.01&&s.x<=7.01&&s.z>=-5.51&&s.z<=14.01,'outside safe site envelope');
  const excluded=[[-3.5,2.5,2.3,5.5],[-7.6,-5,-5.1,-2.5],[.20,.80,-3.55,-.25],[-1.95,-.05,-1.50,-.9],[4.4,5.1,-3.7,2.2],[-10.25,-8.85,6,7.1],[-8.9,-7.8,5.3,6.5],[-6.75,-5.5,5.25,6.4]];
  for(const [x1,x2,z1,z2] of excluded)assert.ok(!(s.x>x1&&s.x<x2&&s.z>z1&&s.z<z2),`obstacle at ${s.x},${s.z}`);
  for(const x of [-2,1.3,4.6])for(const z of [-3.3,-.8,1.7])assert.ok(Math.hypot(s.x-x,s.z-z)>.40,'column collision');
}
test('home is clear inside the office on its raised floor',()=>{const {state:s}=createDogBehaviour();near(s.x,-7);near(s.z,6.7);near(s.y,.102);assert.equal(s.zone,'office');});
test('autonomy visits interior and all sides of building with sleep and outdoor toilet habits',()=>{
  const dog=createDogBehaviour(),poses=new Set(),zones=new Set();let west=false,rear=false,east=false,front=false;
  for(let i=0;i<480*50;i++){
    const before={...dog.state};dog.update(.02);const s=dog.state;clear(s);poses.add(s.pose);zones.add(s.zone);
    west||=s.x<-12;rear||=s.z<-5;east||=s.x>6;front||=s.z>13.8;
    assert.ok(Math.hypot(s.x-before.x,s.z-before.z)<=2.2*.02+1e-7,'teleport or excessive speed');
    assert.ok(Math.abs(s.y-before.y)<.03,'floor height jumped');
    if(s.pose==='pee'||s.pose==='poop')assert.equal(s.zone,'outdoors');
    if(s.zone==='office')near(s.y,.102);
    if(s.zone==='first-floor')near(s.y,.08);
    const distance=Math.hypot(s.x-before.x,s.z-before.z);
    if(s.moving&&distance>1e-6)assert.ok(((s.x-before.x)*Math.sin(s.heading)+(s.z-before.z)*Math.cos(s.heading))/distance>.99);
  }
  for(const p of ['sit','sleep','walk','run','sniff','pee','poop'])assert.ok(poses.has(p),`missing ${p}`);
  assert.ok(zones.has('first-floor'));assert.ok(west&&rear&&east&&front,'roaming is too narrow');
});
test('shortest connected calls return smoothly to office from all regions',()=>{
  for(const departure of [19,42,69,92,115,144,172,215,270]){
    const dog=createDogBehaviour();advance(dog,departure);dog.setFocused(true);const before={...dog.state};assert.equal(dog.interact('call'),true);near(dog.state.x,before.x);near(dog.state.z,before.z);
    let home=false;
    for(let i=0;i<120*60;i++){const p={...dog.state};dog.update(1/60);clear(dog.state);assert.ok(Math.hypot(dog.state.x-p.x,dog.state.z-p.z)<1.15/60+1e-7);assert.ok(Math.abs(dog.state.y-p.y)<.02);if(dog.state.action!=='call'){home=true;break;}}
    assert.ok(home);near(dog.state.x,-7);near(dog.state.z,6.7);near(dog.state.y,.102);assert.equal(dog.state.pose,'sit');advance(dog,20);near(dog.state.x,-7);
  }
});
test('same elapsed time produces same journey at different frame rates',()=>{const a=createDogBehaviour(),b=createDogBehaviour();advance(a,178,30);advance(b,178,120);for(const key of ['x','y','z','time'])near(a.state[key],b.state[key]);assert.equal(a.state.action,b.state.action);});
test('pet and treat responses interrupt then restore movement with cooldowns',()=>{const d=createDogBehaviour();advance(d,19);assert.ok(d.state.moving);const {x,z}=d.state;assert.ok(d.interact('pet'));assert.equal(d.state.pose,'wag');assert.equal(d.state.hearts,1);assert.equal(d.interact('pet'),false);advance(d,2.5);near(d.state.x,x);near(d.state.z,z);advance(d,1);assert.ok(d.state.moving);assert.ok(d.interact('treat'));assert.equal(d.state.pose,'eat');assert.equal(d.interact('treat'),false);advance(d,8.1);assert.ok(d.interact('treat'));assert.equal(d.state.treats,2);});
test('focus freezes routine while reactions and cooldowns continue',()=>{const a=createDogBehaviour(),b=createDogBehaviour();advance(a,19);advance(b,19);a.setFocused(true);const {x,z}=a.state;a.interact('treat');advance(a,9);near(a.state.x,x);near(a.state.z,z);assert.equal(a.state.pose,'sit');near(a.state.treatCooldown,0);a.setFocused(false);advance(a,2);advance(b,2);near(a.state.x,b.state.x);near(a.state.z,b.state.z);});
test('pause freezes all counters and rejects interactions',()=>{const d=createDogBehaviour();advance(d,19);d.setPaused(true);const s={...d.state};advance(d,40);assert.deepEqual(d.state,s);assert.equal(d.interact('call'),false);assert.equal(d.interact('treat'),false);d.setPaused(false);d.update(.02);assert.ok(d.state.time>s.time);});
test('reduced motion stays inside office and accepts responses',()=>{const d=createDogBehaviour({reducedMotion:true});advance(d,500);near(d.state.x,-7);near(d.state.y,.102);near(d.state.z,6.7);assert.equal(d.state.pose,'sit');d.interact('pet');assert.equal(d.state.hearts,1);advance(d,4);d.interact('treat');assert.equal(d.state.pose,'eat');advance(d,4);d.interact('call');assert.equal(d.state.pose,'sit');});
test('invalid and stalled frames cannot fast-forward or poison state',()=>{const d=createDogBehaviour(),s={...d.state};for(const dt of [NaN,Infinity,-1,0,undefined,'1'])d.update(dt);assert.deepEqual(d.state,s);advance(d,19);const before={...d.state};d.update(3600);assert.ok(d.state.time-before.time<=.250001);assert.ok(Math.hypot(d.state.x-before.x,d.state.z-before.z)<=.550001);});
test('reset retains state reference and restores home, focus and session counters',()=>{const d=createDogBehaviour(),s=d.state;d.interact('pet');advance(d,4);d.interact('treat');d.setFocused(true);d.setPaused(true);d.reset();assert.equal(d.state,s);near(s.x,-7);near(s.y,.102);near(s.z,6.7);assert.equal(s.focused,false);assert.equal(s.paused,false);assert.equal(s.hearts,0);assert.equal(s.treats,0);});
