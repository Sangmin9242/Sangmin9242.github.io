import * as THREE from './vendor/three.module.js';
import { boardingAvatar } from './boarding-avatar.js?v=20261014-refined';

export function constructionWorkers({building,reducedMotion}){
  const workers=[];
  for(const [index,floor] of [4,5].entries()){
    const worker=boardingAvatar({worker:true});worker.name='Construction worker with helmet-mounted 360 camera';worker.scale.setScalar(.68);building.add(worker);
    const replacements=new Map();worker.traverse(n=>{if(!n.isMesh)return;const hex=n.material.color?.getHex();if(hex===0x354957||hex===0xdfded3){if(!replacements.has(n.material)){const material=n.material.clone();material.color.setHex(hex===0x354957?0xef8d31:0xffce42);replacements.set(n.material,material);}n.material=replacements.get(n.material);}});
    const mount=new THREE.Group();mount.position.set(0,.90,0);worker.userData.headMount.add(mount);
    const black=new THREE.MeshStandardMaterial({color:0x1f272b,roughness:.38,metalness:.3}),glass=new THREE.MeshStandardMaterial({color:0x152c3a,roughness:.12,metalness:.7});
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.014,.014,.09,10),black);stem.position.y=.025;mount.add(stem);
    const camera=new THREE.Mesh(new THREE.BoxGeometry(.062,.14,.035),black);camera.position.y=.14;mount.add(camera);
    for(const side of [-1,1]){const lens=new THREE.Mesh(new THREE.SphereGeometry(.028,16,12),glass);lens.scale.z=.46;lens.position.set(0,.176,side*.021);mount.add(lens);}
    const bodyScreen=new THREE.Mesh(new THREE.PlaneGeometry(.04,.045),new THREE.MeshBasicMaterial({color:0x416a7c}));bodyScreen.position.set(0,.118,.018);mount.add(bodyScreen);
    // Short paths stay between columns and behind the guardrails.
    const start=index===0?-2.5:.65,end=index===0?-.65:2.5;
    workers.push({worker,floor,start,end,index});
  }
  function animate(time){const t=reducedMotion?0:time;for(const {worker,floor,start,end,index} of workers){const phase=t*.38+index*Math.PI,progress=(Math.sin(phase)+1)/2;worker.position.set(THREE.MathUtils.lerp(start,end,progress),floor*1.65+.046,2.05);worker.rotation.y=Math.cos(phase)>=0?Math.PI/2:-Math.PI/2;worker.userData.pose(t,!reducedMotion);}
    const data=document.querySelector('#scene').dataset;data.constructionWorkers=String(workers.length);data.helmetCameras=String(workers.length);data.workerPositions=JSON.stringify(workers.map(({worker})=>worker.position.toArray()));
  }
  animate(0);return {animate};
}
