import * as THREE from './vendor/three.module.js';
export function studentHead(parent,position,facing=0){
  const head=new THREE.Group();head.position.set(...position);head.rotation.y=facing;parent.add(head);
  const skin=new THREE.MeshStandardMaterial({color:0xc8a48b,roughness:.8}),hair=new THREE.MeshStandardMaterial({color:0x181d22,roughness:.9}),dark=new THREE.MeshStandardMaterial({color:0x26343c,roughness:.5});
  function oval(scale,pos,material){const m=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),material);m.scale.set(...scale);m.position.set(...pos);m.castShadow=true;head.add(m);return m;}
  oval([.135,.175,.14],[0,0,0],skin);for(const side of [-1,1])oval([.024,.042,.022],[side*.135,-.015,0],skin);
  const vertices=[],indices=[],rings=18,sectors=40;
  for(let i=0;i<=rings;i++)for(let j=0;j<=sectors;j++){const phi=j/sectors*Math.PI*2,front=Math.max(0,Math.sin(phi)),edge=-.10+front*.19+Math.abs(Math.cos(phi))*.07+Math.sin(phi*3)*.008,limit=Math.acos((edge-.025)/.17),theta=i/rings*limit;vertices.push(Math.sin(theta)*Math.cos(phi)*.142,.025+Math.cos(theta)*.17,Math.sin(theta)*Math.sin(phi)*.146);}
  for(let i=0;i<rings;i++)for(let j=0;j<sectors;j++){const a=i*(sectors+1)+j,b=a+sectors+1;indices.push(a,b,a+1,b,b+1,a+1);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();const haircut=new THREE.Mesh(geometry,hair);haircut.material.side=THREE.DoubleSide;head.add(haircut);
  oval([.026,.034,.028],[0,-.025,.137],skin);
  for(const side of [-1,1]){
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.042,.004,8,24),dark);rim.scale.y=.85;rim.position.set(side*.058,.012,.131);head.add(rim);
    oval([.018,.012,.006],[side*.057,.009,.137],new THREE.MeshStandardMaterial({color:0xe5dfd5,roughness:.8}));oval([.006,.007,.004],[side*.057,.009,.145],dark);const brow=new THREE.Mesh(new THREE.BoxGeometry(.038,.005,.006),hair);brow.position.set(side*.057,.047,.132);brow.rotation.z=side*.06;head.add(brow);
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(.003,.003,.115,8),dark);arm.rotation.x=Math.PI/2;arm.position.set(side*.10,.015,.075);head.add(arm);
  }
  const bridge=new THREE.Mesh(new THREE.BoxGeometry(.032,.004,.004),dark);bridge.position.set(0,.015,.139);head.add(bridge);
  const smile=new THREE.CatmullRomCurve3([new THREE.Vector3(-.028,-.072,.123),new THREE.Vector3(0,-.077,.13),new THREE.Vector3(.028,-.072,.123)]);head.add(new THREE.Mesh(new THREE.TubeGeometry(smile,16,.002,6,false),new THREE.MeshStandardMaterial({color:0x946758,roughness:.9})));
  parent.userData.studentHead=true;return head;
}
export function studentShirt(parent,y,z=0){
  const shirt=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),new THREE.MeshStandardMaterial({color:0xf1f0e9,roughness:.9}));shirt.scale.set(.105,.19,.017);shirt.position.set(0,y,z);parent.add(shirt);
  for(const side of [-1,1]){const collar=new THREE.Mesh(new THREE.BoxGeometry(.055,.07,.012),shirt.material);collar.position.set(side*.04,y+.15,z+.005);collar.rotation.z=side*.35;parent.add(collar);}
}

export function studentJacket(parent,material){
  const shape=new THREE.Shape();shape.moveTo(-.16,.03);shape.lineTo(.16,.03);shape.quadraticCurveTo(.19,.13,.18,.41);shape.quadraticCurveTo(.21,.54,.12,.56);shape.lineTo(-.12,.56);shape.quadraticCurveTo(-.21,.54,-.18,.41);shape.quadraticCurveTo(-.19,.13,-.16,.03);
  const geo=new THREE.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:true,bevelSize:.018,bevelThickness:.018,bevelSegments:3,steps:1,curveSegments:12});geo.translate(0,0,-.09);const torso=new THREE.Mesh(geo,material);torso.castShadow=true;parent.add(torso);
  const white=new THREE.MeshStandardMaterial({color:0xe8e7e2,roughness:.9});const shirt=new THREE.Mesh(new THREE.BoxGeometry(.15,.43,.012),white);shirt.position.set(0,.30,.116);parent.add(shirt);
  for(const side of [-1,1]){const collar=new THREE.Shape();collar.moveTo(side*.07,.545);collar.lineTo(0,.50);collar.lineTo(side*.045,.445);collar.closePath();const panel=new THREE.Mesh(new THREE.ShapeGeometry(collar),white);panel.position.z=.13;parent.add(panel);}
  for(const y of [.22,.32,.42]){const button=new THREE.Mesh(new THREE.SphereGeometry(.004,8,6),new THREE.MeshStandardMaterial({color:0xa5a7a5}));button.position.set(0,y,.126);parent.add(button);}
  for(const side of [-1,1]){const lapel=new THREE.Mesh(new THREE.BoxGeometry(.055,.21,.014),material);lapel.position.set(side*.087,.37,.132);lapel.rotation.z=side*.22;parent.add(lapel);}
}
