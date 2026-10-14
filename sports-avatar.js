import * as THREE from './vendor/three.module.js';
import { studentHead } from './student-avatar.js?v=20261014-refined';

// All body pivots face +Z. The unscaled standing figure is 1.80 m tall.
export function sportsAvatar({gender='male',identity='sangmin',kit='football',color=0x226b8a}={}){
  const female=gender==='female',ownIdentity=identity==='sangmin';
  const group=new THREE.Group();group.name=`sports-avatar-${identity}-${gender}`;
  const hip=new THREE.Group(),upper=new THREE.Group();
  hip.name='hip';upper.name='upper';group.add(hip);hip.add(upper);
  const baseHeight=.9,thighLength=.415,shinLength=.415;
  const mat=(value,roughness=.84)=>new THREE.MeshStandardMaterial({color:value,roughness});
  const skin=mat(0xc8a48b),hair=mat(ownIdentity?0x181d22:0x302824,.93);
  const jersey=mat(color),trim=mat(0xf2eee3),darkTrim=mat(0x163649);
  const trouser=mat(female?0x343a44:0x303944),stitch=mat(0x59616a);
  const boot=mat(0x26343d,.55),rubber=mat(0x182125,.92),leather=mat(0xefeee6,.58);
  const sole=mat(0xa79b83,.95),sock=mat(0xe9eee9),metal=mat(0xacb2ad,.4);
  const footballParts=[],bowlingParts=[];
  function mesh(parent,geometry,material,position=[0,0,0]){
    const value=new THREE.Mesh(geometry,material);value.position.set(...position);
    value.castShadow=true;value.receiveShadow=true;parent.add(value);return value;
  }
  function oval(parent,scale,position,material){
    const value=mesh(parent,new THREE.SphereGeometry(1,20,14),material,position);
    value.scale.set(...scale);return value;
  }
  function box(parent,size,position,material){return mesh(parent,new THREE.BoxGeometry(...size),material,position);}
  function tube(parent,length,top,bottom,material,y=0){
    return mesh(parent,new THREE.CylinderGeometry(top,bottom,length,16),material,[0,y-length/2,0]);
  }
  function variant(parent,sport,name){
    const value=new THREE.Group();value.name=name;parent.add(value);
    (sport==='football'?footballParts:bowlingParts).push(value);return value;
  }
  function line(parent,points,radius,material){
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    return mesh(parent,new THREE.TubeGeometry(curve,12,radius,6,false),material);
  }
  function torso(parent,material){
    const waist=female?.145:.167,shoulder=female?.178:.197;
    const shape=new THREE.Shape();
    shape.moveTo(-waist,.055);shape.lineTo(waist,.055);
    shape.quadraticCurveTo(waist+.018,.23,waist+.013,.34);
    shape.quadraticCurveTo(shoulder+.012,.45,shoulder,.505);
    shape.quadraticCurveTo(.137,.55,.087,.55);
    shape.lineTo(-.087,.55);shape.quadraticCurveTo(-.137,.55,-shoulder,.505);
    shape.quadraticCurveTo(-shoulder-.012,.45,-waist-.013,.34);
    shape.quadraticCurveTo(-waist-.018,.23,-waist,.055);
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:.19,bevelEnabled:true,bevelSize:.018,bevelThickness:.018,bevelSegments:3,curveSegments:14,steps:1});
    geometry.translate(0,0,-.095);return mesh(parent,geometry,material);
  }
  const footballTorso=variant(upper,'football','football-jersey');torso(footballTorso,jersey);
  const bowlingTorso=variant(upper,'bowling','bowling-polo');torso(bowlingTorso,jersey);
  const neck=mesh(upper,new THREE.CylinderGeometry(.061,.071,.095,16),skin,[0,.576,0]);neck.name='neck';
  // A close fitting crew neckline and sewn panels distinguish the football kit.
  const neckline=mesh(footballTorso,new THREE.TorusGeometry(.078,.008,8,28),trim,[0,.553,0]);
  neckline.rotation.x=Math.PI/2;neckline.scale.y=.85;
  for(const side of [-1,1]){
    line(footballTorso,[[side*.086,.542,.117],[side*.147,.50,.117],[side*.179,.45,.117]],.004,trim);
    line(footballTorso,[[side*.144,.085,.117],[side*.157,.25,.117],[side*.165,.37,.117]],.002,darkTrim);
  }
  box(footballTorso,[.056,.014,.008],[.065,.36,.118],trim);
  const numeral=box(footballTorso,[.013,.094,.008],[.065,.313,.118],trim);numeral.rotation.z=-.24;
  const badge=oval(footballTorso,[.018,.024,.003],[-.093,.417,.12],trim);
  box(footballTorso,[.004,.024,.005],[-.093,.417,.124],jersey);badge.name='team-crest';
  box(footballTorso,[.12,.014,.008],[0,.416,-.116],trim);
  const backNumber=box(footballTorso,[.02,.17,.008],[.021,.332,-.116],trim);backNumber.rotation.z=.22;
  // The polo has a split collar, button placket, and a small embroidered chest mark.
  for(const side of [-1,1]){
    const collarShape=new THREE.Shape();
    collarShape.moveTo(side*.071,.559);collarShape.lineTo(0,.522);
    collarShape.lineTo(side*.040,.464);collarShape.lineTo(side*.091,.535);collarShape.closePath();
    mesh(bowlingTorso,new THREE.ShapeGeometry(collarShape),trim,[0,0,.119]);
    line(bowlingTorso,[[side*.131,.086,.116],[side*.145,.27,.116],[side*.163,.437,.116]],.0025,trim);
  }
  box(bowlingTorso,[.018,.091,.006],[0,.469,.118],darkTrim);
  for(const y of [.485,.453])oval(bowlingTorso,[.0035,.0035,.002],[0,y,.124],trim);
  box(bowlingTorso,[.028,.010,.006],[-.084,.405,.12],trim);
  const footballHip=variant(hip,'football','football-shorts-waist');
  const bowlingHip=variant(hip,'bowling','bowling-trouser-waist');
  oval(footballHip,[female?.156:.174,.090,.111],[0,-.025,0],darkTrim);
  oval(bowlingHip,[female?.156:.174,.087,.111],[0,-.018,0],trouser);
  box(bowlingHip,[female?.283:.322,.025,.205],[0,.033,0],rubber);
  box(bowlingHip,[.025,.023,.011],[0,.033,.109],metal);
  const head=studentHead(upper,[0,.705,0]);head.name='head';
  if(!ownIdentity){
    // Reuse the shared facial features, removing only its separate glasses pieces.
    head.children.forEach(child=>{
      const geometry=child.geometry;if(!geometry)return;
      if(geometry.type==='TorusGeometry'||(geometry.type==='CylinderGeometry'&&geometry.parameters.radiusTop===.003)||
        (geometry.type==='BoxGeometry'&&geometry.parameters.width===.032))child.visible=false;
      if(geometry.type==='BufferGeometry')child.visible=false;
    });
    const cap=mesh(head,new THREE.SphereGeometry(1,24,16,0,Math.PI*2,0,Math.PI*.51),hair,[0,.030,-.008]);
    cap.scale.set(.141,.165,.146);cap.name='guest-hair-cap';
    const fringe=oval(head,[.114,.032,.028],[.009,.110,.122],hair);fringe.rotation.z=.10;fringe.name='guest-fringe';
    if(!female){
      const part=line(head,[[-.060,.159,.072],[-.031,.185,.015],[-.016,.183,-.069]],.0025,mat(0x57483c));
      part.name='hair-part';
    }
  }
  if(female){
    head.getObjectByName('guest-hair-cap').visible=false;head.getObjectByName('guest-fringe').visible=false;
    const bob=new THREE.Group();bob.name='bob-haircut';head.add(bob);
    const vertices=[],indices=[],rings=22,sectors=64;
    for(let i=0;i<=rings;i++)for(let j=0;j<=sectors;j++){
      const phi=j/sectors*Math.PI*2,front=THREE.MathUtils.smoothstep(Math.sin(phi),.25,.78),edge=-.16+front*.25+.004*Math.sin(phi*2),limit=Math.acos((edge-.01)/.19),theta=i/rings*limit;
      const lower=Math.max(0,(theta-Math.PI/2)/(2.68-Math.PI/2)),radius=theta<=Math.PI/2?Math.sin(theta)*.16:.16*(1-.08*lower);
      vertices.push(Math.cos(phi)*radius,.01+Math.cos(theta)*.19,Math.sin(phi)*radius*.99);
    }
    for(let i=0;i<rings;i++)for(let j=0;j<sectors;j++){const a=i*(sectors+1)+j,b=a+sectors+1;indices.push(a,b,a+1,b,b+1,a+1);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();hair.side=THREE.DoubleSide;mesh(bob,geometry,hair);
    for(const side of [-1,1]){const cheek=oval(head,[.023,.013,.0025],[side*.083,-.051,.1075],mat(0xd0a69e));cheek.name='soft-cheek';}
    head.children[0].scale.set(.14,.167,.14);
    head.children.forEach(child=>{if(child.geometry?.type==='SphereGeometry'&&Math.abs(child.scale.x-.006)<.0001)child.scale.set(.008,.009,.0045);if(child.geometry?.type==='SphereGeometry'&&Math.abs(child.scale.x-.026)<.0001)child.scale.set(.021,.025,.021);});
    group.userData.hairstyle='bob';
  }

  const legs=[],arms=[];
  for(const side of [-1,1]){
    const leg=new THREE.Group();leg.name=side<0?'left-hip':'right-hip';
    leg.position.set(side*(female?.097:.111),0,0);hip.add(leg);
    tube(leg,thighLength,.062,.050,skin);
    const shorts=variant(leg,'football','football-short-leg');
    tube(shorts,.247,.087,.083,darkTrim,.005);
    const piping=box(shorts,[.009,.230,.030],[side*.080,-.118,.015],trim);piping.rotation.z=side*.025;
    tube(shorts,.011,.084,.084,trim,-.233);
    const upperPants=variant(leg,'bowling','bowling-trouser-thigh');
    tube(upperPants,thighLength,.075,.061,trouser);
    line(upperPants,[[side*.073,-.04,0],[side*.066,-.20,0],[side*.059,-.40,0]],.0013,stitch);
    const knee=new THREE.Group();knee.name=side<0?'left-knee':'right-knee';
    knee.position.y=-thighLength;leg.add(knee);
    oval(knee,[.051,.054,.050],[0,0,0],skin);
    tube(knee,shinLength-.021,.049,.037,skin,-.008);
    const footballShin=variant(knee,'football','football-sock-cleat');
    tube(footballShin,.239,.053,.041,sock,-.176);
    for(const y of [-.192,-.206])tube(footballShin,.006,.054,.054,jersey,y);
    const bowlingShin=variant(knee,'bowling','bowling-trouser-cuff');
    tube(bowlingShin,shinLength-.005,.061,.052,trouser,.003);
    line(bowlingShin,[[side*.061,-.028,0],[side*.055,-.21,0],[side*.051,-.39,0]],.0013,stitch);
    tube(bowlingShin,.010,.053,.053,stitch,-.39);
    const footballFoot=new THREE.Group();footballFoot.name='cleat';footballFoot.position.y=-shinLength;footballShin.add(footballFoot);
    oval(footballFoot,[.072,.037,.139],[0,-.018,.065],boot);
    oval(footballFoot,[.075,.012,.143],[0,-.051,.065],rubber);
    for(const x of [-.045,.045])for(const z of [-.015,.055,.133])
      mesh(footballFoot,new THREE.CylinderGeometry(.010,.008,.014,8),rubber,[x,-.063,z]);
    for(const z of [.035,.052,.069,.086])box(footballFoot,[.055,.003,.004],[0,.014,z],trim);
    for(const offset of [-.018,.006,.030]){
      const stripe=box(footballFoot,[.004,.025,.031],[side*.065,-.002,.057+offset],trim);stripe.rotation.x=-.35;
    }
    const bowlingFoot=new THREE.Group();bowlingFoot.name='bowling-shoe';bowlingFoot.position.y=-shinLength;bowlingShin.add(bowlingFoot);
    oval(bowlingFoot,[.074,.039,.136],[0,-.019,.060],leather);
    oval(bowlingFoot,[.076,.014,.141],[0,-.056,.061],sole);
    oval(bowlingFoot,[.056,.027,.074],[0,-.011,.124],boot);
    oval(bowlingFoot,[.058,.029,.040],[0,-.009,-.026],boot);
    box(bowlingFoot,[.048,.022,.058],[0,.007,.044],leather);
    for(const z of [.030,.047,.064,.081])box(bowlingFoot,[.047,.003,.004],[0,.023,z],darkTrim);
    legs.push({leg,knee,side});
    const arm=new THREE.Group();arm.name=side<0?'left-shoulder':'right-shoulder';
    arm.position.set(side*(female?.202:.224),.486,0);upper.add(arm);
    tube(arm,.290,.052,.042,skin);
    oval(arm,[.053,.055,.054],[0,-.01,0],skin);
    const footballSleeve=variant(arm,'football','football-sleeve');
    const bowlingSleeve=variant(arm,'bowling','bowling-polo-sleeve');
    for(const sleeve of [footballSleeve,bowlingSleeve]){
      tube(sleeve,.140,.066,.058,jersey,.015);
      tube(sleeve,.013,.059,.059,trim,-.116);
      oval(sleeve,[.063,.043,.062],[0,.005,0],jersey);
    }
    const elbow=new THREE.Group();elbow.name=side<0?'left-elbow':'right-elbow';
    elbow.position.y=-.290;arm.add(elbow);
    oval(elbow,[.040,.046,.041],[0,0,0],skin);tube(elbow,.249,.043,.029,skin);
    const hand=new THREE.Group();hand.name='hand';hand.position.set(0,-.278,.009);elbow.add(hand);
    oval(hand,[.035,.050,.025],[0,0,0],skin);
    oval(hand,[.015,.028,.018],[-side*.031,.004,.006],skin).rotation.z=side*.35;
    for(let finger=0;finger<4;finger++)oval(hand,[.007,.028,.011],[(finger-1.5)*.014,-.033,.005],skin);
    arms.push({arm,elbow,side});
  }
  group.userData.sportRig={hip,upper,legs,arms};
  group.userData.headMount=upper;group.userData.head=head;
  group.userData.identity=identity;group.userData.gender=gender;
  group.userData.setKit=value=>{
    if(value!=='football'&&value!=='bowling')throw new RangeError(`Unknown sports kit: ${value}`);
    footballParts.forEach(part=>{part.visible=value==='football';});
    bowlingParts.forEach(part=>{part.visible=value==='bowling';});
    group.userData.kit=value;return group;
  };
  group.userData.pose=(time,walking,crouch=0)=>{
    const bend=Math.max(0,Math.min(1,crouch));
    hip.position.y=baseHeight-bend*.35+(walking?Math.sin(time*16)*.010:0);
    upper.rotation.set(bend*.53,0,0);
    legs.forEach(({leg,knee,side})=>{
      const step=walking?Math.sin(time*8+side*Math.PI/2):0;
      leg.rotation.set(step*.38-bend*.72,0,0);
      knee.rotation.set(Math.max(0,-step)*.58+bend*1.40,0,0);
    });
    arms.forEach(({arm,elbow,side})=>{
      arm.rotation.set((walking?-Math.sin(time*8+side*Math.PI/2)*.30:0)-bend*.20,0,-side*.055);
      elbow.rotation.set(-.10-bend*.15,0,0);
    });
  };
  group.userData.setKit(kit);group.userData.pose(0,false);return group;
}
