import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import {batchRigidModel} from './rigid-batching.js';
import { fireproofingCoat } from './fireproofing-coat.js';
import {loadRobotBuffer} from './asset-loading.js';

export function sprayRobot({parent,position,reducedMotion,target}) {
  const group=new THREE.Group();group.name='Fireproofing spray robot';group.position.set(...position);group.rotation.y=Math.PI;parent.add(group);
  let loaded=false,running=true,lastTime=null,motionTime=0;const joints=[];let nozzle=null;const beamTarget=target,coat=fireproofingCoat(target);
  const sprayCount=480,positions=new Float32Array(sprayCount*3);
  const sprayGeo=new THREE.BufferGeometry();sprayGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const spray=new THREE.Points(sprayGeo,new THREE.PointsMaterial({color:0xd3d7d0,size:.023,transparent:true,opacity:.78,depthWrite:false}));group.add(spray);spray.visible=false;
  const worldPoint=new THREE.Vector3(),start=new THREE.Vector3(),end=new THREE.Vector3();
  const ready=loadRobotBuffer({onProgress:progress=>window.siteStartup?.download({...progress,label:document.documentElement.lang==='ko'?'내화뿜칠 로봇':'Fireproofing robot'})}).then(bytes=>new GLTFLoader().parseAsync(bytes,'./assets/robot/')).then(gltf=>{
    const model=gltf.scene;model.updateMatrixWorld(true);
    // Retain the STEP-derived dimensions and assembly placements (metres, Y up).
    const bounds=new THREE.Box3().setFromObject(model);const center=bounds.getCenter(new THREE.Vector3());
    model.position.x-=center.x;model.position.z-=center.z;model.position.y-=bounds.min.y;
    group.add(model);
    model.updateMatrixWorld(true);
    const assemblies=[];model.traverse(node=>{if(/^RB20-1900ES_3D/.test(node.name))assemblies.push(node);});
    for(const arm of assemblies){
      const links=arm.children.filter(child=>/RB20-1900ES_LINK[1-6]/.test(child.name)).sort((a,b)=>Number(a.name.match(/LINK(\d)/)[1])-Number(b.name.match(/LINK(\d)/)[1]));
      let parentJoint=arm;
      for(const link of links){
        const linkBounds=new THREE.Box3().setFromObject(link);const pivotWorld=linkBounds.getCenter(new THREE.Vector3());
        if(/LINK[123]/.test(link.name))pivotWorld.y=linkBounds.min.y+.035;
        const pivot=new THREE.Group();pivot.name='spray-joint-'+link.name;
        arm.add(pivot);pivot.position.copy(arm.worldToLocal(pivotWorld.clone()));pivot.updateMatrixWorld(true);parentJoint.attach(pivot);pivot.attach(link);
        joints.push({node:pivot,base:pivot.quaternion.clone(),index:Number(link.name.match(/LINK(\d)/)[1]),arm:assemblies.indexOf(arm)});
        parentJoint=pivot;
      }
      const tool=arm.children.find(node=>/EOAT/.test(node.name));if(tool&&links.length)parentJoint.attach(tool);
    }
    model.updateMatrixWorld(true);
    // Use the CAD nozzle and H-beam rather than inventing an unrelated target.
    model.traverse(node=>{
      if(!nozzle&&/^nozzle_1(?:[:.]\d+)?$/.test(node.userData.name||node.name))nozzle=node;
      if(node.isMesh){node.castShadow=true;node.receiveShadow=true;if(node.material){node.material.metalness=Math.min(node.material.metalness??.2,.75);node.material.roughness=Math.max(node.material.roughness??.4,.38);}}
    });
    // Only the reconstructed joint pivots animate; CAD leaf transforms stay rigid.
    // The nozzle and its descendants keep their geometry and identity for bounds.
    function markRigidLeaves(node){if(node===nozzle)return;if(node.isMesh&&!node.children.length)node.userData.rigidStatic=true;for(const child of node.children)markRigidLeaves(child);}
    markRigidLeaves(model);
    // Each pivot owns one rigid assembly. Keep the nozzle subtree for its live bounds.
    group.userData.batching=batchRigidModel(model,{joints:joints.map(joint=>joint.node),preserve:nozzle?[nozzle]:[]});
    loaded=true;group.userData.loaded=true;group.userData.joints=joints.length;group.userData.nozzle=!!nozzle;return group;
  }).catch(error=>{console.error('Spray robot model could not load',error);group.userData.error=true;throw error;});
  const axisX=new THREE.Vector3(1,0,0),axisY=new THREE.Vector3(0,1,0),axisZ=new THREE.Vector3(0,0,1),rotation=new THREE.Quaternion();
  function animate(t){
    const delta=lastTime===null?0:Math.min(.05,Math.max(0,t-lastTime));lastTime=t;
    if(!loaded||reducedMotion)return;
    if(running)motionTime+=delta;
    for(const joint of joints){const phase=motionTime*.65+joint.arm*.35;const angle=joint.index===1?Math.sin(phase*.5)*.10:joint.index===2?Math.sin(phase)*.12:joint.index===3?-Math.sin(phase)*.18:joint.index===5?Math.sin(phase+.3)*.08:0;rotation.setFromAxisAngle(joint.index===1?axisY:joint.index===5?axisZ:axisX,angle);joint.node.quaternion.copy(joint.base).multiply(rotation);}
    group.updateMatrixWorld(true);
    if(!nozzle||!beamTarget){spray.visible=false;return;}
    new THREE.Box3().setFromObject(nozzle).getCenter(start);group.worldToLocal(start);
    const targetBounds=new THREE.Box3().setFromObject(beamTarget);const startWorld=start.clone().applyMatrix4(group.matrixWorld);end.set(THREE.MathUtils.clamp(startWorld.x+.55+Math.sin(motionTime*.65)*.35,targetBounds.min.x+.04,targetBounds.max.x-.04),THREE.MathUtils.clamp(startWorld.y,targetBounds.min.y+.025,targetBounds.max.y-.025),targetBounds.max.z+.012);group.worldToLocal(end);
    const distance=start.distanceTo(end);const spraying=running&&(motionTime%9)<7.2&&distance<2.5;spray.visible=spraying;group.userData.sprayDistance=distance;group.userData.nozzlePosition=start.toArray();
    if(spraying)coat.paint(end.clone().applyMatrix4(group.matrixWorld),delta);
    for(let i=0;i<sprayCount;i++){const age=(motionTime*2.8+i*.61803398875)%1;worldPoint.lerpVectors(start,end,age);const radius=.015+age*.22;worldPoint.x+=Math.sin(i*21.1)*radius;worldPoint.y+=Math.cos(i*15.7)*radius;positions[i*3]=worldPoint.x;positions[i*3+1]=worldPoint.y;positions[i*3+2]=worldPoint.z;}
    sprayGeo.attributes.position.needsUpdate=true;sprayGeo.computeBoundingSphere();
    group.userData.animationTime=motionTime;group.userData.spraying=spraying;group.userData.coatingCoverage=coat.coverage;
  }
  return {group,ready,animate,toggle(){running=!running;return running;},resetCoating(){running=false;coat.reset();group.userData.coatingCoverage=0;},isRunning:()=>running};
}
