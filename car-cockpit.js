import * as THREE from './vendor/three.module.js';

const GLASS_PARTS=new Set(['windshield','rear-window','side-window','panoramic-roof','sunroof']);

// The shared seated worker has a .54 m hip pivot and eyes .77 m above it.
// Car local +Z is forward. The eye stays fixed in the seat during driving.
export function createCarCockpit({camera,worker,getCar}={}){
  const eye=new THREE.Vector3(),target=new THREE.Vector3();
  const eyeOffset=new THREE.Vector3(0,1.31,.14);
  let active=false,rear=false,car=null,projection=null,interior=null;
  const hiddenHeads=[],glassOverrides=[];

  function restoreGlass(){
    if(interior){
      interior.removeFromParent();
      const materials=new Set();
      interior.traverse(object=>{if(object.isMesh){object.geometry.dispose();for(const material of [].concat(object.material))materials.add(material);}});
      for(const material of materials)material.dispose();
      interior=null;
    }
    for(const {object,original,replacement} of glassOverrides){
      object.material=original;
      for(const material of [].concat(replacement))material.dispose();
    }
    glassOverrides.length=0;car=null;
  }
  function driverInterior(record){
    // Exterior models keep a low, simplified interior. A removable dashboard
    // closes the visible gap below the glass and brings the rim into eye view.
    const group=new THREE.Group();group.name='driver-cockpit-interior';
    const seat=record.group.userData.driverSeat ?? new THREE.Vector3(-.34,-.095,.20);
    const eyeY=seat.y+eyeOffset.y,width=record.dimensions?.width ?? 1.8;
    const trim=new THREE.MeshStandardMaterial({color:0x252a2d,roughness:.9});
    const rimMaterial=new THREE.MeshStandardMaterial({color:0x40494e,roughness:.7});
    const display=new THREE.MeshBasicMaterial({color:0x91a8ac});
    function part(geometry,material,position){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...position);group.add(mesh);return mesh;}
    part(new THREE.BoxGeometry(width*.78,.34,.22),trim,[0,eyeY-.38,1.06]);
    part(new THREE.BoxGeometry(.32,.08,.045),trim,[seat.x,eyeY-.175,1.00]);
    for(const dx of [-.077,.077])part(new THREE.TorusGeometry(.030,.003,4,16),display,[seat.x+dx,eyeY-.17,.974]);
    const steering=new THREE.Group();steering.position.set(seat.x,eyeY-.26,.88);steering.rotation.x=-.30;group.add(steering);
    for(const [geometry,material,position] of [
      [new THREE.TorusGeometry(.145,.019,8,32),rimMaterial,[0,0,0]],
      [new THREE.BoxGeometry(.23,.024,.022),rimMaterial,[0,-.015,0]],
      [new THREE.BoxGeometry(.024,.12,.022),rimMaterial,[0,-.065,0]],
      [new THREE.BoxGeometry(.07,.045,.028),trim,[0,-.015,-.014]],
    ]){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...position);steering.add(mesh);}
    group.userData.steering=steering;
    record.group.add(group);return group;
  }
  function selectCar(record){
    restoreGlass();car=record;
    record.group.traverse(object=>{
      if(!object.isMesh)return;
      const parts=object.userData.parts ?? [object.name];
      if(!parts.some(part=>GLASS_PARTS.has(part)))return;
      const original=object.material;
      function clearGlass(material){
        const clone=material.clone();
        clone.color?.set(0xb9d2dc);clone.transparent=true;clone.opacity=.10;
        clone.depthWrite=false;clone.metalness=0;clone.roughness=.18;
        clone.envMapIntensity=.15;clone.side=THREE.DoubleSide;
        return clone;
      }
      const replacement=Array.isArray(original)?original.map(clearGlass):clearGlass(original);
      glassOverrides.push({object,original,replacement});object.material=replacement;
    });
    interior=driverInterior(record);
  }
  function update(){
    if(!active)return false;
    const selected=getCar?.();
    if(!selected?.group){setActive(false);return false;}
    if(car?.group!==selected.group)selectCar(selected);
    const steering=selected.group.userData.manualSteering;
    interior.userData.steering.rotation.z=Number.isFinite(steering)?-steering*1.8:0;
    // carLife reapplies helmet visibility with each seated pose.
    for(const {object} of hiddenHeads)object.visible=false;
    const group=selected.group,seat=group.userData.driverSeat;
    eye.copy(seat?.isVector3?seat:new THREE.Vector3(-.34,-.095,.20)).add(eyeOffset);
    target.copy(eye).add(new THREE.Vector3(0,-.07,rear?-1:1));
    group.updateWorldMatrix(true,false);group.localToWorld(eye);group.localToWorld(target);
    camera.position.copy(eye);camera.lookAt(target);
    camera.fov=72;camera.near=.025;camera.zoom=1;
    camera.clearViewOffset();camera.updateProjectionMatrix();
    return true;
  }
  function setActive(value){
    value=!!value;
    if(value===active)return active;
    if(value){
      const selected=getCar?.();if(!selected?.group)return false;
      projection={fov:camera.fov,near:camera.near,zoom:camera.zoom,view:camera.view?{...camera.view}:null};
      const upper=worker?.userData.sportRig?.upper ?? worker?.userData.headMount;
      for(const object of upper?.children ?? []){
        if(object.isMesh&&object.position.y>=.65)hiddenHeads.push({object,visible:object.visible});
      }
      active=true;rear=false;selectCar(selected);update();
    }else{
      active=false;rear=false;restoreGlass();
      for(const {object,visible} of hiddenHeads)object.visible=visible;
      hiddenHeads.length=0;
      camera.fov=projection.fov;camera.near=projection.near;camera.zoom=projection.zoom;
      camera.view=projection.view?{...projection.view}:null;camera.updateProjectionMatrix();projection=null;
    }
    return active;
  }
  return {setActive,update,isActive:()=>active,setRearView(value){rear=!!value;if(active)update();}};
}
