import * as THREE from './vendor/three.module.js';

// Procedural screen/environment assets complement bundled CC0 PBR textures.
function random(seed) { return () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }; }
export function surface(kind, size=512) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d');const rng=random(kind==='concrete'?721:973);
  const base=kind==='concrete'?[174,171,162]:kind==='soil'?[111,104,88]:[73,73,70];
  const pixels=ctx.createImageData(size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4;
    const grain=(rng()-.5)*(kind==='soil'?48:30);
    const mottling=Math.sin(x*.037+Math.cos(y*.026))*5+Math.sin(y*.085)*2;
    for(let c=0;c<3;c++)pixels.data[i+c]=Math.max(0,Math.min(255,base[c]+grain+mottling));
    pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);
  if(kind==='concrete'){
    ctx.strokeStyle='rgba(62,59,52,.13)';ctx.lineWidth=1;
    for(let y=0;y<size;y+=128){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(size,y);ctx.stroke();}
    for(let i=0;i<28;i++){const x=rng()*size,y=rng()*size;ctx.fillStyle='rgba(48,44,38,.2)';ctx.beginPath();ctx.ellipse(x,y,.5+rng()*1.5,.6+rng()*2,0,0,Math.PI*2);ctx.fill();}
    for(let i=0;i<10;i++){const x=rng()*size;const shade=ctx.createLinearGradient(x,0,x+6,0);shade.addColorStop(0,'rgba(74,70,59,0)');shade.addColorStop(.5,'rgba(74,70,59,.08)');shade.addColorStop(1,'rgba(74,70,59,0)');ctx.fillStyle=shade;ctx.fillRect(x,0,6,size);}
  }else if(kind==='soil'){
    for(let i=0;i<1200;i++){ctx.fillStyle=rng()>.5?'rgba(185,175,154,.4)':'rgba(36,35,30,.35)';ctx.beginPath();ctx.ellipse(rng()*size,rng()*size,1+rng()*3,.8+rng()*2,rng()*6,0,Math.PI*2);ctx.fill();}
    ctx.strokeStyle='rgba(33,32,26,.18)';ctx.lineWidth=2;
    for(let x=36;x<size;x+=180)for(let y=0;y<size;y+=9){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+28,y+5);ctx.moveTo(x+40,y);ctx.lineTo(x+68,y+5);ctx.stroke();}
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;
  return texture;
}

export function daylightEnvironment(renderer) {
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const ctx=canvas.getContext('2d');
  const gradient=ctx.createLinearGradient(0,0,0,512);
  gradient.addColorStop(0,'#6f8493');gradient.addColorStop(.44,'#bdc8ca');gradient.addColorStop(.51,'#ece4d4');gradient.addColorStop(.58,'#727568');gradient.addColorStop(1,'#373b35');ctx.fillStyle=gradient;ctx.fillRect(0,0,1024,512);
  const glow=ctx.createRadialGradient(280,185,3,280,185,100);glow.addColorStop(0,'rgba(255,247,228,1)');glow.addColorStop(.3,'rgba(255,247,228,.8)');glow.addColorStop(1,'rgba(255,247,228,0)');ctx.fillStyle=glow;ctx.fillRect(150,60,270,260);
  const tex=new THREE.CanvasTexture(canvas);tex.mapping=THREE.EquirectangularReflectionMapping;tex.colorSpace=THREE.SRGBColorSpace;
  const pmrem=new THREE.PMREMGenerator(renderer);const target=pmrem.fromEquirectangular(tex);pmrem.dispose();tex.dispose();return target;
}

export function screenTexture() {
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=320;const ctx=canvas.getContext('2d');ctx.fillStyle='#0c2030';ctx.fillRect(0,0,512,320);ctx.fillStyle='#d2e3ea';ctx.font='26px sans-serif';ctx.fillText('Sangmin Lee',35,50);ctx.fillStyle='#c9a675';ctx.font='14px sans-serif';ctx.fillText('Research & CV',35,79);
  ctx.strokeStyle='#75a2b5';ctx.lineWidth=1;for(let x=280;x<460;x+=28){ctx.beginPath();ctx.moveTo(x,120);ctx.lineTo(x,250);ctx.stroke();}for(let y=120;y<=250;y+=26){ctx.beginPath();ctx.moveTo(280,y);ctx.lineTo(452,y);ctx.stroke();}
  ctx.fillStyle='#85a1b1';for(let y=125;y<240;y+=25)ctx.fillRect(35,y,175-((y/25)%3)*20,5);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}

export function pbrTextures(id, repeat=[1,1]) {
  const loader=new THREE.TextureLoader();
  const read=(suffix,color=false)=>{const texture=loader.load(`./assets/materials/${id}_${suffix}.jpg`);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(...repeat);texture.anisotropy=4;if(color)texture.colorSpace=THREE.SRGBColorSpace;return texture;};
  return {map:read('diffuse',true),normalMap:read('nor_gl'),roughnessMap:read('rough')};
}
