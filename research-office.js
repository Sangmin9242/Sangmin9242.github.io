import * as THREE from './vendor/three.module.js';

export function researchOffice({parent,box,screenTexture}){
  const groups={};
  function object(kind,position){const g=new THREE.Group();g.position.set(...position);g.userData.panel=kind;parent.add(g);groups[kind]=g;return g;}
  function drawing(draw){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=640;draw(canvas.getContext('2d'));const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;}
  function sheet(parent,size,position,texture){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(...size),new THREE.MeshStandardMaterial({map:texture,roughness:.65}));mesh.position.set(...position);parent.add(mesh);return mesh;}
  const shelf=object('publications',[-1.62,0,-.73]);
  box(shelf,[.77,2.08,.055],[0,1.09,-.18],0x695a46);
  for(const x of [-.4,.4])box(shelf,[.065,2.18,.43],[x,1.12,0],0x79674e);
  for(const y of [.07,.57,1.07,1.57,2.17])box(shelf,[.84,.055,.46],[0,y,0],0x8e7858);
  const covers=[0x3c5261,0x839397,0x9a7658,0xd0c8b8,0x485e57,0x8b654f];
  for(let row=0;row<4;row++)for(let i=0;i<6;i++){const h=.29+(i%3)*.045,w=.065+(i%2)*.02;const book=box(shelf,[w,h,.27],[-.29+i*.105,.12+row*.5+h/2,.035],covers[(i+row)%covers.length]);book.rotation.z=i===5?-.09:0;for(const dy of [-.08,.08])box(shelf,[w*.74,.009,.005],[-.29+i*.105,.12+row*.5+h/2+dy,.174],0xd5c9a7);}
  const award=object('awards',[1.1,1.63,-1.37]);
  const certificate=drawing(ctx=>{ctx.fillStyle='#f2ede1';ctx.fillRect(0,0,512,640);ctx.strokeStyle='#b99a52';ctx.lineWidth=5;ctx.strokeRect(27,27,458,586);ctx.fillStyle='#365267';ctx.font='24px serif';ctx.textAlign='center';ctx.fillText('Research Award',256,190);ctx.fillStyle='#85929b';for(let y=280;y<460;y+=28)ctx.fillRect(115,y,282,3);ctx.fillStyle='#b79a53';ctx.beginPath();ctx.arc(256,530,28,0,Math.PI*2);ctx.fill();});
  box(award,[.66,.86,.055],[0,0,0],0x987d49,{metalness:.6,roughness:.3});sheet(award,[.57,.77],[0,0,.032],certificate);
  const patents=object('patents',[-1.46,0,1.07]);
  box(patents,[.87,1.04,.53],[0,.58,0],0x65716f,{metalness:.4,roughness:.55});
  for(let i=0;i<4;i++){const y=.22+i*.24;box(patents,[.78,.195,.025],[0,y,.279],0x89938c);box(patents,[.23,.024,.032],[0,y,.306],0x293b41);box(patents,[.14,.042,.004],[0,y+.057,.299],0xd4d1bf);}
  const blueprint=drawing(ctx=>{ctx.fillStyle='#315362';ctx.fillRect(0,0,512,640);ctx.strokeStyle='#aec9cf';ctx.lineWidth=3;ctx.strokeRect(35,40,442,560);ctx.strokeRect(135,150,240,35);ctx.strokeRect(235,185,40,260);ctx.strokeRect(135,445,240,35);ctx.lineWidth=1;for(let y=90;y<580;y+=20){ctx.beginPath();ctx.moveTo(70,y);ctx.lineTo(100,y);ctx.stroke();}ctx.font='23px sans-serif';ctx.fillStyle='#d7e6e7';ctx.fillText('Design & engineering',80,555);});
  const plan=sheet(patents,[.41,.5],[0,1.125,0],blueprint);plan.rotation.x=-Math.PI/2;
  const software=object('software',[1.4,0,.48]);
  box(software,[.74,.055,.67],[0,.83,0],0x8b7659);for(const x of [-.3,.3])for(const z of [-.26,.26])box(software,[.025,.79,.025],[x,.415,z],0x424a49);
  box(software,[.51,.025,.34],[0,.875,0],0x465255,{metalness:.65,roughness:.3});
  const display=new THREE.Group();display.position.set(0,.89,-.15);display.rotation.x=-.14;software.add(display);box(display,[.52,.34,.025],[0,.17,0],0x283b45);sheet(display,[.47,.285],[0,.17,.015],screenTexture());
  for(let i=0;i<6;i++)box(software,[.38,.002,.008],[0,.891,-.09+i*.022],0x818b8b);
  return groups;
}
