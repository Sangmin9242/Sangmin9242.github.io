import * as THREE from './vendor/three.module.js';

function mirrorGeometry(width=1,height=.5625,radius=.09){
  const x=-width/2,y=-height/2,shape=new THREE.Shape();
  shape.moveTo(x+radius,y);shape.lineTo(x+width-radius,y);shape.quadraticCurveTo(x+width,y,x+width,y+radius);
  shape.lineTo(x+width,y+height-radius);shape.quadraticCurveTo(x+width,y+height,x+width-radius,y+height);
  shape.lineTo(x+radius,y+height);shape.quadraticCurveTo(x,y+height,x,y+height-radius);
  shape.lineTo(x,y+radius);shape.quadraticCurveTo(x,y,x+radius,y);
  const geometry=new THREE.ShapeGeometry(shape,8),p=geometry.attributes.position,uv=geometry.attributes.uv;
  // A mirror reverses a direct rear-camera image horizontally.
  for(let i=0;i<p.count;i++)uv.setXY(i,.5-p.getX(i)/width,.5+p.getY(i)/height);
  return geometry;
}

// Compact views use the real exterior mirror positions. Camera-relative
// housings keep both mirrors in reach even in the narrow portrait windshield.
export function createCarSideMirrors({camera,renderer,scene,record,worker}){
  if(!scene)return null;
  const group=new THREE.Group();group.name='driver-side-mirror-views';scene.add(group);
  const mirrors=[],position=new THREE.Vector3(),target=new THREE.Vector3(),up=new THREE.Vector3();
  const frameMaterial=new THREE.MeshBasicMaterial({color:0x252b30,transparent:true,depthTest:false,depthWrite:false,toneMapped:false});
  const edgeMaterial=new THREE.MeshBasicMaterial({color:0x9aa5ab,transparent:true,depthTest:false,depthWrite:false,toneMapped:false});
  const originals=[];
  for(const side of [1,-1]){
    const physical=[];record.group.traverse(n=>{if(n.userData.sideMirror===side)physical.push(n);});
    const view=new THREE.Group();view.name=side>0?'driver-left-mirror':'driver-right-mirror';view.userData.cockpitMirror=side;group.add(view);
    const renderTarget=renderer?new THREE.WebGLRenderTarget(256,144,{depthBuffer:true,stencilBuffer:false}):null;
    if(renderTarget)renderTarget.texture.colorSpace=THREE.SRGBColorSpace;
    const material=new THREE.MeshBasicMaterial({map:renderTarget?.texture ?? null,color:renderTarget?0xffffff:0x52636d,transparent:true,depthTest:false,depthWrite:false,toneMapped:false});
    for(const [geometry,mat,z,order]of [[mirrorGeometry(1.07,.6325,.12),frameMaterial,-.004,1000],[mirrorGeometry(1.025,.5875,.10),edgeMaterial,-.002,1001],[mirrorGeometry(),material,0,1002]]){
      const mesh=new THREE.Mesh(geometry,mat);mesh.position.z=z;mesh.renderOrder=order;mesh.frustumCulled=false;view.add(mesh);
    }
    const physicalMaterial=material.clone();physicalMaterial.transparent=false;physicalMaterial.depthTest=true;physicalMaterial.depthWrite=true;
    for(const object of physical){originals.push({object,material:object.material});object.material=physicalMaterial;}
    const rearCamera=new THREE.PerspectiveCamera(64,256/144,.06,350);
    mirrors.push({side,view,renderTarget,material,physicalMaterial,rearCamera,physical:physical[0]});
  }
  let lastRender=-Infinity;
  function update(rear=false){
    group.visible=!rear;
    camera.updateMatrixWorld(true);record.group.updateWorldMatrix(true,true);
    const depth=.65,halfHeight=Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*depth,halfWidth=halfHeight*camera.aspect;
    const width=Math.min(.46*halfWidth,.58*halfHeight);
    group.position.copy(camera.position);group.quaternion.copy(camera.quaternion);
    for(const {side,view}of mirrors){view.position.set(-side*.73*halfWidth,-.32*halfHeight,-depth);view.scale.setScalar(width);}
    const now=performance.now();
    if(!renderer||rear||now-lastRender<1000/12)return;
    lastRender=now;
    const previous={target:renderer.getRenderTarget(),autoClear:renderer.autoClear,xr:renderer.xr.enabled,shadows:renderer.shadowMap.autoUpdate};
    const carVisible=record.group.visible,workerVisible=worker?.visible,hiddenMeshes=[];
    // Hide cabin geometry while leaving the car's lights in the scene. Keeping
    // the light count stable avoids compiling a second set of scene shaders.
    record.group.traverse(object=>{if(object.isMesh){hiddenMeshes.push({object,visible:object.visible});object.visible=false;}});
    group.visible=false;if(worker)worker.visible=false;
    renderer.xr.enabled=false;renderer.autoClear=true;renderer.shadowMap.autoUpdate=false;
    try{
      for(const {side,renderTarget,rearCamera,physical}of mirrors){
        if(physical)physical.getWorldPosition(position);
        else position.set(side*((record.dimensions?.width??1.8)/2+.105),1.1,.8).applyMatrix4(record.group.matrixWorld);
        target.set(side*.24,-.045,-1).transformDirection(record.group.matrixWorld).add(position);
        up.set(0,1,0).transformDirection(record.group.matrixWorld);
        rearCamera.position.copy(position);rearCamera.up.copy(up);rearCamera.lookAt(target);
        renderer.setRenderTarget(renderTarget);renderer.clear();renderer.render(scene,rearCamera);
      }
    }finally{
      renderer.setRenderTarget(previous.target);renderer.autoClear=previous.autoClear;renderer.xr.enabled=previous.xr;renderer.shadowMap.autoUpdate=previous.shadows;
      for(const {object,visible}of hiddenMeshes)object.visible=visible;
      record.group.visible=carVisible;if(worker)worker.visible=workerVisible;group.visible=!rear;
    }
  }
  function dispose(){
    for(const {object,material}of originals)object.material=material;
    group.removeFromParent();group.traverse(n=>{if(n.isMesh)n.geometry.dispose();});
    for(const mirror of mirrors){mirror.renderTarget?.dispose();mirror.material.dispose();mirror.physicalMaterial.dispose();}
    frameMaterial.dispose();edgeMaterial.dispose();
  }
  return {update,dispose};
}
