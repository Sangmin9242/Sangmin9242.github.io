import * as THREE from './vendor/three.module.js';
import SunCalc from './vendor/suncalc.js';

export function moonImage(phase){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=192;const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(192,192);const lx=Math.sin(phase*Math.PI*2),lz=-Math.cos(phase*Math.PI*2);let lit=0,total=0;
  for(let y=0;y<192;y++)for(let x=0;x<192;x++){const nx=(x-95.5)/90,ny=(y-95.5)/90,r=nx*nx+ny*ny;if(r>1)continue;const z=Math.sqrt(1-r),light=nx*lx+z*lz,index=(y*192+x)*4;total++;if(light>0)lit++;const grain=((x*73+y*37)%23)/23;const crater=Math.sin(nx*32+Math.cos(ny*17))*Math.cos(ny*29+nx*12);const value=light>0?Math.min(245,105+125*Math.sqrt(light)+grain*9+crater*12):17+grain*5;pixels.data[index]=value;pixels.data[index+1]=value;pixels.data[index+2]=Math.min(255,value+6);pixels.data[index+3]=Math.min(255,z*1800);}
  ctx.putImageData(pixels,0,0);return {url:canvas.toDataURL(),litFraction:lit/total};
}

const moonNames={en:['New moon','Waxing crescent','First quarter','Waxing gibbous','Full moon','Waning gibbous','Last quarter','Waning crescent'],ko:['삭','초승달','상현달','차오르는 달','보름달','기우는 달','하현달','그믐달']};
function phaseIndex(p){return p<.025||p>.975?0:p<.22?1:p<.28?2:p<.475?3:p<.525?4:p<.72?5:p<.78?6:7;}
export function celestialSky({world,box,getLanguage}){
  const sky=new THREE.Group();sky.name='Seoul astronomical sky';world.add(sky);
  const sun=new THREE.Mesh(new THREE.SphereGeometry(5,32,20),new THREE.MeshBasicMaterial({color:0xffefbe,fog:false}));sun.name='Sun';sky.add(sun);
  const moon=new THREE.Mesh(new THREE.SphereGeometry(5,48,32),new THREE.ShaderMaterial({uniforms:{lightDirection:{value:new THREE.Vector3()}},vertexShader:'varying vec3 n;varying vec3 p;void main(){n=normalize(mat3(modelMatrix)*normal);p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 lightDirection;varying vec3 n;varying vec3 p;void main(){float lit=dot(normalize(n),lightDirection);float grain=sin(p.x*23.+sin(p.y*16.))*cos(p.z*19.);float c=lit>0.?(.46+.45*sqrt(lit)+grain*.045):.035;gl_FragColor=vec4(vec3(c,c,c*1.035),1.);}' }));moon.name='Moon';sky.add(moon);
  const distance=800;
  const direction=(azimuth,altitude)=>new THREE.Vector3(-Math.sin(azimuth)*Math.cos(altitude),Math.sin(altitude),Math.cos(azimuth)*Math.cos(altitude));
  const haloCanvas=document.createElement('canvas');haloCanvas.width=haloCanvas.height=32;const h=haloCanvas.getContext('2d'),gradient=h.createRadialGradient(16,16,0,16,16,16);gradient.addColorStop(0,'rgba(255,242,190,1)');gradient.addColorStop(.2,'rgba(255,210,130,.9)');gradient.addColorStop(1,'rgba(255,193,107,0)');h.fillStyle=gradient;h.fillRect(0,0,32,32);const halo=new THREE.CanvasTexture(haloCanvas);const sunGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:halo,color:0xffdc8d,transparent:true,depthWrite:false,fog:false,blending:THREE.AdditiveBlending}));sunGlow.scale.set(32,32,1);sun.add(sunGlow);
  const lamps=[];for(const x of [-14,-5,5,14]){const group=new THREE.Group();group.position.set(x,0,8.55);group.rotation.y=Math.PI;world.add(group);box(group,[.38,.15,.38],[0,.05,0],0x485454);box(group,[.11,4.6,.11],[0,2.3,0],0x536168,{metalness:.65,roughness:.4});box(group,[.095,.12,1.0],[0,4.57,.46],0x536168);box(group,[.46,.1,.67],[0,4.49,.87],0x29393e);
    const material=new THREE.MeshStandardMaterial({color:0xe2ddd0,emissive:0xffd6a0,emissiveIntensity:0});const bulb=new THREE.Mesh(new THREE.BoxGeometry(.34,.035,.52),material);bulb.position.set(0,4.43,.87);group.add(bulb);
    const lens=new THREE.Mesh(new THREE.SphereGeometry(.085,12,8),material);lens.position.set(0,4.37,1.23);group.add(lens);const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:halo,color:0xffd39a,transparent:true,depthWrite:false}));glow.position.copy(lens.position);glow.scale.set(.65,.65,1);group.add(glow);
    const light=new THREE.SpotLight(0xffd6a0,0,15,Math.PI/3,.8,2);light.position.set(0,4.4,.87);light.target.position.set(0,0,1.65);group.add(light,light.target);lamps.push({material,light,glow});}
  // Flush runway fixtures: edge rows, centreline, green thresholds and red ends.
  const runwayLights=[];
  function inset(x,z,color){
    const fixture=new THREE.Group();fixture.position.set(x,-.085,z);world.add(fixture);
    const rim=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.022,12),new THREE.MeshStandardMaterial({color:0x485258,metalness:.7,roughness:.45}));fixture.add(rim);
    const material=new THREE.MeshStandardMaterial({color:0xadb6ba,emissive:color,emissiveIntensity:0});
    const lens=new THREE.Mesh(new THREE.CylinderGeometry(.085,.085,.012,12),material);lens.position.y=.014;fixture.add(lens);
    const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:halo,color,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));glow.position.y=.045;glow.scale.set(.65,.65,1);fixture.add(glow);
    const pool=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:halo,color,transparent:true,opacity:.28,depthWrite:false,blending:THREE.AdditiveBlending}));pool.rotation.x=-Math.PI/2;pool.position.y=.018;fixture.add(pool);
    runwayLights.push({material,glow,pool});
  }
  for(let z=-32;z<=32;z+=4)for(const x of [-30.65,-15.35])inset(x,z,0xffe9b9);
  for(let z=-30;z<=30;z+=3)inset(-23,z,0xe9f4ff);
  for(const sign of [-1,1])for(let dx=-6;dx<=6;dx+=1.5){inset(-23+dx,sign*33.8,0x70e6ae);inset(-23+dx,sign*34.6,0xff6c60);}
  let moonMinute=-1,moonData=null;
  function update({now,day,azimuth,altitude}){const language=getLanguage(),position=SunCalc.getMoonPosition(now,37.5665,126.978),illumination=SunCalc.getMoonIllumination(now),minute=Math.floor(now.getTime()/60000);if(minute!==moonMinute){moonMinute=minute;moonData=moonImage(illumination.phase);}
    const sunPosition=SunCalc.getPosition(now,37.5665,126.978),sunDirection=direction(sunPosition.azimuth,sunPosition.altitude),moonDirection=direction(position.azimuth,position.altitude);
    sun.position.copy(sunDirection).multiplyScalar(distance);moon.position.copy(moonDirection).multiplyScalar(distance);sun.visible=day&&sunPosition.altitude>=0;moon.visible=position.altitude>0;
    moon.material.uniforms.lightDirection.value.copy(sunDirection);
    const above=position.altitude>0,label=moonNames[language][phaseIndex(illumination.phase)];document.querySelector('#seoul-moon').textContent=(language==='ko'?'오늘의 달 모양: ':'Today’s moon: ')+label+' · '+Math.round(illumination.fraction*100)+'%';document.querySelector('#seoul-moon-visible').textContent=language==='ko'?(above?'서울: 달이 지평선 위':'서울: 달이 지평선 아래'):(above?'Seoul: above the horizon':'Seoul: below the horizon');
    runwayLights.forEach(({material,glow,pool})=>{material.emissiveIntensity=day?0:5;glow.visible=pool.visible=!day;});
    lamps.forEach(({material,light,glow})=>{material.emissiveIntensity=day?0:4;light.intensity=day?0:220;glow.visible=!day;});const data=document.querySelector('#scene').dataset;data.skySunVisible=String(sun.visible);data.skyMoonVisible=String(moon.visible);data.sunPosition=JSON.stringify(sun.position.toArray());data.moonPosition=JSON.stringify(moon.position.toArray());data.moonAltitude=String(position.altitude*180/Math.PI);data.moonAzimuth=String((position.azimuth*180/Math.PI+540)%360);data.celestialMode="world-3d";data.moonPhase=String(illumination.phase);data.moonIllumination=String(illumination.fraction);data.moonTextureLit=String(moonData.litFraction);data.moonAboveHorizon=String(above);data.streetLights=String(lamps.filter(l=>l.light.intensity>0).length);data.streetLightDirection="building";data.runwayLights=String(runwayLights.filter(l=>l.glow.visible).length);data.runwayFixtures=String(runwayLights.length);
  }
  return {update,project(camera){const d=document.querySelector('#scene').dataset;d.sunProjection=JSON.stringify(sun.getWorldPosition(new THREE.Vector3()).project(camera).toArray());d.moonProjection=JSON.stringify(moon.getWorldPosition(new THREE.Vector3()).project(camera).toArray());}};
}
