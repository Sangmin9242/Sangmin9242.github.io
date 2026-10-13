import * as THREE from './vendor/three.module.js';

export function fireproofingCoat(target){
  const {width,height,depth}=target.geometry.parameters;
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const ctx=canvas.getContext('2d');
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const grain=document.createElement('canvas');grain.width=grain.height=256;const g=grain.getContext('2d'),pixels=g.createImageData(256,256);let seed=571;
  for(let i=0;i<pixels.data.length;i+=4){seed=(1664525*seed+1013904223)>>>0;const v=85+(seed%150);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255;}g.putImageData(pixels,0,0);
  const roughness=new THREE.CanvasTexture(grain);roughness.wrapS=roughness.wrapT=THREE.RepeatWrapping;roughness.repeat.set(12,2);
  const material=new THREE.MeshStandardMaterial({color:0xffffff,map:texture,bumpMap:roughness,bumpScale:.016,displacementMap:texture,displacementScale:.018,roughness:1,metalness:0,transparent:true,depthWrite:false});
  const skin=new THREE.Mesh(new THREE.PlaneGeometry(width,height,72,12),material);skin.position.z=depth/2+.003;skin.receiveShadow=true;skin.renderOrder=2;target.add(skin);
  const cells=new Uint8Array(64*8);let painted=0;
  function paint(worldPoint,delta){const point=target.worldToLocal(worldPoint.clone());const x=(point.x/width+.5)*canvas.width,y=(.5-point.y/height)*canvas.height;const rx=.22/width*canvas.width,ry=.22/height*canvas.height;
    ctx.fillStyle='rgba(201,205,198,'+Math.min(.19,delta*3)+')';ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();
    for(let i=0;i<95;i++){seed=(1664525*seed+1013904223)>>>0;const a=(seed%6283)/1000;seed=(1664525*seed+1013904223)>>>0;const r=Math.sqrt((seed%1000)/1000);const shade=177+seed%65;ctx.fillStyle='rgba('+shade+','+(shade+3)+','+(shade-2)+',.35)';ctx.beginPath();ctx.ellipse(x+Math.cos(a)*rx*r,y+Math.sin(a)*ry*r,.4+seed%19/10,.4+seed%13/10,a,0,Math.PI*2);ctx.fill();}
    const cx=THREE.MathUtils.clamp(Math.floor(x/canvas.width*64),0,63),cy=THREE.MathUtils.clamp(Math.floor(y/canvas.height*8),0,7),cell=cy*64+cx;if(!cells[cell]){cells[cell]=1;painted++;}texture.needsUpdate=true;
  }
  return {paint,reset(){ctx.clearRect(0,0,canvas.width,canvas.height);texture.needsUpdate=true;cells.fill(0);painted=0;},get coverage(){return painted/cells.length;}};
}
