import * as THREE from './vendor/three.module.js';
export function studentHead(parent,position,facing=0){
  const head=new THREE.Group();head.position.set(...position);head.rotation.y=facing;parent.add(head);
  const skin=new THREE.MeshStandardMaterial({color:0xc8a48b,roughness:.8}),hair=new THREE.MeshStandardMaterial({color:0x181d22,roughness:.9}),dark=new THREE.MeshStandardMaterial({color:0x26343c,roughness:.5});
  function oval(scale,pos,material){const m=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),material);m.scale.set(...scale);m.position.set(...pos);m.castShadow=true;head.add(m);return m;}
  oval([.135,.175,.14],[0,0,0],skin);for(const side of [-1,1])oval([.024,.042,.022],[side*.135,-.015,0],skin);
  const cap=new THREE.Mesh(new THREE.SphereGeometry(1,28,18,0,Math.PI*2,0,Math.PI*.53),hair);cap.scale.set(.143,.163,.146);cap.position.y=.025;head.add(cap);
  for(let i=0;i<5;i++)oval([.031,.035,.028],[-.09+i*.037,.063+i*.006,.118],hair);
  oval([.026,.034,.028],[0,-.025,.137],skin);
  for(const side of [-1,1]){
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.042,.004,8,24),dark);rim.scale.y=.85;rim.position.set(side*.058,.012,.131);head.add(rim);
    oval([.009,.012,.008],[side*.057,.009,.14],dark);
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(.003,.003,.115,8),dark);arm.rotation.x=Math.PI/2;arm.position.set(side*.10,.015,.075);head.add(arm);
  }
  const bridge=new THREE.Mesh(new THREE.BoxGeometry(.032,.004,.004),dark);bridge.position.set(0,.015,.139);head.add(bridge);
  parent.userData.studentHead=true;return head;
}
export function studentShirt(parent,y,z=0){
  const shirt=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),new THREE.MeshStandardMaterial({color:0xf1f0e9,roughness:.9}));shirt.scale.set(.105,.19,.017);shirt.position.set(0,y,z);parent.add(shirt);
  for(const side of [-1,1]){const collar=new THREE.Mesh(new THREE.BoxGeometry(.055,.07,.012),shirt.material);collar.position.set(side*.04,y+.15,z+.005);collar.rotation.z=side*.35;parent.add(collar);}
}
