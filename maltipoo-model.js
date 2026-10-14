import * as THREE from './vendor/three.module.js';

// Metres, +Z is the nose direction. Original geometry; no external assets.
// The pose never changes this group's world position, heading, or scale.
export function createMaltipoo() {
  const dog = new THREE.Group();
  dog.name = 'Apricot maltipoo';
  const rig = new THREE.Group(); rig.position.y=.0005; dog.add(rig);
  const body = new THREE.Group(); rig.add(body);
  let seed = 27631;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  // Original overlapping curl strokes give the continuous surface a woolly
  // microtexture. Silhouette strands below are short enough to read as fur.
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#939393';ctx.fillRect(0,0,256,256);
  for(let i=0;i<740;i++) {
    const x=random()*256,y=random()*256,r=2+random()*5;
    const start=random()*Math.PI*2,end=start+Math.PI*(1.3+random()*.6);
    for(const [shade,offset,width] of [['#777777',1.2,2],['#bababa',0,1.4],['#dedede',-.7,.7]]) {
      ctx.strokeStyle=shade;ctx.lineWidth=width;ctx.beginPath();ctx.ellipse(x+offset,y+offset,r,r*.6,start,start,end);ctx.stroke();
    }
  }
  const curlBump=new THREE.CanvasTexture(canvas);curlBump.wrapS=curlBump.wrapT=THREE.RepeatWrapping;curlBump.repeat.set(3,2);
  const pigment=document.createElement('canvas');pigment.width=pigment.height=256;
  const paint=pigment.getContext('2d');paint.fillStyle='#f1eee6';paint.fillRect(0,0,256,256);
  for(let i=0;i<950;i++) {
    const x=random()*256,y=random()*256,r=2+random()*4,a=random()*Math.PI*2;
    paint.lineCap='round';
    paint.strokeStyle=i%3?'#d4c9b9':'#e2d9cb';paint.lineWidth=1.6;
    paint.beginPath();paint.ellipse(x,y,r,r*.7,a,a,a+Math.PI*1.55);paint.stroke();
    paint.strokeStyle='#fffdf4';paint.lineWidth=.8;
    paint.beginPath();paint.ellipse(x-.6,y-.6,r,r*.7,a,a,a+Math.PI*1.5);paint.stroke();
  }
  const curlColor=new THREE.CanvasTexture(pigment);curlColor.colorSpace=THREE.SRGBColorSpace;curlColor.wrapS=curlColor.wrapT=THREE.RepeatWrapping;curlColor.repeat.set(3,2);curlColor.anisotropy=4;
  const coat = new THREE.MeshStandardMaterial({ color: 0xd1ac86, roughness: .97 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xeee1c9, roughness: .98 });
  const earCoat = new THREE.MeshStandardMaterial({ color: 0xc5a07a, roughness: .97 });
  for(const material of [coat,cream,earCoat]){material.map=curlColor;material.bumpMap=curlBump;material.bumpScale=.0015;}
  const noseMat = new THREE.MeshStandardMaterial({ color: 0x17120f, roughness: .24 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x100b08, roughness: .17 });
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xfff5df });
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x29190f, roughness: .8 });
  // Each lock is a genuinely narrow curved strand, shared by all instances.
  // The loose C shape lies across the coat and lifts a little at its tip.
  const curlPath=new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.25,0,-.60),new THREE.Vector3(.38,.08,-.48),
    new THREE.Vector3(.60,.16,.02),new THREE.Vector3(.28,.24,.46),
    new THREE.Vector3(-.22,.26,.31),new THREE.Vector3(-.30,.31,.02)
  ]);
  const curlGeometry = new THREE.TubeGeometry(curlPath,8,.055,3,false);
  curlGeometry.computeVertexNormals();
  const dummy = new THREE.Object3D();
  const up = new THREE.Vector3(0,1,0), normal = new THREE.Vector3();
  const tint = new THREE.Color();

  function oval(parent, radii, position, material, segments=14) {
    const geometry = new THREE.SphereGeometry(1, segments, 8);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(...radii); mesh.position.set(...position);
    mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  }
  function fuzzy(parent, radii, position, material, count, length=.010, faceGuard=false) {
    const base=oval(parent,radii,position,material);
    // Shallow waves across the connected coat avoid a faceted toy appearance.
    const a=base.geometry.attributes.position;
    for(let i=0;i<a.count;i++) {
      const x=a.getX(i),y=a.getY(i),z=a.getZ(i);
      const r=1+.005*Math.sin(x*19+y*11)*Math.cos(z*17-y*13);
      a.setXYZ(i,x*r,y*r,z*r);
    }
    base.geometry.computeVertexNormals();
    const tufts=new THREE.InstancedMesh(curlGeometry,material,count);
    for(let i=0;i<count;i++) {
      let x,y,z;
      do { y=random()*2-1; const az=random()*Math.PI*2; const radius=Math.sqrt(1-y*y); x=radius*Math.cos(az); z=radius*Math.sin(az); }
      // Eye and nose sockets are deliberately free of long strands.
      while(faceGuard && z>.55 && ((Math.abs(Math.abs(x)-.48)<.23&&Math.abs(y-.10)<.22)||(Math.abs(x)<.28&&y<-.10&&y>-.5)));
      normal.set(x/radii[0],y/radii[1],z/radii[2]).normalize();
      dummy.position.set(position[0]+x*radii[0],position[1]+y*radii[1],position[2]+z*radii[2]);
      dummy.quaternion.setFromUnitVectors(up,normal);
      dummy.rotateY(random()*Math.PI*2); dummy.rotateZ(.30+random()*.65);
      const l=length*(.7+random()*.6);
      dummy.scale.set(l,l*1.15,l); dummy.updateMatrix();tufts.setMatrixAt(i,dummy.matrix);
      tint.setRGB(1,1,1).multiplyScalar(.96+random()*.08);tufts.setColorAt(i,tint);
    }
    tufts.castShadow=false;tufts.receiveShadow=false;tufts.instanceMatrix.needsUpdate=true;
    parent.add(tufts);return base;
  }

  fuzzy(body,[.105,.123,.220],[0,0,-.013],coat,420,.009);
  fuzzy(body,[.044,.057,.018],[0,-.020,.202],cream,45,.009);
  const head=new THREE.Group();head.position.set(0,.137,.200);body.add(head);
  fuzzy(head,[.090,.091,.081],[0,0,0],coat,340,.009,true);
  // Short, pale muzzle and cream beard; the actual nose remains visible.
  fuzzy(head,[.063,.033,.042],[0,-.033,.084],cream,100,.007,true);
  const beard=oval(head,[.040,.014,.030],[0,-.060,.090],cream,12);
  const ears=[];
  for(const side of [-1,1]) {
    const ear=new THREE.Group();ear.position.set(side*.080,.025,-.011);head.add(ear);
    fuzzy(ear,[.044,.066,.027],[side*.014,-.054,0],earCoat,130,.011);
    ears.push(ear);
  }
  const eyeGeometry=new THREE.SphereGeometry(1,16,10);
  const eyes=new THREE.InstancedMesh(eyeGeometry,eyeMat,2);
  const shine=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,6),glintMat,4);
  for(let i=0;i<2;i++) {
    const side=i===0?-1:1;
    dummy.position.set(side*.043,.009,.077);dummy.rotation.set(0,side*.20,0);dummy.scale.set(.017,.019,.010);dummy.updateMatrix();eyes.setMatrixAt(i,dummy.matrix);
    for(let j=0;j<2;j++) {
      dummy.position.set(side*.043-.004+j*.007,.016-j*.008,.087);dummy.rotation.set(0,0,0);dummy.scale.setScalar(j===0?.0031:.0013);dummy.updateMatrix();shine.setMatrixAt(i*2+j,dummy.matrix);
    }
  }
  head.add(eyes,shine);
  const nose=oval(head,[.018,.013,.011],[0,-.024,.125],noseMat,16);
  // Taper the lower edge into a soft triangular wet nose.
  const np=nose.geometry.attributes.position;
  for(let i=0;i<np.count;i++)np.setX(i,np.getX(i)*(.79+.21*np.getY(i)));
  nose.geometry.computeVertexNormals();
  const mouth=oval(head,[.017,.006,.006],[0,-.049,.118],mouthMat,12);

  const legs=[];
  for(const front of [true,false])for(const side of [-1,1]) {
    const hip=new THREE.Group(),lower=new THREE.Group(),paw=new THREE.Group();
    rig.add(hip);hip.add(lower);lower.add(paw);
    const l1=front?.133:.135,l2=front?.150:.148;
    fuzzy(hip,[front?.026:.036,l1*.59,.027],[0,-l1*.49,0],coat,15,.007);
    lower.position.y=-l1;
    fuzzy(lower,[.022,l2*.53,.022],[0,-l2*.48,0],coat,15,.007);
    oval(paw,[.031,.021,.041],[0,0,.010],coat,12);
    legs.push({hip,lower,paw,l1,l2,front,side});
  }
  // A slender upright tail bends back over the haunch, with a feathery tip.
  const tail=new THREE.Group();tail.position.set(0,.061,-.193);body.add(tail);
  const tailCurve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(0,0,0),new THREE.Vector3(0,.080,-.047),
    new THREE.Vector3(0,.151,-.030),new THREE.Vector3(0,.170,.034),
    new THREE.Vector3(0,.142,.075)
  ]);
  const tailMesh=new THREE.Mesh(new THREE.TubeGeometry(tailCurve,18,.011,6,false),coat);tailMesh.castShadow=true;tail.add(tailMesh);
  const feathers=new THREE.InstancedMesh(curlGeometry,coat,120);
  for(let i=0;i<120;i++) {
    const t=random(),p=tailCurve.getPoint(t),tangent=tailCurve.getTangent(t);
    const radial=new THREE.Vector3(Math.cos(i*2.4),Math.sin(i*2.4),0).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),tangent));
    dummy.position.copy(p).addScaledVector(radial,.012);dummy.quaternion.setFromUnitVectors(up,radial);dummy.rotateZ(.6);
    const fluff=.012+.018*t;
    dummy.scale.set(fluff*.70,fluff,fluff*.65);dummy.updateMatrix();feathers.setMatrixAt(i,dummy.matrix);
  }
  feathers.castShadow=false;feathers.receiveShadow=false;tail.add(feathers);

  const hipPoint=new THREE.Vector3();
  const lerp=THREE.MathUtils.lerp;
  function solveLeg(leg, footY, footZ, spread=0) {
    hipPoint.set(leg.side*(leg.front?.071:.074),leg.front?.004:-.017,leg.front?.133:-.144).applyMatrix4(body.matrix);
    leg.hip.position.copy(hipPoint);
    const dy=footY-hipPoint.y,forward=footZ-hipPoint.z;
    const yaw=spread>0?Math.atan2(leg.side*spread,forward):0;
    const dz=spread>0?Math.hypot(spread,forward):forward;
    const distance=THREE.MathUtils.clamp(Math.hypot(dy,dz),.01,leg.l1+leg.l2-.00001);
    const base=Math.atan2(-dz,-dy);
    const opening=Math.acos(THREE.MathUtils.clamp((leg.l1*leg.l1+distance*distance-leg.l2*leg.l2)/(2*leg.l1*distance),-1,1));
    let upper=base+(leg.front?opening:-opening);
    // Resting haunches fold above the floor when the hip is very low.
    if(hipPoint.y-Math.cos(upper)*leg.l1<.045)upper=base+(leg.front?-opening:opening);
    const kneeY=hipPoint.y-Math.cos(upper)*leg.l1,kneeZ=-Math.sin(upper)*leg.l1;
    const lower=Math.atan2(-(dz-kneeZ),-(footY-kneeY));
    leg.hip.rotation.set(upper,yaw,0);leg.lower.rotation.set(lower-upper,0,0);
    leg.paw.position.set(0,-leg.l2,0);leg.paw.rotation.set(-lower,0,0);
  }

  /** blend is 0..1 from stand to the requested pose; time is seconds.
   * Calling a pose with the same arguments gives the same transforms.
   * The caller controls locomotion by moving the returned group. */
  dog.userData.pose=({type='stand',time=0,blend=1}={})=>{
    const t=Number.isFinite(time)?time:0;
    const b=Number.isFinite(blend)?THREE.MathUtils.clamp(blend,0,1):1;
    const sitting=type==='sit',lying=type==='lie',eating=type==='eat',petting=type==='pet';
    const walking=type==='walk',running=type==='run';
    const pace=running?10.5:6.0;
    body.position.set(0,.296,0);body.rotation.set(0,0,0);body.scale.set(1,1,1);
    if(sitting){body.position.y=lerp(.296,.218,b);body.rotation.x=-.40*b;body.position.z=-.035*b;}
    if(lying){body.position.y=lerp(.296,.146,b);body.rotation.x=-.04*b;body.position.z=-.018*b;}
    if(walking||running)body.position.y+=Math.sin(t*pace*2)* (running?.012:.004)*b;
    if(petting){body.rotation.z=Math.sin(t*3)*.025*b;}
    head.position.set(0,.137,.200);head.rotation.set(0,0,0);
    if(sitting)head.rotation.x=.18*b;
    if(lying)head.position.y-=.018*b;
    if(eating){body.position.y-=.024*b;body.rotation.x=.20*b;head.rotation.x=.82*b;head.position.y-=.177*b;head.position.z+=.031*b;head.rotation.x+=Math.sin(t*7)*.032*b;}
    if(petting){head.rotation.z=Math.sin(t*2.2)*.08*b;head.rotation.x=-.07*b;}
    if(walking||running)head.rotation.x=Math.sin(t*pace)*.024*b;
    mouth.scale.y=.006*(1+(eating?Math.max(0,Math.sin(t*8))*1.1*b:petting?.4*b:0));
    beard.rotation.x=eating?Math.sin(t*8)*.015*b:0;
    ears.forEach((ear,i)=>{ear.rotation.set((walking||running?Math.sin(t*pace+i*.8)*.10:Math.sin(t*2+i)*.018)*b,0,(i?1:-1)*.10+(petting?Math.sin(t*3)*.055*b:0));});
    tail.rotation.set(-.10+(lying?.55*b:0),Math.sin(t*(petting?7:walking||running?5:2.8))*(petting?.40:.18)*b,Math.sin(t*2)*.025*b);
    body.updateMatrix();
    for(const leg of legs) {
      let z=leg.front?.142:-.148,y=.022;
      if(sitting)z=lerp(z,leg.front?.205:-.221,b);
      if(lying)z=lerp(z,leg.front?.365:-.160,b);
      if(walking||running) {
        const phase=t*pace+(leg.side<0?Math.PI:0)+(leg.front?0:Math.PI);
        const stride=running?.074:.041;
        z+=Math.cos(phase)*stride*b;
        y+=Math.max(0,Math.sin(phase))*(running?.058:.024)*b;
      }
      solveLeg(leg,y+((sitting||lying)?.010*b:0),z,lying&&!leg.front?.075*b:0);
    }
    head.updateWorldMatrix(true,false);
    dog.updateWorldMatrix(true,false);
    dog.userData.headAnchor.copy(head.position).applyMatrix4(body.matrix).add(rig.position);
    dog.userData.poseType=type;
    return dog;
  };
  dog.userData.headAnchor=new THREE.Vector3();
  dog.userData.forward=new THREE.Vector3(0,0,1);
  dog.userData.shoulderHeight=.42;
  dog.userData.pose({type:'stand',time:0});
  return dog;
}
