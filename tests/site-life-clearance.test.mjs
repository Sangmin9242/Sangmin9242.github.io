import test from 'node:test';
import assert from 'node:assert/strict';
import { createDogBehaviour } from '../dog-behaviour.js';
import { createCarTrip } from '../car-trip.js';

test('free-roaming dog keeps body clearance from all five turning car footprints',()=>{
  const fleet=[[-14,4.38,1.72],[-9,4.66,1.89],[-4,4.90,1.86],[1,4.75,1.92],[6,4.86,1.86]];
  for(const [x,length,width] of fleet)for(const offset of [0,5.5,10,25,53,95,145]){
    const dog=createDogBehaviour(),trip=createCarTrip({x,length,width});
    for(let t=0;t<offset;t+=.05)dog.update(Math.min(.05,offset-t));
    trip.board();
    for(let t=0;trip.isActive();t+=.05){
      dog.update(.05);trip.update(.05);const c=trip.state.car,s=dog.state,dx=s.x-c.x,dz=s.z-c.z;
      const side=dx*Math.cos(c.heading)-dz*Math.sin(c.heading),forward=dx*Math.sin(c.heading)+dz*Math.cos(c.heading);
      assert.ok(Math.abs(side)>width/2+.25||Math.abs(forward)>length/2+.25,
        `dog/car clearance at bay ${x}, offset ${offset}, phase ${trip.state.phase}, t ${t}`);
    }
  }
});
