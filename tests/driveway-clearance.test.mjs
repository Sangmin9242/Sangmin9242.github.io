import test from 'node:test';
import assert from 'node:assert/strict';
import {createCarTrip} from '../car-trip.js';
const fleet=[[-14,4.38,1.72],[-9,4.66,1.89],[-4,4.9,1.86],[1,4.75,1.92],[6,4.86,1.86]];
function overlaps(c,width,length,b){
 for(const [x,z] of [[Math.cos(c.heading),-Math.sin(c.heading)],[Math.sin(c.heading),Math.cos(c.heading)],[1,0],[0,1]]){
  const a=width/2*Math.abs(x*Math.cos(c.heading)-z*Math.sin(c.heading))+length/2*Math.abs(x*Math.sin(c.heading)+z*Math.cos(c.heading));
  const r=b.width/2*Math.abs(x)+b.length/2*Math.abs(z);
  if(Math.abs((c.x-b.x)*x+(c.z-b.z)*z)>a+r+.06)return false;
 }
 return true;
}
test('all five complete vehicle footprints clear the actual bowling room',()=>{
 const bowling={x:27.75,z:13,width:27,length:6.95};
 for(const [x,length,width] of fleet){const t=createCarTrip({x,length,width});t.board();
  for(let i=0;t.isActive()&&i<25000;i++){t.update(.01);assert.equal(overlaps(t.state.car,width+.48,length+.08,bowling),false,`bay ${x}, ${t.state.phase}, at ${JSON.stringify(t.state.car)}`);}
 }
});

import {parkingLampPositions,parkingBollardPositions,roadOutline} from '../driveway-layout.js';
test('vehicle bodies clear relocated lamps and bollards throughout the full trip',()=>{
 const poles=[...parkingLampPositions,...parkingBollardPositions].map(([x,z])=>({x,z,width:.4,length:.4}));
 for(const [x,length,width] of fleet){const t=createCarTrip({x,length,width});t.board();while(t.isActive()){t.update(.025);for(const p of poles)assert.equal(overlaps(t.state.car,width+.48,length+.08,p),false,`bay ${x} hits pole at ${p.x},${p.z} during ${t.state.phase}`);}}
});
function inside(x,z){let yes=false;for(let i=0,j=roadOutline.length-1;i<roadOutline.length;j=i++){const a=roadOutline[i],b=roadOutline[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
test('moving vehicle tyre tracks stay on the continuous driveway',()=>{
 for(const [x,length,width] of fleet){const t=createCarTrip({x,length,width});t.board();while(t.isActive()){t.update(.025);const c=t.state.car;if(Math.abs(t.state.signedSpeed)<.01)continue;
  for(const side of [-width/2,width/2])for(const forward of [-length*.31,length*.31]){const px=c.x+side*Math.cos(c.heading)+forward*Math.sin(c.heading),pz=c.z-side*Math.sin(c.heading)+forward*Math.cos(c.heading);assert.ok(inside(px,pz)||(px>=-17&&px<=10.1&&pz>=19.4&&pz<=25),`wheel off pavement ${t.state.phase}: ${px},${pz}`);}
 }}
});
import {forecourtPads} from '../driveway-layout.js';
test('full car body with mirror allowance stays over pavement at every turn',()=>{
 const paved=(x,z)=>inside(x,z)||forecourtPads.some(p=>x>=p.x-p.width/2-.00001&&x<=p.x+p.width/2+.00001&&z>=p.z-p.length/2-.00001&&z<=p.z+p.length/2+.00001);
 for(const [x,length,width] of fleet){const t=createCarTrip({x,length,width});t.board();while(t.isActive()){t.update(.025);const c=t.state.car;
  for(const side of [-(width+.48)/2,(width+.48)/2])for(const forward of [-(length+.08)/2,(length+.08)/2]){const px=c.x+side*Math.cos(c.heading)+forward*Math.sin(c.heading),pz=c.z-side*Math.sin(c.heading)+forward*Math.cos(c.heading);assert.ok(paved(px,pz),`body off pavement ${t.state.phase}: ${px},${pz}`);}
 }}
});
