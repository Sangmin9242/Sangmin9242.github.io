import * as THREE from './vendor/three.module.js';
import { studentHead, studentShirt, studentJacket } from './student-avatar.js?v=20261014-refined';

export function boardingAvatar({worker=false,sport=false}={}){
  const group=new THREE.Group(),hip=new THREE.Group();group.add(hip);hip.position.y=.86;
  const cloth=new THREE.MeshStandardMaterial({color:sport?0x226b8a:0x354957,roughness:.8}),pants=new THREE.MeshStandardMaterial({color:0x34414b,roughness:.8}),skin=new THREE.MeshStandardMaterial({color:0xc2a38c,roughness:.8}),hatMaterial=new THREE.MeshStandardMaterial({color:0xdfded3,roughness:.65}),shoe=new THREE.MeshStandardMaterial({color:sport?0xe9eceb:0x242a2d,roughness:.85});
  function oval(parent,scale,position,material){const m=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),material);m.scale.set(...scale);m.position.set(...position);m.castShadow=true;parent.add(m);return m;}
  function limb(parent,length,radius,material){const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius*.9,length,12),material);m.position.y=-length/2;m.castShadow=true;parent.add(m);}
  oval(hip,worker?[.19,.12,.14]:[.17,.075,.12],[0,worker?0:-.01,0],pants);
  const upper=new THREE.Group();hip.add(upper);if(worker)oval(upper,[.21,.3,.14],[0,.29,0],cloth);else if(sport){oval(upper,[.19,.29,.12],[0,.29,0],cloth);const stripe=new THREE.Mesh(new THREE.BoxGeometry(.27,.018,.012),new THREE.MeshStandardMaterial({color:0xf1eee7}));stripe.position.set(0,.39,.122);upper.add(stripe);}else studentJacket(upper,cloth);if(worker)oval(upper,[.135,.175,.14],[0,.75,0],skin);else{studentHead(upper,[0,.75,0]);}
  if(worker){const hat=new THREE.Mesh(new THREE.SphereGeometry(.155,20,12,0,Math.PI*2,0,Math.PI/2),hatMaterial);hat.position.y=.79;hat.scale.y=.72;upper.add(hat);oval(upper,[.18,.016,.18],[0,.79,.025],hatMaterial);}
  const legs=[],arms=[];
  for(const side of [-1,1]){const leg=new THREE.Group();leg.position.x=side*.12;hip.add(leg);limb(leg,.38,.065,pants);const knee=new THREE.Group();knee.position.y=-.38;leg.add(knee);limb(knee,.38,.055,pants);oval(knee,[.075,.05,.13],[0,-.38,.06],shoe);legs.push({leg,knee,side});const arm=new THREE.Group();arm.position.set(side*.24,.49,0);upper.add(arm);limb(arm,.29,.055,cloth);const elbow=new THREE.Group();elbow.position.y=-.29;arm.add(elbow);limb(elbow,.25,.044,cloth);oval(elbow,[.045,.06,.04],[0,-.28,0],skin);arms.push({arm,elbow,side});}
  group.userData.pose=(time,walking,crouch=0)=>{hip.position.y=.86-crouch*.42+(walking?Math.sin(time*16)*.014:0);upper.rotation.x=crouch*1.35;legs.forEach(({leg,knee,side})=>{const step=walking?Math.sin(time*8+side*Math.PI/2):0;leg.rotation.x=step*.38-crouch*.8;knee.rotation.x=Math.max(0,-step)*.65+crouch*1.4;});arms.forEach(({arm,elbow,side})=>{arm.rotation.x=(walking?-Math.sin(time*8+side*Math.PI/2)*.32:0)-crouch*.4;elbow.rotation.x=-.12;if(group.userData.towing&&side===1){arm.rotation.x=.35;arm.rotation.z=-.12;elbow.rotation.x=-.1;}});};
  group.userData.seated=()=>{hip.position.y=.58;upper.rotation.x=.10;legs.forEach(({leg,knee})=>{leg.rotation.x=-Math.PI/2;knee.rotation.x=Math.PI/2;});arms.forEach(({arm,elbow})=>{arm.rotation.x=-.95;elbow.rotation.x=-.65;});};
  group.userData.sportRig={hip,upper,legs,arms};group.userData.headMount=upper;group.userData.pose(0,false);return group;
}
