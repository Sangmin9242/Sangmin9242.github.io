import * as THREE from './vendor/three.module.js';

export function sportsFacilities(parent){
  const football=new THREE.Group(),bowling=new THREE.Group();bowling.position.z=14;bowling.rotation.y=Math.PI/2;bowling.updateMatrix();parent.add(football,bowling);
  const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.75,...extra}),white=mat(0xf0ede3),steel=mat(0x596772,{metalness:.6});
  function box(p,w,h,d,x,y,z,m){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;}
  function rod(p,a,b,r=.03,m=white){const x=new THREE.Vector3(...a),y=new THREE.Vector3(...b),o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,x.distanceTo(y),10),m);o.position.copy(x).add(y).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),y.sub(x).normalize());p.add(o);return o;}
  function lines(p,points,color=0xc8d5cf,opacity=1){const o=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points.map(v=>new THREE.Vector3(...v))),new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity}));p.add(o);return o;}
  function path(p,points,color=0xf2efe7){for(let i=1;i<points.length;i++)rod(p,points[i-1],points[i],.017,mat(color));}
  function canvasTexture(canvas){const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;}
  function screen(p,text,x,y,z,w){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#17303b';ctx.fillRect(0,0,512,128);ctx.fillStyle='#eff4ed';ctx.font='500 52px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,84);return box(p,w,w/4,.05,x,y,z,mat(0xffffff,{map:canvasTexture(c),emissive:0xffffff,emissiveMap:canvasTexture(c),emissiveIntensity:.3}));}
  // Compact training pitch: curb, turf bands, complete marking and protective mesh.
  box(football,11.1,.16,16.8,0,-.08,0,mat(0x69746b));
  for(let i=0;i<10;i++)box(football,10.5,.018,1.6,0,.009,-7.2+i*1.6,mat(i%2?0x3d704b:0x427750,{roughness:1}));
  path(football,[[-4.9,.029,-7.5],[4.9,.029,-7.5],[4.9,.029,7.5],[-4.9,.029,7.5],[-4.9,.029,-7.5]]);
  path(football,[[-4.9,.029,0],[4.9,.029,0]]);
  const circle=new THREE.Mesh(new THREE.TorusGeometry(1.25,.018,6,64),white);circle.rotation.x=Math.PI/2;circle.position.y=.029;football.add(circle);
  const net=[];
  for(const side of [-1,1]){
    const z=side*7.5,back=z+side*.65;
    for(const x of [-1.5,1.5]){rod(football,[x,0,z],[x,1.8,z],.045);rod(football,[x,1.8,z],[x,1.8,back],.035);rod(football,[x,0,back],[x,1.8,back],.025);}
    rod(football,[-1.5,1.8,z],[1.5,1.8,z],.045);rod(football,[-1.5,1.8,back],[1.5,1.8,back],.025);
    for(let x=-1.5;x<=1.51;x+=.15)net.push([x,.035,back],[x,1.8,back],[x,1.8,back],[x,1.8,z]);
    for(let y=.15;y<=1.81;y+=.15){net.push([-1.5,y,back],[1.5,y,back]);for(const x of [-1.5,1.5])net.push([x,y,z],[x,y,back]);}
    path(football,[[-2.7,.03,z],[-2.7,.03,z-side*2.0],[2.7,.03,z-side*2.0],[2.7,.03,z]]);
    path(football,[[-1.85,.03,z],[-1.85,.03,z-side*.7],[1.85,.03,z-side*.7],[1.85,.03,z]]);
  }
  lines(football,net,0xe4e8de,.7);
  const fence=[];for(const side of [-1,1]){
    for(let z=-8;z<=8;z+=2)rod(football,[side*5.45,0,z],[side*5.45,2.4,z],.026,steel);
    for(let z=-8;z<8;z+=.32){fence.push([side*5.45,.1,z],[side*5.45,2.3,Math.min(8,z+1.1)]);fence.push([side*5.45,2.3,z],[side*5.45,.1,Math.min(8,z+1.1)]);}
    box(football,.5,.13,3.8,side*6.1,.48,1.3,mat(0x89735d));for(const z of [0,2.5])box(football,.1,.5,.1,side*6.1,.23,z,steel);
  }lines(football,fence,0x668577,.48);
  const footballCanvas=document.createElement('canvas');footballCanvas.width=256;footballCanvas.height=128;const fc=footballCanvas.getContext('2d');fc.fillStyle='#efeee5';fc.fillRect(0,0,256,128);fc.fillStyle='#24343b';for(let row=0;row<4;row++)for(let col=0;col<8;col++){const x=col*32+(row%2)*16,y=row*32+16;fc.beginPath();for(let k=0;k<5;k++){const a=k*Math.PI*2/5;fc.lineTo(x+Math.cos(a)*9,y+Math.sin(a)*9);}fc.closePath();fc.fill();}
  const ball=new THREE.Mesh(new THREE.SphereGeometry(.12,24,16),mat(0xffffff,{map:canvasTexture(footballCanvas)}));ball.castShadow=true;football.add(ball);
  // Lane length follows the 60 ft foul-line-to-headpin dimension (18.29 m).
  const foul=8,head=foul-18.29,laneCenter=(foul+head)/2;
  box(bowling,6.8,.18,26.8,0,-.09,1,mat(0x4d5860));
  box(bowling,6.8,4.5,.18,0,2.25,-12.4,mat(0x213642));
  for(const x of [-3.35,3.35]){box(bowling,.16,2.7,26.8,x,1.35,1,mat(0x556c76));box(bowling,.18,.08,26.8,x,2.75,1,steel);}
  const woodCanvas=document.createElement('canvas');woodCanvas.width=256;woodCanvas.height=1024;const wc=woodCanvas.getContext('2d');for(let i=0;i<16;i++){wc.fillStyle=i%2?'#ccaa75':'#d5b57e';wc.fillRect(i*16,0,16,1024);wc.strokeStyle='#98774655';wc.beginPath();wc.moveTo(i*16,0);wc.lineTo(i*16,1024);wc.stroke();for(let j=0;j<14;j++){wc.strokeStyle='#a5825040';wc.beginPath();wc.moveTo(i*16+3+(j%4)*2,j*73);wc.bezierCurveTo(i*16+10,j*73+20,i*16+4,j*73+40,i*16+11,j*73+65);wc.stroke();}}
  const wood=mat(0xffffff,{map:canvasTexture(woodCanvas),roughness:.27,metalness:.05}),pins=[[],[]],sweepBars=[];
  const profile=[[0,0],[.05,.02],[.06,.10],[.051,.18],[.027,.25],[.03,.30],[.037,.34],[.027,.375],[0,.381]].map(p=>new THREE.Vector2(...p));
  for(const [lane,x] of [[0,-1.15],[1,1.15]]){
    box(bowling,1.05,.04,20,x,.02,-2,wood);box(bowling,1.5,.028,4.57,x,.014,10.285,wood);
    box(bowling,1.05,.005,.035,x,.043,foul,mat(0x243846));
    for(const side of [-1,1]){const gutter=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,20,16,1,true,-Math.PI/2,Math.PI),mat(0x5a6d7a,{metalness:.7,roughness:.3}));gutter.rotation.x=Math.PI/2;gutter.position.set(x+side*.68,.095,-2);bowling.add(gutter);box(bowling,.04,.07,20,x+side*.85,.035,-2,steel);}
    for(let i=-3;i<=3;i++){
      const triangle=new THREE.Shape();triangle.moveTo(-.035,0);triangle.lineTo(.035,0);triangle.lineTo(0,.11);triangle.closePath();const arrow=new THREE.Mesh(new THREE.ShapeGeometry(triangle),mat(0x634d37));arrow.rotation.x=-Math.PI/2;arrow.position.set(x+i*.11,.045,3.4+Math.abs(i)*.14);bowling.add(arrow);
      const dot=new THREE.Mesh(new THREE.CircleGeometry(.016,10),mat(0x604c38));dot.rotation.x=-Math.PI/2;dot.position.set(x+i*.11,.031,10.2);bowling.add(dot);
    }
    for(let row=0;row<4;row++)for(let col=0;col<=row;col++){
      const pin=new THREE.Group();pin.position.set(x+(col-row/2)*.3048,.042,head-row*.3048);bowling.add(pin);const body=new THREE.Mesh(new THREE.LatheGeometry(profile,20),white);body.castShadow=true;pin.add(body);
      for(const y of [.25,.28]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.031,.008,6,16),mat(0xc74b47));ring.rotation.x=Math.PI/2;ring.position.y=y;pin.add(ring);}pins[lane].push(pin);
    }
    box(bowling,1.72,1.0,.5,x,1.25,-11.75,mat(0x18323e));screen(bowling,'LANE '+(lane+1),x,1.45,-11.47,1.3);
    const sweep=box(bowling,1.09,.08,.06,x,.2,head+.55,mat(0xdbbc52));sweep.visible=false;sweepBars.push(sweep);
  }
  // Ball return, seating, shoes and overhead linear fixtures give the room its scale.
  box(bowling,.46,.65,2.15,0,.325,10.9,steel);for(const x of [-.22,.22])rod(bowling,[x,.72,10],[x,.72,12],.025,steel);
  for(let i=0;i<4;i++){const o=new THREE.Mesh(new THREE.SphereGeometry(.11,24,16),mat([0x3c668e,0x93669d,0xb17a48,0x6b7d54][i],{roughness:.18}));o.position.set(0,.8,10.3+i*.35);bowling.add(o);}
  for(const x of [-2.6,2.6]){box(bowling,.55,.2,2.6,x,.45,11.5,mat(0x946e58));box(bowling,.1,.48,2.6,x+.22,.7,11.5,mat(0x785947));for(const z of [10.7,12.2])box(bowling,.06,.45,.06,x,.2,z,steel);}
  const roof=box(bowling,6.95,.18,27.0,0,4.58,1,mat(0x59636b,{roughness:.9}));
  const upperWalls=[];for(const x of [-3.35,3.35])upperWalls.push(box(bowling,.15,1.7,26.8,x,3.6,1,mat(0x364d59,{roughness:.3,metalness:.2})));
  let focused='auto';
  const scoreCanvas=document.createElement('canvas');scoreCanvas.width=1024;scoreCanvas.height=256;const scoreTexture=canvasTexture(scoreCanvas);
  box(bowling,5.3,1.35,.12,0,3.8,-12.25,mat(0x101b25));box(bowling,5.12,1.25,.025,0,3.8,-12.17,mat(0xffffff,{map:scoreTexture,emissive:0xffffff,emissiveMap:scoreTexture,emissiveIntensity:.6}));
  for(const z of [-7,0,7]){box(bowling,6.75,.07,.1,0,3.25,z,steel);box(bowling,4.6,.06,.15,0,3.19,z,mat(0xf1eee0,{emissive:0xe8e4cf,emissiveIntensity:.65}));}
  const bowlingBalls=[0,1].map(i=>{const ball=new THREE.Mesh(new THREE.SphereGeometry(.108,24,16),mat(i?0x805879:0x3d5b95,{roughness:.16,metalness:.12}));for(const [x,y] of [[-.028,.025],[.028,.025],[0,-.027]]){const hole=new THREE.Mesh(new THREE.SphereGeometry(.012,10,8),mat(0x18202c));hole.position.set(x,y,.101);ball.add(hole);}bowling.add(ball);return ball;});
  const lights=[];for(const [p,x,y,z,intensity,distance] of [[football,5.8,6,0,750,26],[bowling,3.6,4,-6,380,26],[bowling,-3.6,4,7,380,26]]){
    box(p,.08,y,.08,x,y/2,z,steel);box(p,.6,.12,.5,x,y,z,steel);const light=new THREE.SpotLight(0xffefd9,0,distance,1.15,.75,2);light.position.set(x,y-.1,z);light.target.position.set(0,0,z);p.add(light,light.target);lights.push({light,intensity});
  }
  return {football,bowling,ball,bowlingBalls,pins,sweepBars,scoreCanvas,scoreTexture,foul,head,setFocus(kind){focused=kind;roof.visible=kind!=='bowling';upperWalls.forEach(w=>w.visible=roof.visible);},setLights(night){lights.forEach(({light,intensity})=>light.intensity=night?intensity*(focused==='auto'?.25:1):0);}};
}
