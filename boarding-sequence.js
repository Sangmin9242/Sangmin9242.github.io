import * as THREE from './vendor/three.module.js';
import { boardingAvatar } from './boarding-avatar.js?v=20261014-student';

export function boardingSequence({world,researcher,avatar,plane,box,beam}){
  const person=boardingAvatar();person.scale.setScalar(1.1);person.visible=false;world.add(person);
  researcher.updateMatrixWorld(true);plane.updateMatrixWorld(true);
  const start=avatar.getWorldPosition(new THREE.Vector3());start.y=0;
  const pickup=new THREE.Vector3(-5.8,0,7.2),luggage=new THREE.Group();
  world.add(luggage);luggage.position.copy(pickup);
  box(luggage,[.43,.58,.26],[0,.36,0],0xa76737,{metalness:.25,roughness:.65});
  for(const x of [-.12,0,.12])box(luggage,[.012,.49,.008],[x,.36,.134],0xc08b55);
  for(const x of [-.16,.16]){
    beam(luggage,[x,.59,0],[x,.82,0],.015,0xc7cccc);
    const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.045,12),new THREE.MeshStandardMaterial({color:0x22282a}));wheel.rotation.z=Math.PI/2;wheel.position.set(x,.07,-.06);luggage.add(wheel);
  }
  beam(luggage,[-.16,.82,0],[.16,.82,0],.024,0x273239);
  const entry=plane.localToWorld(new THREE.Vector3(-.24,.365,.62));
  const outward=new THREE.Vector3(-1,0,0).transformDirection(plane.matrixWorld),vertical=new THREE.Vector3(0,1,0),right=new THREE.Vector3().crossVectors(vertical,outward);
  const bottom=entry.clone().addScaledVector(outward,3.4);bottom.y=0;
  const stairRoot=new THREE.Group();stairRoot.position.copy(entry);stairRoot.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,vertical,outward));world.add(stairRoot);
  const stairs=new THREE.Group();stairRoot.add(stairs);const lower=new THREE.Group();lower.position.set(0,-entry.y/2,1.7);stairs.add(lower);const rails=[];
  for(const [segment,offset] of [[stairs,0],[lower,.5]]){
    for(let i=0;i<6;i++){const q=(i+.5)/6;box(segment,[1.05,.075,1.7/6+.025],[0,-entry.y/2*q,1.7*q],0x909795,{metalness:.6,roughness:.4});}
    const rail=new THREE.Group();segment.add(rail);rails.push(rail);
    for(const x of [-.55,.55]){beam(rail,[x,.8,0],[x,.8-entry.y/2,1.7],.022,0xc1c7c3);for(const q of [0,.5,1])beam(rail,[x,-entry.y/2*q,1.7*q],[x,.8-entry.y/2*q,1.7*q],.022,0xc1c7c3);}
  }
  const door=new THREE.Group();plane.add(door);
  // A curved plug door follows the fuselage skin, then moves outward and forward.
  const outline=(y,z)=>{const dx=Math.abs(z-.62)-.155+.055,dy=Math.abs(y-.61)-.245+.055;return Math.hypot(Math.max(dx,0),Math.max(dy,0))+Math.min(Math.max(dx,dy),0)<.055;};
  const positions=[],indices=[],ny=50,nz=32;
  const radius=z=>z<.65?.2465:THREE.MathUtils.lerp(.2465,.21025,(z-.65)/.47);
  for(let i=0;i<=ny;i++)for(let j=0;j<=nz;j++){const y=.365+i/ny*.49,z=.465+j/nz*.31;positions.push(-Math.sqrt(Math.max(.00005,radius(z)**2-(y-.62)**2))-.0015,y,z);}
  for(let i=0;i<ny;i++)for(let j=0;j<nz;j++){const a=i*(nz+1)+j,b=a+nz+1;for(const tri of [[a,a+1,b],[b,a+1,b+1]]){const c=tri.map(k=>new THREE.Vector3(...positions.slice(k*3,k*3+3))).reduce((v,p)=>v.add(p),new THREE.Vector3()).multiplyScalar(1/3);if(outline(c.y,c.z))indices.push(...tri);}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();const panel=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0xe5e8e7,metalness:.35,roughness:.3,side:THREE.DoubleSide}));door.add(panel);
  const windowPositions=[],windowIndices=[];
  for(let i=0;i<=32;i++){const a=i/32*Math.PI*2,y=.745+Math.sin(a)*.033,z=.62+Math.cos(a)*.033;windowPositions.push(-Math.sqrt(Math.max(.00005,radius(z)**2-(y-.62)**2))-.003,y,z);}
  windowPositions.push(-Math.sqrt(radius(.62)**2-(.745-.62)**2)-.003,.745,.62);for(let i=0;i<32;i++)windowIndices.push(33,i,i+1);
  const windowGeo=new THREE.BufferGeometry();windowGeo.setAttribute('position',new THREE.Float32BufferAttribute(windowPositions,3));windowGeo.setIndex(windowIndices);windowGeo.computeVertexNormals();door.add(new THREE.Mesh(windowGeo,new THREE.MeshBasicMaterial({color:0x18313e,side:THREE.DoubleSide})));
  const border=[];
  for(const [z,y,start] of [[.72,.80,0],[.52,.80,90],[.52,.42,180],[.72,.42,270]])for(let i=0;i<=12;i++){const a=(start+i/12*90)*Math.PI/180,zz=z+.055*Math.cos(a),yy=y+.055*Math.sin(a);border.push(new THREE.Vector3(-Math.sqrt(Math.max(.00005,radius(zz)**2-(yy-.62)**2))-.001,yy,zz));}
  const frame=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(border,true),160,.005,6,true),new THREE.MeshStandardMaterial({color:0x8a9291,metalness:.7,roughness:.4}));plane.add(frame);
  box(door,[.012,.008,.07],[-.244,.59,.68],0x59656a,{metalness:.8});
  const cabin=new THREE.Group();plane.add(cabin);box(cabin,[.4,.009,.29],[-.03,.36,.62],0x44505b);box(cabin,[.01,.44,.29],[.14,.60,.62],0x172631);
  const walk=new THREE.CatmullRomCurve3([pickup,new THREE.Vector3(-8,0,10),new THREE.Vector3(-27,0,10),bottom.clone().add(new THREE.Vector3(0,0,1.5)),bottom]);
  const duration=15.8,data=document.querySelector('#scene');data.dataset.planeScale=String(plane.scale.x);data.dataset.boardingDoorHeight=String(.49*plane.scale.y);data.dataset.boardingDoor='curved-aperture';
  plane.updateMatrixWorld(true);
  const fuselage=plane.userData.fuselage,ray=new THREE.Raycaster();let apertureClear=true;
  for(const y of [.42,.58,.77])for(const z of [.57,.62,.67]){const origin=plane.localToWorld(new THREE.Vector3(-.4,y,z)),heading=new THREE.Vector3(1,0,0).transformDirection(plane.matrixWorld);ray.set(origin,heading);ray.near=0;ray.far=.35*plane.scale.x;if(ray.intersectObject(fuselage).length)apertureClear=false;}
  const aircraftBounds=[];plane.traverse(n=>{if(n.isMesh&&n!==panel){aircraftBounds.push(new THREE.Box3().setFromObject(n));}});
  let approachClear=true;for(let i=0;i<=400;i++){const p=walk.getPointAt(i/400),bounds=new THREE.Box3(p.clone().add(new THREE.Vector3(-.3,.1,-.3)),p.clone().add(new THREE.Vector3(.3,1.9,.3)));if(aircraftBounds.some(b=>bounds.intersectsBox(b)))approachClear=false;}
  data.dataset.apertureClear=String(apertureClear);data.dataset.approachClear=String(approachClear);
  function mechanism(elapsed){
    const fold=THREE.MathUtils.smoothstep(elapsed,11.6,13.6),close=THREE.MathUtils.smoothstep(elapsed,13.8,15.5);
    const opened=THREE.MathUtils.smoothstep(elapsed,7.6,8.4)*(1-close);
    door.position.set(-.045*THREE.MathUtils.smoothstep(opened,0,.3),0,.34*THREE.MathUtils.smoothstep(opened,.2,1));
    rails.forEach(r=>r.scale.y=1-THREE.MathUtils.smoothstep(fold,0,.2));lower.rotation.x=THREE.MathUtils.smoothstep(fold,.2,.6)*Math.PI;
    stairs.rotation.x=-THREE.MathUtils.smoothstep(fold,.6,1)*(Math.PI/2+Math.atan2(entry.y,3.4));
    stairRoot.visible=fold<.999;cabin.visible=opened>.01;data.dataset.boardingFloorVisible=String(cabin.visible);data.dataset.stairFold=String(fold);data.dataset.doorOpen=String(opened);
  }
  function setTow(active){person.userData.towing=active;if(active){if(luggage.parent!==person)person.add(luggage);luggage.position.set(.23,.01,-.38);luggage.rotation.set(.25,0,0);luggage.scale.setScalar(1/1.1);}}
  function face(direction){person.rotation.y=Math.atan2(direction.x,direction.z);}
  function animate(elapsed){
    if(elapsed<duration){person.visible=true;avatar.visible=false;stairRoot.visible=true;let phase;
      if(elapsed<.65){person.position.copy(start);person.userData.pose(elapsed,false,.45*(1-THREE.MathUtils.smoothstep(elapsed,0,.65)));phase='standing';}
      else if(elapsed<2.1){const t=THREE.MathUtils.clamp((elapsed-.65)/1.45,0,1);person.position.copy(start).lerp(pickup,t);face(pickup.clone().sub(start));person.userData.pose(elapsed,true);phase='walking';}
      else if(elapsed<2.65){person.position.copy(pickup);setTow(true);face(walk.getTangentAt(0));person.userData.pose(elapsed,false);phase='pickup';}
      else if(elapsed<8.4){const t=THREE.MathUtils.clamp((elapsed-2.65)/5.75,0,1);person.position.copy(walk.getPointAt(t));face(walk.getTangentAt(t));setTow(true);person.userData.pose(elapsed,true);phase='walking';}
      else if(elapsed<11.5){const t=THREE.MathUtils.clamp((elapsed-8.4)/3.1,0,1),climb=Math.min(t/.8,1);person.position.copy(bottom).lerp(entry,climb);if(t<.8){const q=1-climb;person.position.y=entry.y-entry.y*((Math.min(11,Math.floor(q*12))+.5)/12)+.01;}if(t>.8)person.position.addScaledVector(outward,-(t-.8)/.2*.65);face(outward.clone().negate());setTow(true);person.userData.pose(elapsed,true,0);person.visible=t<.99;phase='boarding';}
      else{person.visible=false;phase=elapsed<13.8?'stairs-folding':'door-closing';}
      mechanism(elapsed);
      data.dataset.luggageState=elapsed>=11.5?'boarded':person.userData.towing?'towing':'parked';data.dataset.boardingUpright=String(elapsed>=8.4);data.dataset.luggagePosition=JSON.stringify(luggage.getWorldPosition(new THREE.Vector3()).toArray());
      data.dataset.avatarFeet=JSON.stringify(person.position.toArray());const shot=bottom.clone().lerp(entry,.5).add(new THREE.Vector3(0,.8,0));const cameraPoint=elapsed>=8.4?bottom.clone().add(new THREE.Vector3(0,.8,0)).lerp(shot,THREE.MathUtils.smoothstep(elapsed,8.4,9.2)):person.position.clone().add(new THREE.Vector3(0,.8,0));data.dataset.boardingCameraPoint=JSON.stringify(cameraPoint.toArray());return {point:cameraPoint,cameraOffset:outward.clone().multiplyScalar(5).addScaledVector(right,3).add(new THREE.Vector3(0,2.2,0)),phase,flightElapsed:0};
    }
    person.visible=false;stairRoot.visible=false;door.position.set(0,0,0);cabin.visible=false;data.dataset.boardingFloorVisible='false';data.dataset.luggageState='boarded';return {point:plane.position.clone(),phase:'boarded',flightElapsed:elapsed-duration};
  }
  function reset(){lower.rotation.x=0;stairs.rotation.x=0;rails.forEach(r=>r.scale.y=1);person.visible=false;avatar.visible=true;person.userData.towing=false;world.add(luggage);luggage.position.copy(pickup);luggage.rotation.set(0,0,0);luggage.scale.setScalar(1);stairRoot.visible=false;door.position.set(0,0,0);cabin.visible=false;data.dataset.boardingFloorVisible='false';data.dataset.luggageState='parked';}
  stairRoot.visible=false;cabin.visible=false;return {duration,animate,start(){person.visible=true;avatar.visible=false;},reset};
}
