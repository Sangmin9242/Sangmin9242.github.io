import * as THREE from './vendor/three.module.js';

// A small airliner, with its nose along local +Z and wings along X.
export function airplane({boarding=false}={}) {
  const group=new THREE.Group();group.name='Conference airplane';
  const white=new THREE.MeshStandardMaterial({color:0xe5e8e7,metalness:.35,roughness:.3});
  const trim=new THREE.MeshStandardMaterial({color:0xb77435,metalness:.45,roughness:.35});
  const glass=new THREE.MeshStandardMaterial({color:0x18313e,metalness:.5,roughness:.15});
  const rubber=new THREE.MeshStandardMaterial({color:0x252b2c,roughness:.8});
  const gears=[];
  function mesh(geometry,material,position=[0,0,0]){const m=new THREE.Mesh(geometry,material);m.position.set(...position);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
  const profile=[[-1.85,.018],[-1.65,.09],[-1.2,.155],[.65,.17],[1.12,.145],[1.4,.1],[1.65,.018]].map(([y,r])=>new THREE.Vector2(r*1.45,y));
  // Curved fuselage skin with a real passenger aperture on its port side.
  const doorShape=(y,z)=>{const dx=Math.abs(z-.62)-.155+.055,dy=Math.abs(y-.61)-.245+.055;return Math.hypot(Math.max(dx,0),Math.max(dy,0))+Math.min(Math.max(dx,dy),0)<.055;};
  let body;
  if(boarding){
    const vertices=[],normals=[],indices=[],nz=240,na=128;
    function radius(z){let i=0;while(i<profile.length-2&&z>profile[i+1].y)i++;const a=profile[i],b=profile[i+1];return THREE.MathUtils.lerp(a.x,b.x,(z-a.y)/(b.y-a.y));}
    for(let i=0;i<=nz;i++){const z=THREE.MathUtils.lerp(-1.85,1.65,i/nz),r=radius(z);for(let j=0;j<=na;j++){const a=j/na*Math.PI*2;vertices.push(Math.sin(a)*r,.62+Math.cos(a)*r,z);}}
    for(let i=0;i<nz;i++)for(let j=0;j<na;j++){const a=i*(na+1)+j,b=a+na+1;for(const tri of [[a,b,a+1],[b,b+1,a+1]]){const c=tri.map(k=>new THREE.Vector3(...vertices.slice(k*3,k*3+3))).reduce((v,p)=>v.add(p),new THREE.Vector3()).multiplyScalar(1/3);if(c.x<0&&doorShape(c.y,c.z))continue;indices.push(...tri);}}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();body=mesh(geo,white);body.material=white.clone();body.material.side=THREE.DoubleSide;
    group.userData.aperture={z:.62,bottom:.365,top:.855,width:.31};
  }else{body=mesh(new THREE.LatheGeometry(profile,32),white,[0,.62,0]);body.rotation.x=Math.PI/2;}

  group.userData.fuselage=body;
  function foil(vertices,material){const s=new THREE.Shape();vertices.forEach(([x,z],i)=>i?s.lineTo(x,z):s.moveTo(x,z));s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:.035,bevelEnabled:true,bevelSize:.015,bevelThickness:.012,bevelSegments:2,steps:1});const m=mesh(g,material,[0,.58,0]);m.rotation.x=Math.PI/2;return m;}
  for(const side of [-1,1]){
    foil([[side*.13,.34],[side*1.5,-.55],[side*1.56,-.8],[side*.16,-.3]],white);
    foil([[side*.06,-1.1],[side*.62,-1.42],[side*.63,-1.65],[side*.09,-1.5]],white);
    const engine=mesh(new THREE.CylinderGeometry(.105,.12,.4,24),white,[side*.57,.45,.15]);engine.rotation.x=Math.PI/2;
    const fan=mesh(new THREE.CircleGeometry(.085,24),glass,[side*.57,.45,.355]);
    for(let z=-1.05;z<.9;z+=.16){if(boarding&&side===-1&&z>.43)continue;const w=mesh(new THREE.SphereGeometry(1,10,8),glass,[side*.242,.675,z]);w.scale.set(.009,.025,.033);}
    const pivot=new THREE.Group();pivot.position.set(side*.2,.38,-.35);group.add(pivot);
    const wheel=mesh(new THREE.CylinderGeometry(.08,.08,.06,20),rubber);wheel.rotation.z=Math.PI/2;pivot.add(wheel);wheel.position.set(0,-.315,0);
    const strut=mesh(new THREE.CylinderGeometry(.019,.015,.47,12),white);pivot.add(strut);strut.position.set(0,-.08,0);
    gears.push({pivot,axis:'z',direction:-side});

  }
  const finShape=new THREE.Shape();finShape.moveTo(0,0);finShape.lineTo(0,.58);finShape.lineTo(.15,.64);finShape.lineTo(.62,0);finShape.closePath();
  const fin=mesh(new THREE.ExtrudeGeometry(finShape,{depth:.025,bevelEnabled:false}),trim,[0,.65,-1.65]);fin.rotation.y=-Math.PI/2;
  const cockpit=mesh(new THREE.SphereGeometry(1,24,16),glass,[0,.69,1.22]);cockpit.scale.set(.115,.038,.14);
  const front=new THREE.Group();front.position.set(0,.38,1.05);group.add(front);
  const frontWheel=mesh(new THREE.CylinderGeometry(.06,.06,.045,20),rubber);frontWheel.rotation.z=Math.PI/2;front.add(frontWheel);frontWheel.position.set(0,-.335,0);
  const frontStrut=mesh(new THREE.CylinderGeometry(.017,.012,.44,12),white);front.add(frontStrut);frontStrut.position.set(0,-.115,0);gears.push({pivot:front,axis:'x',direction:1});
  group.userData.setGear=progress=>{const p=THREE.MathUtils.clamp(progress,0,1),fold=THREE.MathUtils.smoothstep(p,.15,.8);gears.forEach(({pivot,axis,direction})=>{pivot.rotation[axis]=direction*fold*Math.PI*.49;pivot.position.y=.38+fold*.24;pivot.visible=p<.97;});group.userData.gearProgress=p;group.userData.gearVisible=gears.filter(g=>g.pivot.visible).length;};
  const belly=(x,z)=>{let i=0;while(i<profile.length-2&&z>profile[i+1].y)i++;const a=profile[i],b=profile[i+1],r=THREE.MathUtils.lerp(a.x,b.x,(z-a.y)/(b.y-a.y));return .62-Math.sqrt(Math.max(0,r*r-x*x));};
  group.userData.gearConnectionMargins=[.535-belly(-.2,-.35),.535-belly(.2,-.35),.485-belly(0,1.05)];
  group.userData.setGear(0);
  return group;
}
