import * as THREE from './vendor/three.module.js';
import {parkingLampPositions,parkingBollardPositions,drivewayLampSpecs} from './driveway-layout.js?v=20261015-road-lights';
import SunCalc from './vendor/suncalc.js';
import {runwayFixtures} from './runway-fixtures.js';

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
  const lamps=[];for(const [x,z,rotation,drivewayLamp=false] of [[-14,8.55,Math.PI],[-5,8.55,Math.PI],[5,8.55,Math.PI],[14,8.55,Math.PI],[-10,-6,0],[10,-6,0],[-19.5,-28,-Math.PI/2],[-19.5,-18,-Math.PI/2],[-19.5,-8,-Math.PI/2],[-19.5,3,-Math.PI/2],[-19.5,14,-Math.PI/2],[-19.5,26,-Math.PI/2],...drivewayLampSpecs.map(([x,z,tx,tz])=>[x,z,Math.atan2(tx-x,tz-z),true])]){const group=new THREE.Group();group.position.set(x,drivewayLamp?-.135:0,z);group.rotation.y=rotation;group.name=drivewayLamp?'Access road streetlight':'Site streetlight';world.add(group);box(group,[.38,.15,.38],[0,.05,0],0x485454);box(group,[.11,4.6,.11],[0,2.3,0],0x536168,{metalness:.65,roughness:.4});box(group,[.095,.12,1.0],[0,4.57,.46],0x536168);box(group,[.46,.1,.67],[0,4.49,.87],0x29393e);
    const material=new THREE.MeshStandardMaterial({color:0xe2ddd0,emissive:0xffd6a0,emissiveIntensity:0});const bulb=new THREE.Mesh(new THREE.BoxGeometry(.34,.035,.52),material);bulb.position.set(0,4.43,.87);group.add(bulb);
    const lens=new THREE.Mesh(new THREE.SphereGeometry(.085,12,8),material);lens.position.set(0,4.37,1.23);group.add(lens);const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:halo,color:0xffd39a,transparent:true,depthWrite:false}));glow.position.copy(lens.position);glow.scale.set(.65,.65,1);group.add(glow);
    const light=new THREE.SpotLight(0xffd6a0,0,drivewayLamp?24:15,Math.PI/3,.8,2);light.position.set(0,4.4,.87);light.target.position.set(0,drivewayLamp?.06:1.1,drivewayLamp?6:3);group.add(light,light.target);lamps.push({material,light,glow,drivewayLamp});}
  // Shielded work lights illuminate the structure instead of only the ground.
  const workLights=[];
  for(const [x,y,z,tx,ty,tz] of [[-4,3,6,0,4,0],[4,3,6,0,4,0],[-4,9,6,0,10,0],[4,9,6,0,10,0]]){
    const housing=box(world,[.48,.22,.18],[x,y,z],0x394951,{metalness:.5});
    const material=new THREE.MeshStandardMaterial({color:0xe8edf2,emissive:0xe5f2ff,emissiveIntensity:0});
    const lens=new THREE.Mesh(new THREE.BoxGeometry(.38,.13,.025),material);lens.position.set(x,y,z-.11);world.add(lens);
    const light=new THREE.SpotLight(0xe5f2ff,0,19,Math.PI/3,.75,2);light.position.set(x,y,z-.15);light.target.position.set(tx,ty,tz);world.add(light,light.target);workLights.push({material,light});
  }
  const areaLights=[];
  for(const [x,z,height,tx,tz,intensity,distance] of [...parkingLampPositions.map(([x,z])=>[x,z,3.3,-3,18,650,32]),[-53.3,-16,5.5,-44,-9,1300,44],[-34.7,16,5.5,-44,9,1300,44]]){
    box(world,[.11,height,.11],[x,height/2,z],0x536168,{metalness:.65});box(world,[.65,.12,.5],[x,height,z],0x34434a);
    const material=new THREE.MeshStandardMaterial({color:0xe7e8df,emissive:0xffedcf,emissiveIntensity:0});
    const lens=new THREE.Mesh(new THREE.BoxGeometry(.52,.04,.4),material);lens.position.set(x,height-.08,z);world.add(lens);
    const light=new THREE.SpotLight(0xffedd2,0,distance,1.25,.9,2);light.position.set(x,height-.1,z);light.target.position.set(tx,-.1,tz);world.add(light,light.target);areaLights.push({light,material,intensity,type:x<-30?'runway':'forecourt'});
  }
  for(const [x,z] of parkingBollardPositions){
    box(world,[.13,.75,.13],[x,.3,z],0x58666b);
    const material=new THREE.MeshStandardMaterial({color:0xe7e4db,emissive:0xffdfae,emissiveIntensity:0});const lens=new THREE.Mesh(new THREE.BoxGeometry(.14,.09,.14),material);lens.position.set(x,.68,z);world.add(lens);areaLights.push({material,type:'bollard'});
  }
  // Flush runway fixtures: edge rows, centreline, green thresholds and red ends.
  const runway=runwayFixtures({world,halo});
  let moonMinute=-1,moonData=null;
  function update({now,day,azimuth,altitude}){const language=getLanguage(),position=SunCalc.getMoonPosition(now,37.5665,126.978),illumination=SunCalc.getMoonIllumination(now),minute=Math.floor(now.getTime()/60000);if(minute!==moonMinute){moonMinute=minute;moonData=moonImage(illumination.phase);}
    const sunPosition=SunCalc.getPosition(now,37.5665,126.978),sunDirection=direction(sunPosition.azimuth,sunPosition.altitude),moonDirection=direction(position.azimuth,position.altitude);
    sun.position.copy(sunDirection).multiplyScalar(distance);moon.position.copy(moonDirection).multiplyScalar(distance);sun.visible=day&&sunPosition.altitude>=0;moon.visible=position.altitude>0;
    moon.material.uniforms.lightDirection.value.copy(sunDirection);
    const above=position.altitude>0,label=moonNames[language][phaseIndex(illumination.phase)];document.querySelector('#seoul-moon').textContent=(language==='ko'?'오늘의 달 모양: ':'Today’s moon: ')+label+' · '+Math.round(illumination.fraction*100)+'%';document.querySelector('#seoul-moon-visible').textContent=language==='ko'?(above?'서울: 달이 지평선 위':'서울: 달이 지평선 아래'):(above?'Seoul: above the horizon':'Seoul: below the horizon');
    runway.setNight(!day);
    lamps.forEach(({material,light,glow,drivewayLamp})=>{material.emissiveIntensity=day?0:4;light.intensity=day?0:drivewayLamp?650:300;light.visible=light.intensity>0;glow.visible=!day;});workLights.forEach(({material,light})=>{material.emissiveIntensity=day?0:2.5;light.intensity=day?0:190;light.visible=light.intensity>0;});areaLights.forEach(({material,light,intensity})=>{material.emissiveIntensity=day?0:3;if(light){light.intensity=day?0:intensity;light.visible=light.intensity>0;}});const data=document.querySelector('#scene').dataset;data.forecourtLights=String(areaLights.filter(l=>l.type==='forecourt'&&l.light.intensity>0).length);data.runwayFloodLights=String(areaLights.filter(l=>l.type==='runway'&&l.light.intensity>0).length);data.workLights=String(workLights.filter(l=>l.light.intensity>0).length);data.skySunVisible=String(sun.visible);data.skyMoonVisible=String(moon.visible);data.sunPosition=JSON.stringify(sun.position.toArray());data.moonPosition=JSON.stringify(moon.position.toArray());data.moonAltitude=String(position.altitude*180/Math.PI);data.moonAzimuth=String((position.azimuth*180/Math.PI+540)%360);data.celestialMode="world-3d";data.moonPhase=String(illumination.phase);data.moonIllumination=String(illumination.fraction);data.moonTextureLit=String(moonData.litFraction);data.moonAboveHorizon=String(above);data.drivewayLampFixtures=String(drivewayLampSpecs.length);data.drivewayLights=String(lamps.filter(l=>l.drivewayLamp&&l.light.intensity>0).length);data.streetLights=String(lamps.filter(l=>l.light.intensity>0).length);data.streetLightDirection="building";data.runwayLights=String(day?0:runway.count);data.runwayFixtures=String(runway.count);
  }
  return {update,project(camera){const d=document.querySelector('#scene').dataset;d.sunProjection=JSON.stringify(sun.getWorldPosition(new THREE.Vector3()).project(camera).toArray());d.moonProjection=JSON.stringify(moon.getWorldPosition(new THREE.Vector3()).project(camera).toArray());}};
}
