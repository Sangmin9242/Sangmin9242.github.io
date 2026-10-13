import * as THREE from './vendor/three.module.js';
import { airplane } from './airplane.js?v=20261014-coating';

export const conferences=[
  {id:'ccc',attended:true,name:'CCC 2025',full:'Creative Construction Conference',lat:44.12,lon:15.23,city:{en:'Zadar, Croatia',ko:'크로아티아 자다르'},date:{en:'14–17 June 2025',ko:'2025년 6월 14–17일'},landmark:{en:'Sea Organ',ko:'바다 오르간'},photo:'zadar',author:'Ben Snooks',license:'CC BY-SA 2.0',licenseURL:'https://creativecommons.org/licenses/by-sa/2.0/',photoURL:'https://commons.wikimedia.org/wiki/File:Zadar-Sea-Organ.jpg',source:'https://2025.creative-construction-conference.com/program.php',papers:['CCC2025/0052']},
  {id:'isarc',name:'ISARC 2025',full:'International Symposium on Automation and Robotics in Construction',lat:45.50,lon:-73.57,city:{en:'Montréal, Canada',ko:'캐나다 몬트리올'},date:{en:'28–31 July 2025',ko:'2025년 7월 28–31일'},landmark:{en:'Old Port of Montréal',ko:'몬트리올 구항구'},photo:'montreal',author:'Gjm130',license:'CC BY-SA 3.0',licenseURL:'https://creativecommons.org/licenses/by-sa/3.0/',photoURL:'https://commons.wikimedia.org/wiki/File:Old_Port_of_Montreal_(French-_Vieux-Port_de_Montr%C3%A9al).jpg',source:'https://www.iaarc.org/isarc-2025/',papers:['ISARC2025/0180']},
  {id:'ec3',name:'EC³ 2026',full:'European Conference on Computing in Construction',lat:39.62,lon:19.92,city:{en:'Corfu, Greece',ko:'그리스 코르푸'},date:{en:'12–15 July 2026',ko:'2026년 7월 12–15일'},landmark:{en:'Old Fortress & Old Town',ko:'옛 요새와 구시가지'},photo:'corfu',author:'Martin Falbisoner',license:'CC BY-SA 4.0',licenseURL:'https://creativecommons.org/licenses/by-sa/4.0/',photoURL:'https://commons.wikimedia.org/wiki/File:The_Old_Fortress_and_the_Old_Town_of_Corfu_-_September_2017.jpg',source:'https://ec-3.org/conferences/',papers:['EC3.2026.436','EC3.2026.447','EC3.2026.451']}
];
const words={en:{title:'Research across borders',back:'Back to the site',related:'Conference papers',event:'Conference website',prev:'Previous conference',next:'Next conference',seoul:'Seoul',hint:'Drag to rotate · Right-drag or two fingers to pan · Scroll or pinch to zoom'},ko:{title:'세계로 이어지는 연구',back:'공사 현장으로',related:'학회 논문',event:'학회 홈페이지',prev:'이전 학회',next:'다음 학회',seoul:'서울',hint:'드래그로 회전 · 우클릭 또는 두 손가락으로 이동 · 휠 또는 핀치로 확대·축소'}};
const radius=3.5;
function locationVector(lat,lon,r=radius){const a=THREE.MathUtils.degToRad(lat),b=THREE.MathUtils.degToRad(lon);return new THREE.Vector3(Math.cos(a)*Math.sin(b)*r,Math.sin(a)*r,Math.cos(a)*Math.cos(b)*r);}
function routePoints(from,to){const a=locationVector(from.lat,from.lon,1),b=locationVector(to.lat,to.lon,1),angle=a.angleTo(b);return Array.from({length:101},(_,i)=>{const t=i/100;return a.clone().multiplyScalar(Math.sin((1-t)*angle)/Math.sin(angle)).addScaledVector(b,Math.sin(t*angle)/Math.sin(angle)).normalize().multiplyScalar(radius+.07+Math.sin(t*Math.PI)*.9);});}

function atlasTexture(topology){
  const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=1024;const ctx=canvas.getContext('2d');ctx.fillStyle='#112b3c';ctx.fillRect(0,0,2048,1024);
  const arcs=topology.arcs.map(arc=>{let x=0,y=0;return arc.map(p=>{x+=p[0];y+=p[1];return [x*topology.transform.scale[0]+topology.transform.translate[0],y*topology.transform.scale[1]+topology.transform.translate[1]];});});
  const ring=indices=>indices.flatMap((id,i)=>{const points=id<0?arcs[~id].slice().reverse():arcs[id];return i?points.slice(1):points;});
  ctx.fillStyle='#657d7c';ctx.strokeStyle='#1e4551';ctx.lineWidth=.75;
  for(const country of topology.objects.countries.geometries){const polygons=country.type==='Polygon'?[country.arcs]:country.arcs;for(const polygon of polygons){ctx.beginPath();for(const indices of polygon){const points=ring(indices);points.forEach(([lon,lat],i)=>{const x=(lon+180)/360*2048,y=(90-lat)/180*1024;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();}ctx.fill('evenodd');ctx.stroke();}}
  ctx.strokeStyle='#a5c4cc25';ctx.lineWidth=.7;for(let lat=-60;lat<=60;lat+=30){const y=(90-lat)/180*1024;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(2048,y);ctx.stroke();}for(let lon=-180;lon<=180;lon+=30){const x=(lon+180)/360*2048;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,1024);ctx.stroke();}
  // Sphere UV starts at -X; shift longitude by 90 degrees to match the pins.
  const shifted=document.createElement('canvas');shifted.width=2048;shifted.height=1024;const s=shifted.getContext('2d');s.drawImage(canvas,-512,0);s.drawImage(canvas,1536,0);
  const texture=new THREE.CanvasTexture(shifted);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}

export function conferenceJourney({scene,sourceDocument,getLanguage,onSelect,reducedMotion}){
  const group=new THREE.Group();group.position.y=3.8;group.visible=false;scene.add(group);
  const globe=new THREE.Mesh(new THREE.SphereGeometry(radius,80,48),new THREE.MeshBasicMaterial({color:0xffffff}));group.add(globe);
  const ready=fetch('./assets/conferences/world-110m.json').then(r=>{if(!r.ok)throw new Error('Map unavailable');return r.json();}).then(topology=>{globe.material.map=atlasTexture(topology);globe.material.needsUpdate=true;}).catch(error=>console.warn(error));
  // Soft rim responds to the camera, without washing out the map.
  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(radius*1.02,64,32),new THREE.ShaderMaterial({transparent:true,side:THREE.BackSide,depthWrite:false,uniforms:{color:{value:new THREE.Color(0x81c9e0)}},vertexShader:'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'uniform vec3 color;varying vec3 n;varying vec3 v;void main(){float a=pow(1.-abs(dot(n,v)),3.)*.45;gl_FragColor=vec4(color,a);}'}));group.add(atmosphere);
  const origin={lat:37.57,lon:126.98};const originPin=new THREE.Mesh(new THREE.SphereGeometry(.045,12,10),new THREE.MeshBasicMaterial({color:0xbdd7d8}));originPin.position.copy(locationVector(origin.lat,origin.lon,radius+.04));group.add(originPin);
  const pins=conferences.map(event=>{const pin=new THREE.Mesh(new THREE.SphereGeometry(.067,16,12),new THREE.MeshBasicMaterial({color:0xefaa58}));pin.position.copy(locationVector(event.lat,event.lon,radius+.045));pin.userData.event=event.id;group.add(pin);return pin;});
  const routes=conferences.map(event=>{const points=routePoints(origin,event);const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xd7a15b,transparent:true,opacity:.22}));group.add(line);return {line,points};});
  const plane=airplane();plane.userData.setGear(1);plane.scale.setScalar(.075);group.add(plane);plane.traverse(node=>{if(node.isMesh){node.castShadow=false;node.receiveShadow=false;}});
  let active=0,started=0,request=0;
  const shell=document.querySelector('#journey-view');
  const mapLabels=document.createElement('div');mapLabels.className='conference-map-labels';shell.append(mapLabels);
  const labels=conferences.map(event=>{const button=document.createElement('button');button.className='conference-map-label';button.dataset.mapConference=event.id;button.innerHTML='<strong></strong><small></small>';button.onclick=()=>select(event.id);mapLabels.append(button);return button;});
  async function render(){
    const serial=++request;const lang=getLanguage(),t=words[lang],event=conferences[active];
    document.querySelector('#journey-title').textContent=t.title;document.querySelector('#journey-back').textContent='← '+t.back;document.querySelector('#journey-prev').setAttribute('aria-label',t.prev);document.querySelector('#journey-next').setAttribute('aria-label',t.next);
    document.querySelector('#journey-hint').textContent=t.hint;
    document.querySelector('#conference-name').textContent=event.name;document.querySelector('#conference-city').textContent=event.city[lang];document.querySelector('#conference-date').textContent=event.date[lang]+(event.attended?(lang==='ko'?' · 참석':' · Attended'):'');document.querySelector('#conference-full').textContent=event.full;
    const photo=document.querySelector('#conference-photo');photo.src='./assets/conferences/'+event.photo+'.jpg';photo.alt=event.landmark[lang];
    document.querySelector('#conference-landmark').textContent=event.landmark[lang];
    const credit=document.querySelector('#conference-credit');credit.replaceChildren();const source=document.createElement('a');source.href=event.photoURL;source.textContent=event.author;source.target='_blank';source.rel='noopener noreferrer';const license=document.createElement('a');license.href=event.licenseURL;license.textContent=event.license;license.target='_blank';license.rel='noopener noreferrer';credit.append(source,' · ',license);
    const link=document.querySelector('#conference-source');link.href=event.source;link.textContent=t.event+' ↗';
    document.querySelector('#conference-related').textContent=t.related;
    document.querySelectorAll('button[data-conference]').forEach(b=>{b.classList.toggle('active',b.dataset.conference===event.id);b.setAttribute('aria-pressed',String(b.dataset.conference===event.id));b.querySelector('small').textContent=conferences.find(e=>e.id===b.dataset.conference).city[lang];});
    labels.forEach((button,i)=>{button.querySelector('strong').textContent=conferences[i].name;button.querySelector('small').textContent=conferences[i].city[lang];button.setAttribute('aria-pressed',String(i===active));});
    const papers=document.querySelector('#conference-papers');papers.replaceChildren();
    try{const doc=await sourceDocument();if(serial!==request)return;for(const id of event.papers){const a=[...doc.querySelectorAll('.publication-list a')].find(a=>a.href.includes(id));if(a)papers.append(a.closest('li').cloneNode(true));}}catch{if(serial!==request)return;const a=document.createElement('a');a.href=lang==='ko'?'ko.html':'index.html';a.textContent='CV ↗';papers.append(a);}
  }
  function select(id,fly=true){active=conferences.findIndex(e=>e.id===id);if(active<0)active=0;started=performance.now()/1000;routes.forEach((r,i)=>r.line.material.opacity=i===active?.9:.18);pins.forEach((p,i)=>p.scale.setScalar(i===active?1.4:1));shell.dataset.conference=conferences[active].id;render();if(fly)onSelect(conferences[active]);}
  document.querySelectorAll('button[data-conference]').forEach(button=>button.onclick=()=>select(button.dataset.conference));
  document.querySelector('#journey-prev').onclick=()=>select(conferences[(active+conferences.length-1)%conferences.length].id);
  document.querySelector('#journey-next').onclick=()=>select(conferences[(active+1)%conferences.length].id);
  function animate(time){if(!group.visible)return;const t=reducedMotion?1:THREE.MathUtils.clamp((time-started)/4,0,1);const points=routes[active].points;const i=Math.min(99,Math.floor(t*100));plane.position.copy(points[i]).lerp(points[i+1],Math.min(t*100-i,1));const tangent=points[i+1].clone().sub(points[i]).normalize();plane.up.copy(plane.position).normalize();plane.lookAt(plane.position.clone().add(tangent));plane.visible=t<1;routes[active].line.geometry.setDrawRange(0,Math.max(2,Math.floor(t*100)+1));}
  function updateLabels(camera,width,height,top){if(!group.visible)return;const offsets=[[-157,-67],[15,-52],[16,17]];const view=camera.position.clone().sub(group.position);pins.forEach((pin,i)=>{const world=pin.getWorldPosition(new THREE.Vector3()),normal=world.clone().sub(group.position).normalize(),point=world.clone().project(camera);const x=(point.x*.5+.5)*width,y=(-point.y*.5+.5)*height;const button=labels[i];button.hidden=normal.dot(view)<=radius||point.z>=1||x<0||x>width||y<0||y>height;const [dx,dy]=offsets[i];button.style.left=THREE.MathUtils.clamp(x+dx,6,width-155)+'px';button.style.top=(THREE.MathUtils.clamp(y+dy,6,height-55)+top)+'px';});}
  return {group,pins,ready,render,animate,updateLabels,select,open(){group.visible=true;shell.hidden=false;select(conferences[active].id);},close(){group.visible=false;shell.hidden=true;++request;},get center(){return group.position.clone();}};
}
