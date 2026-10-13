import * as THREE from './vendor/three.module.js';
import { surface, daylightEnvironment, screenTexture, pbrTextures } from './scene-materials.js';
import { sprayRobot } from './spray-robot.js';
import { airplane } from './airplane.js';
import { conferenceJourney } from './conference-journey.js';

const text = {
  en: { introLabel:'Construction, in motion', headline:'The site is<br>my laboratory.', intro:'I study how robots see, understand, and work in the built environment.', explore:'Explore the site <span>↓</span>', about:'About', publications:'Publications', robotics:'Construction robotics', vision:'Computer vision', digital:'Digital construction', roboticsTag:'From motion to execution', visionTag:'From pixels to perception', digitalTag:'From data to the field', sceneLabel:'A field of possibilities', rotate:'Rotate view', reset:'Reset view', hint:'Drag to look around · Select a research point', student:"Master’s student · SeoulTech", projects:'R&D projects', ip:'Patents & software', awards:'Awards', contact:'Get in touch ↗', fallback:'Explore the research areas below.', kind:'Research', related:'Related publications', all:'All publications', cv:'Full CV', loading:'Loading…', loadError:'Please open the full CV to view these records.', roboticsDescription:'Robotic fireproofing spray connects motion planning, spray quality, and the realities of a construction site. My work explores work-area recognition and simulation for robotic execution.', visionDescription:'A camera sees pixels. A robot needs surfaces it can work on. My research uses RGB and RGB-D images to recognize steel members and classify work surfaces for fireproofing spray.', digitalDescription:'From construction inspection to human–robot collaboration, I explore how field data and digital models can support automated construction processes.' },
  ko: { introLabel:'현장에서 시작하는 연구', headline:'공사 현장이<br>나의 연구실.', intro:'로봇이 건설 현장을 보고, 이해하고, 작업하는 방법을 연구합니다.', explore:'현장 탐색하기 <span>↓</span>', about:'소개', publications:'연구 논문', robotics:'건설 로봇', vision:'컴퓨터 비전', digital:'디지털 건설', roboticsTag:'움직임을 실제 작업으로', visionTag:'영상을 현장 인식으로', digitalTag:'데이터를 현장 실행으로', sceneLabel:'연구가 만나는 현장', rotate:'시점 회전', reset:'전체 보기', hint:'드래그로 둘러보기 · 연구 지점 선택하기', student:'서울과학기술대학교 석사과정', projects:'연구과제', ip:'특허·소프트웨어', awards:'수상', contact:'이메일 보내기 ↗', fallback:'아래에서 연구 분야를 탐색하세요.', kind:'연구 분야', related:'관련 논문', all:'전체 논문 보기', cv:'전체 CV', loading:'불러오는 중…', loadError:'전체 CV에서 연구 이력을 확인해 주세요.', roboticsDescription:'내화뿜칠 로봇의 움직임과 분사 품질을 실제 현장 작업에 연결하는 방법을 연구합니다. 작업영역 인식과 분사 시뮬레이션을 통해 로봇의 작업 실행을 다룹니다.', visionDescription:'카메라에 담긴 영상을 로봇이 작업할 수 있는 면으로 바꿉니다. RGB 및 RGB-D 영상으로 철골 부재를 인식하고 내화뿜칠 작업면을 구분하는 기술을 연구합니다.', digitalDescription:'디지털 건축감리부터 인간–로봇 협업까지, 현장 데이터와 디지털 모델을 건설 자동화에 연결하는 방법을 연구합니다.' }
};
let lang = new URLSearchParams(location.search).get('lang') === 'ko' ? 'ko' : 'en';
let currentPanel = null;
let lastFocused = null;
let panelRequest = 0;
let sceneAPI = null;
let journeyOpen = false;
text.en.conferences='International conferences';text.ko.conferences='해외학회';
text.en.hint='Drag to rotate in any direction · Scroll or pinch to zoom';text.ko.hint='드래그로 좌우·상하 회전 · 휠 또는 두 손가락으로 확대·축소';
const panel = document.querySelector('#detail-panel');
const panelBody = document.querySelector('#panel-body');
const docs = new Map();
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function setLanguage(next) {
  lang = next; document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(node => { node.innerHTML = text[lang][node.dataset.i18n]; });
  document.querySelector('#language').textContent = lang === 'en' ? '한국어' : 'English';
  document.querySelector('#panel-language').textContent = lang === 'en' ? '한국어' : 'English';
  document.querySelector('#language').setAttribute('aria-label', lang === 'en' ? 'Switch to Korean' : '영문으로 전환');
  document.querySelector('#cv-link').href = lang === 'ko' ? 'ko.html' : 'index.html';
  document.querySelector('.identity').href = lang === 'ko' ? 'ko.html' : 'index.html';
  document.querySelector('#avatar-link').href = lang === 'ko' ? 'ko.html' : 'index.html';
  document.querySelector('#avatar-label').textContent = lang === 'ko' ? '이상민 · CV' : 'Sangmin Lee · CV';
  document.querySelector('#close-panel').setAttribute('aria-label', lang === 'ko' ? '상세 내용 닫기' : 'Close details');
  document.querySelector('#zoom-in').setAttribute('aria-label',lang==='ko'?'확대':'Zoom in');
  document.querySelector('#zoom-out').setAttribute('aria-label',lang==='ko'?'축소':'Zoom out');
  document.title = lang === 'ko' ? '이상민 — 현장에서 시작하는 연구' : 'Sangmin Lee — Construction, in motion';
  if (currentPanel) renderPanel(currentPanel);
  if (journeyOpen) sceneAPI?.refreshJourney();
}
async function sourceDocument() {
  if (!docs.has(lang)) {
    const language = lang;
    const result = fetch(language === 'ko' ? './ko.html' : './index.html').then(response => {
      if (!response.ok) throw new Error('CV unavailable');
      return response.text();
    }).then(source => new DOMParser().parseFromString(source, 'text/html'));
    docs.set(language, result);
    result.catch(() => docs.delete(language));
  }
  return docs.get(lang);
}
async function renderPanel(kind) {
  const request = ++panelRequest;
  const isResearch = ['robotics','vision','digital'].includes(kind);
  document.querySelector('#panel-kind').textContent = isResearch ? text[lang].kind : 'Sangmin Lee';
  document.querySelector('#panel-title').textContent = text[lang][kind];
  panelBody.textContent = text[lang].loading;
  document.querySelector('.panel-scroll').scrollTop = 0;
  try {
    const doc = await sourceDocument();
    if (request !== panelRequest) return;
    panelBody.replaceChildren();
    if (isResearch) {
      const paragraph = document.createElement('p'); paragraph.className='panel-description'; paragraph.textContent=text[lang][kind+'Description']; panelBody.append(paragraph);
      if (kind === 'digital') panelBody.innerHTML += doc.querySelector('#projects .entry-list').outerHTML;
      else {
        const subtitle=document.createElement('h3'); subtitle.textContent=text[lang].related; panelBody.append(subtitle);
        const list=document.createElement('ol'); list.className='publication-list';
        const identifiers = kind === 'vision' ? ['KJCEM.2026.27.5.135','EC3.2026.436','EC3.2026.451','CCC2025/0052'] : ['buildings16101890','EC3.2026.447','KJCEM.2026.27.5.135'];
        for (const id of identifiers) { const link = [...doc.querySelectorAll('.publication-list a')].find(a=>a.href.includes(id)); if(link) list.append(link.closest('li').cloneNode(true)); }
        panelBody.append(list);
      }
      const more=document.createElement('button'); more.className='panel-action'; more.textContent=text[lang].all+' ↗'; more.onclick=()=>openPanel('publications'); panelBody.append(more);
    } else if (kind === 'about') {
      const intro=document.createElement('div'); intro.className='profile-intro';
      const image=doc.querySelector('.hero-portrait img').cloneNode();image.removeAttribute('width');image.removeAttribute('height');image.className='profile-photo';
      const p=document.createElement('p'); p.className='panel-description'; p.textContent=doc.querySelector('.hero-description').textContent;intro.append(p,image);panelBody.append(intro);
      panelBody.innerHTML += doc.querySelector('.hero-education').outerHTML + doc.querySelector('.hero-links').outerHTML;
      const link=document.createElement('a'); link.className='panel-action'; link.href=lang==='ko'?'ko.html':'index.html'; link.textContent=text[lang].cv+' ↗'; panelBody.append(link);
    } else {
      panelBody.innerHTML=doc.querySelector('#'+kind+' .section-body').innerHTML;
      panelBody.querySelector('.lead')?.remove();
    }
  } catch {
    if(request !== panelRequest) return;
    panelBody.textContent=text[lang].loadError;
    const link=document.createElement('a'); link.className='panel-action'; link.href=lang==='ko'?'ko.html':'index.html'; link.textContent=text[lang].cv; panelBody.append(link);
  }
}
function openPanel(kind) {
  if(journeyOpen) exitJourney();
  if (!currentPanel) lastFocused=document.activeElement;
  currentPanel=kind; panel.hidden=false; document.body.classList.add('panel-open');
  configurePanelInteraction();
  document.querySelectorAll('.research-controls button,.panel-research-nav button').forEach(button=>{button.classList.toggle('active',button.dataset.research===kind);button.setAttribute('aria-pressed',String(button.dataset.research===kind));});
  sceneAPI?.focus(kind); renderPanel(kind); document.querySelector('#close-panel').focus({preventScroll:true});
}
function configurePanelInteraction(){const open=!!currentPanel,modal=innerWidth<=600&&open;panel.setAttribute('aria-modal',String(modal));document.querySelector('main').inert=modal;document.querySelector('header').inert=modal;document.querySelector('.hero-intro').inert=open;document.querySelector('.hotspots').inert=open;document.querySelector('.masthead nav').inert=open;const edge=innerWidth-panel.offsetWidth;document.querySelectorAll('.index-bar button,.index-bar a').forEach(node=>{node.inert=open&&node.getBoundingClientRect().right>edge;});}
window.addEventListener('resize',configurePanelInteraction);
function closePanel() { currentPanel=null; ++panelRequest; panel.hidden=true; document.body.classList.remove('panel-open');configurePanelInteraction();document.querySelectorAll('.research-controls button,.panel-research-nav button').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false');});sceneAPI?.reset(); lastFocused?.focus({preventScroll:true}); }
document.querySelectorAll('[data-open]').forEach(button=>button.onclick=()=>openPanel(button.dataset.open));
document.querySelectorAll('[data-research]').forEach(button=>button.onclick=()=>openPanel(button.dataset.research));
document.querySelector('#language').onclick=()=>setLanguage(lang==='en'?'ko':'en');
document.querySelector('#panel-language').onclick=()=>setLanguage(lang==='en'?'ko':'en');
document.querySelector('#close-panel').onclick=closePanel;
document.querySelector('#explore').onclick=()=>openPanel('robotics');
document.querySelector('#reset').onclick=()=>{ closePanel(); sceneAPI?.reset(); };
document.querySelector('#zoom-in').onclick=()=>sceneAPI?.zoom(.82);
document.querySelector('#zoom-out').onclick=()=>sceneAPI?.zoom(1.22);
function enterJourney(){closePanel();journeyOpen=true;document.body.classList.add('journey-open');sceneAPI?.enterJourney();document.querySelector('#journey-back').focus({preventScroll:true});}
function exitJourney(){journeyOpen=false;document.body.classList.remove('journey-open');sceneAPI?.exitJourney();document.querySelector('#airplane-link').focus({preventScroll:true});}
document.querySelector('#airplane-link').onclick=enterJourney;
document.querySelector('#journey-back').onclick=exitJourney;
document.querySelector('#rotate').onclick=()=>{ const button=document.querySelector('#rotate'); const next=button.getAttribute('aria-pressed')!=='true'; button.setAttribute('aria-pressed',String(next)); sceneAPI?.rotate(next); };
document.addEventListener('keydown',event=>{
  if(journeyOpen&&event.key==='Escape'){exitJourney();return;}
  if(panel.hidden) return;
  if(event.key==='Escape') closePanel();
  if(event.key==='Tab'&&panel.getAttribute('aria-modal')==='true') { const focusable=[...panel.querySelectorAll('button,a[href]')].filter(el=>el.getClientRects().length); const first=focusable[0],last=focusable.at(-1); if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus()} }
});
setLanguage(lang);

function createScene() {
  const container=document.querySelector('#scene');
  const scene=new THREE.Scene(); scene.fog=new THREE.FogExp2(0x233744,.015);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75)); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.05; container.append(renderer.domElement);
  const environment=daylightEnvironment(renderer);scene.environment=environment.texture;
  const camera=new THREE.PerspectiveCamera(37,1,.1,150);
  scene.add(new THREE.HemisphereLight(0xd7dde1,0x60594e,.85));
  const sun=new THREE.DirectionalLight(0xffecd2,3.5); sun.position.set(-12,20,8); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); Object.assign(sun.shadow.camera,{left:-25,right:25,top:25,bottom:-25,near:1,far:70}); sun.shadow.bias=-.0002;sun.shadow.normalBias=.025;sun.shadow.radius=3; scene.add(sun);
  const rim=new THREE.DirectionalLight(0xb8cfdf,.7); rim.position.set(14,10,-10); scene.add(rim);
  const world=new THREE.Group(); scene.add(world);
  const palette={concrete:0xa9a89f,slab:0xbebbb1,steel:0x4d5050,orange:0xb58843,dark:0x242b2e,cyan:0x8ee8f0};
  const concretePBR=pbrTextures('concrete_wall_001');const soilPBR=pbrTextures('brown_mud_02',[22,19]);
  const materialCache=new Map();
  function material(color,options={}) { const key=String(color)+JSON.stringify(options);if(!materialCache.has(key)){const isConcrete=color===palette.concrete||color===palette.slab;const isMetal=[palette.steel,palette.orange,palette.dark].includes(color);materialCache.set(key,new THREE.MeshStandardMaterial({color:isConcrete?0xd4d0c6:color,roughness:isConcrete ? .93 : isMetal ? .42 : .72,metalness:isMetal ? .65 : 0,envMapIntensity:isMetal ? .9 : .45,...(isConcrete?{...concretePBR,normalScale:new THREE.Vector2(.65,.65)}:{}),...options}));}return materialCache.get(key); }
  function box(parent,size,position,color,options={}){ const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material(color,options)); mesh.position.set(...position); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh; }
  function cylinder(parent,radius,length,position,color){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,12),material(color));mesh.position.set(...position);mesh.castShadow=true;parent.add(mesh);return mesh;}
  function roundedBox(parent,size,position,color,radius=.07){const [w,h,d]=size;const r=Math.min(radius,w/4,h/4,d/4);const x=-w/2+r,y=-h/2+r;const shape=new THREE.Shape();shape.moveTo(x,y-r);shape.lineTo(x+w-2*r,y-r);shape.quadraticCurveTo(x+w-r,y-r,x+w-r,y);shape.lineTo(x+w-r,y+h-2*r);shape.quadraticCurveTo(x+w-r,y+h-r,x+w-2*r,y+h-r);shape.lineTo(x,y+h-r);shape.quadraticCurveTo(x-r,y+h-r,x-r,y+h-2*r);shape.lineTo(x-r,y);shape.quadraticCurveTo(x-r,y-r,x,y-r);const geo=new THREE.ExtrudeGeometry(shape,{depth:d-2*r,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:r*.4,bevelThickness:r,curveSegments:6});geo.translate(0,0,-d/2+r);const mesh=new THREE.Mesh(geo,material(color));mesh.position.set(...position);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function beam(parent,start,end,radius,color){const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end);const mesh=cylinder(parent,radius,a.distanceTo(b),a.clone().add(b).multiplyScalar(.5).toArray(),color);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());return mesh;}
  function line(parent,points,color,opacity=1){const geo=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));const mesh=new THREE.Line(geo,new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity}));parent.add(mesh);return mesh;}
  const ground=new THREE.Mesh(new THREE.CircleGeometry(25,96),new THREE.MeshStandardMaterial({color:0xb0a493,...soilPBR,normalScale:new THREE.Vector2(.8,.8),roughness:1,envMapIntensity:.3}));ground.rotation.x=-Math.PI/2;ground.position.y=-.135;ground.receiveShadow=true;world.add(ground);
  box(world,[35,.04,2.7],[0,-.115,11.5],0x3d4141,{map:surface('asphalt'),bumpScale:.02});
  for(let x=-9;x<=9;x+=2.5)box(world,[1.2,.04,.055],[x,-.08,9.8],0x8ca3b0);
  // Open residential structure: slabs, columns, steel beams, and a cutaway facade.
  const building=new THREE.Group(); building.position.set(1.3,0,-.8);world.add(building);
  for(let floor=0;floor<=6;floor++) {
    const y=floor*1.65;
    box(building,[7.4,.16,5.8],[0,y,0],palette.slab);
    if(floor===6)continue;
    for(const x of [-3.3,0,3.3])for(const z of [-2.5,0,2.5])box(building,[.27,1.45,.27],[x,y+.83,z],palette.concrete);
    box(building,[.18,1.5,5.35],[3.45,y+.86,0],palette.concrete);
    for(let z=-1.8;z<2.5;z+=1.5){box(building,[.025,1.05,1.15],[3.56,y+.88,z],0x324347,{metalness:.85,roughness:.17,envMapIntensity:1.5});for(const dz of [-.58,0,.58])box(building,[.04,1.1,.035],[3.58,y+.88,z+dz],0x20292d);}
    for(let x=-2.7;x<3;x+=1.5){box(building,[1.2,.9,.035],[x,y+.9,-2.83],0x344349,{metalness:.85,roughness:.18,envMapIntensity:1.5});box(building,[.1,1.45,.11],[x+.68,y+.85,-2.82],palette.concrete);}
    for(const z of [-2.5,2.5])box(building,[6.8,.15,.18],[0,y+1.5,z],palette.steel);
    if(floor<4) {box(building,[.13,1.4,2.7],[-.8,y+.8,-1.1],palette.concrete);box(building,[1.3,1.4,.13],[-2.3,y+.8,-.4],palette.concrete);box(building,[2.35,1.35,.17],[2.1,y+.78,2.67],palette.concrete);box(building,[1.15,.7,.025],[2.1,y+.89,2.77],0x324347,{metalness:.8,roughness:.19});}
    if(floor>3){line(building,[[-3.6,y+.6,2.9],[3.6,y+.6,2.9]],palette.orange);for(let x=-3.6;x<4;x+=1.2)box(building,[.035,.7,.035],[x,y+.35,2.9],palette.orange);}
  }
  box(building,[2,1.15,1.8],[-1.8,10.65,-1],palette.concrete);
  // Unfinished core, exposed reinforcement, scaffolding and formwork.
  for(const x of [-3.3,0,3.3])for(const z of [-2.5,2.5])for(const dx of [-.06,.06])beam(building,[x+dx,9.9,z],[x+dx,10.65,z],.015,0x6b4d35);
  for(let y=.25;y<10;y+=1.65){box(building,[.8,.07,5.9],[4,y,0],0x74736b);for(const z of [-2.8,0,2.8]){beam(building,[4.3,y,z],[4.3,y+1.65,z],.025,0x9a9a92);beam(building,[3.8,y,z],[4.3,y+1.65,z],.02,0x9a9a92);}line(building,[[4.3,y+.9,-2.8],[4.3,y+.9,2.8]],0x92958b);}
  for(let i=0;i<8;i++)box(building,[.11,1.32,.11],[-3+i*.83,9.1,2.49],0x79715e);
  for(let i=0;i<3;i++)box(building,[1.2,.04,.7],[1.7,10.05,-1.5+i*.9],0x263e51);
  // Tower crane with a trussed jib.
  const crane=new THREE.Group();crane.position.set(-6.3,0,-3.8);world.add(crane);
  box(crane,[2,.35,2],[0,.03,0],palette.concrete);
  for(let y=0;y<13;y+=1){for(const x of [-.38,.38])for(const z of [-.38,.38])box(crane,[.075,1,.075],[x,y+.5,z],palette.orange);beam(crane,[-.38,y,-.38],[.38,y+1,-.38],.032,palette.orange);beam(crane,[.38,y,.38],[-.38,y+1,.38],.032,palette.orange);}
  box(crane,[12,.12,.8],[3.5,12.9,0],palette.orange);box(crane,[12,.12,.8],[3.5,13.7,0],palette.orange);
  for(let x=-2;x<9.5;x+=1){beam(crane,[x,12.9,.35],[x+1,13.7,.35],.045,palette.orange);beam(crane,[x,13.7,-.35],[x+1,12.9,-.35],.045,palette.orange);}
  box(crane,[1,.95,.8],[.55,12.5,.65],0xabc3cd);box(crane,[1.7,.65,1.2],[-1.5,13.3,0],palette.concrete);
  beam(crane,[0,15,0],[-2.4,13.7,0],.025,0x748c99);beam(crane,[0,15,0],[9.4,13.7,0],.025,0x748c99);beam(crane,[0,13.7,0],[0,15,0],.07,palette.orange);
  const hoist=new THREE.Group();crane.add(hoist);line(hoist,[[6.6,12.9,0],[6.6,7,0]],0x8ba5b5);box(hoist,[1.3,.35,.55],[6.6,6.85,0],palette.steel);
  // Lift and material handling zone.
  box(world,[1.15,9,.9],[5.7,4.5,-1.7],0x506779);
  for(let y=.5;y<9;y+=.7){beam(world,[5.2,y,-1.2],[6.2,y+.7,-1.2],.025,0xe8a459);}
  box(world,[1.5,1.4,1.3],[5.7,3.4,-1.2],palette.orange);box(world,[1.15,.9,.08],[5.7,3.5,-.51],0x304b5c);
  const fireproofBeam=new THREE.Group();fireproofBeam.name='Exposed H-section work surface';fireproofBeam.position.set(-1.4,1.43,2.5);building.add(fireproofBeam);
  box(fireproofBeam,[3.6,.04,.34],[0,.225,0],palette.steel);
  box(fireproofBeam,[3.6,.04,.34],[0,-.225,0],palette.steel);
  const fireproofWeb=box(fireproofBeam,[3.6,.43,.032],[0,0,0],palette.steel);
  const sprayer=sprayRobot({parent:world,position:[-.8,0,3.4],reducedMotion:reduceMotion,target:fireproofWeb});
  const robot=sprayer.group;
  sprayer.ready.then(()=>{document.body.dataset.robot='ready';}).catch(()=>{document.body.dataset.robot='error';});
  // RGB-D camera and its projected recognition surface.
  const sensor=new THREE.Group();sensor.position.set(7.4,0,5);world.add(sensor);
  for(const x of [-.4,.4])beam(sensor,[0,1.6,0],[x,0,.25],.035,palette.slab);beam(sensor,[0,1.6,0],[0,0,-.5],.035,palette.slab);
  roundedBox(sensor,[1.05,.25,.27],[0,1.8,0],0xbfc3c0,.035);
  for(const x of [-.4,.4]){const lens=cylinder(sensor,.115,.07,[x,1.8,.18],palette.dark);lens.rotation.x=Math.PI/2;}
  const positions=[];
  for(let i=0;i<250;i++){const x=-2.2+(i%25)*.19;const y=.6+Math.floor(i/25)*.23;positions.push(x,y,2.16);}
  const pointsGeo=new THREE.BufferGeometry();pointsGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  const points=new THREE.Points(pointsGeo,new THREE.PointsMaterial({color:palette.cyan,size:.045,transparent:true,opacity:.8}));world.add(points);
  const scan=new THREE.Mesh(new THREE.PlaneGeometry(4.6,.025),new THREE.MeshBasicMaterial({color:palette.cyan,transparent:true,opacity:.75,side:THREE.DoubleSide}));scan.position.set(.05,1,2.18);world.add(scan);
  for(const end of [[-2.2,.6,2.16],[2.3,.6,2.16],[2.3,2.7,2.16],[-2.2,2.7,2.16]])line(world,[[7.4,1.8,5],end],0x70d9e5,.14);
  line(world,[[-2.2,.6,2.18],[2.3,.6,2.18],[2.3,2.7,2.18],[-2.2,2.7,2.18],[-2.2,.6,2.18]],palette.cyan,.5);
  // Cutaway field office: the seated researcher is the entrance to the full CV.
  const researcher=new THREE.Group();researcher.position.set(-7.8,0,5.25);researcher.scale.setScalar(1.2);world.add(researcher);
  box(researcher,[4.15,.14,3.35],[0,.015,0],palette.slab);
  box(researcher,[4.05,2.4,.12],[0,1.25,-1.5],0x8e9693);
  box(researcher,[.12,2.4,1.5],[2,1.25,-.8],0x8e9693);
  for(let x=-1.8;x<2;x+=.2)box(researcher,[.018,2.3,.015],[x,1.25,-1.424],0x747e7c);
  box(researcher,[1.3,.85,.03],[-.85,1.65,-1.412],0x445e68,{roughness:.17,metalness:.8});
  for(const x of [-1.49,-.85,-.2])box(researcher,[.024,.89,.035],[x,1.65,-1.38],0xc7c9c0);
  box(researcher,[2.2,.09,1.05],[0,.85,-.38],0x8b7659);
  for(const x of [-.96,.96])for(const z of [-.8,.03])box(researcher,[.045,.77,.045],[x,.42,z],0x373e3e);
  // Screen bezel, support, keyboard, and desk details.
  roundedBox(researcher,[.85,.57,.05],[.43,1.23,-.65],0x1b252b,.01);
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(.78,.49),new THREE.MeshStandardMaterial({map:screenTexture(),emissive:0xffffff,emissiveMap:screenTexture(),emissiveIntensity:.65,roughness:.2}));screen.position.set(.43,1.23,-.617);researcher.add(screen);
  box(researcher,[.045,.19,.045],[.43,.91,-.68],0x3d4548);box(researcher,[.33,.025,.2],[.43,.9,-.66],0x353f43);
  box(researcher,[.48,.035,.17],[.34,.915,-.22],0x343c3e);for(let i=0;i<9;i++)box(researcher,[.025,.007,.12],[.15+i*.05,.937,-.22],0x777f7e);
  box(researcher,[.3,.025,.4],[-.8,.915,-.4],0xd9d8cd);cylinder(researcher,.07,.16,[.95,.98,-.63],0xe4e1d4);
  const avatar=new THREE.Group();avatar.position.set(-.45,0,.57);avatar.rotation.y=.2;researcher.add(avatar);
  function ellipsoid(parent,scale,position,color){const m=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),material(color));m.scale.set(...scale);m.position.set(...position);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  cylinder(avatar,.07,.4,[0,.28,.1],0x373f42);box(avatar,[.48,.08,.42],[0,.53,.1],0x263334);box(avatar,[.47,.53,.09],[0,.85,.34],0x263334);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;beam(avatar,[0,.11,.1],[Math.sin(a)*.34,.1,.1+Math.cos(a)*.34],.022,0x555d5f);const wheel=cylinder(avatar,.042,.055,[Math.sin(a)*.34,.075,.1+Math.cos(a)*.34],0x1c272c);wheel.rotation.z=Math.PI/2;}
  ellipsoid(avatar,[.22,.34,.15],[0,.91,0],0x354957);
  ellipsoid(avatar,[.18,.13,.16],[0,.58,-.015],0x2a333b);
  for(const x of [-.125,.125]){beam(avatar,[x,.58,0],[x,.53,-.35],.073,0x34414b);beam(avatar,[x,.53,-.35],[x,.15,-.36],.065,0x34414b);ellipsoid(avatar,[.082,.055,.16],[x,.1,-.44],0x242a2d);}
  cylinder(avatar,.055,.1,[0,1.26,-.035],0xb5927a);
  ellipsoid(avatar,[.135,.175,.14],[0,1.43,-.045],0xc2a38c);
  // A fitted hard hat and small, human proportions rather than block geometry.
  const hat=new THREE.Mesh(new THREE.SphereGeometry(.155,24,16,0,Math.PI*2,0,Math.PI/2),material(0xdfded3));hat.position.set(0,1.46,-.045);hat.scale.y=.72;avatar.add(hat);ellipsoid(avatar,[.18,.016,.18],[0,1.46,-.07],0xd5d4ca);
  for(const x of [-.215,.215]){ellipsoid(avatar,[.075,.12,.08],[x,1.12,0],0x354957);beam(avatar,[x,1.1,-.01],[x*.9,.91,-.25],.053,0x354957);beam(avatar,[x*.9,.91,-.25],[x*.6,.9,-.58],.045,0x354957);ellipsoid(avatar,[.044,.023,.069],[x*.6,.912,-.59],0xc2a38c);}
  const workLight=new THREE.PointLight(0xffe3b7,1.1,5);workLight.position.set(-.3,2,-.3);researcher.add(workLight);
  // A modest airliner on the road in front of the field office.
  const parkedPlane=airplane();parkedPlane.position.set(-7.5,0,11.5);parkedPlane.rotation.y=Math.PI/2;parkedPlane.scale.setScalar(.9);world.add(parkedPlane);
  // Material stacks, site fencing, and neighboring apartment facades.
  for(let i=0;i<4;i++)box(world,[2,.12,.28],[-7.7,.16+i*.13,1.8],palette.steel);
  for(let i=0;i<4;i++)box(world,[.75,.35,.75],[7.7,.2+i*.36,-5],0x83949b);
  for(let x=-13;x<14;x+=1.5){box(world,[.045,1.05,.045],[x,.5,-10.3],0x68808d);}
  line(world,[[-13,1,-10.3],[13,1,-10.3]],0x68808d);
  for(const pos of [[-10,-6.5],[10,-7.5]]) {box(world,[3,6,3],[pos[0],3,pos[1]],palette.concrete);for(let y=.6;y<6;y+=.9)for(const x of [-.85,0,.85]){box(world,[.5,.58,.025],[pos[0]+x,y,pos[1]+1.51],0x364b50,{metalness:.8,roughness:.2});box(world,[.58,.035,.12],[pos[0]+x,y-.3,pos[1]+1.53],0x8d928d);}}
  const leafGeometry=new THREE.SphereGeometry(1,5,4);const leaves=new THREE.InstancedMesh(leafGeometry,material(0x515e42,{roughness:1}),1000);const leafMatrix=new THREE.Matrix4();let leafIndex=0;
  for(const [x,z] of [[-12,1],[-12,-3],[12,5],[12,1],[11,-3]]){cylinder(world,.07,1.7,[x,.72,z],0x62584a);for(let j=0;j<4;j++){const a=j*1.8;beam(world,[x,1,z],[x+Math.sin(a)*.5,1.8,z+Math.cos(a)*.5],.025,0x62584a);}for(let i=0;i<200;i++){const a=i*2.39996,r=.65*Math.sqrt((i+.5)/200);const dx=Math.cos(a)*r,dz=Math.sin(a)*r,dy=.7*Math.sin(i*8.3);leafMatrix.compose(new THREE.Vector3(x+dx,2+dy,z+dz),new THREE.Quaternion().setFromEuler(new THREE.Euler(i*.43,i*.73,0)),new THREE.Vector3(.12,.045,.09));leaves.setMatrixAt(leafIndex++,leafMatrix);leaves.setColorAt(leafIndex-1,new THREE.Color().setHSL(.21+(i%5)*.005,.18,.18+(i%9)*.014));}}
  leaves.castShadow=true;world.add(leaves);
  // A warm path visually connects perception, execution, and the building.
  const path=new THREE.CatmullRomCurve3([[-9,.025,7.7],[-5,.025,7.7],[-3.8,.025,5.3],[1.5,.025,5.7],[7.4,.025,6.2],[9,.025,2]].map(p=>new THREE.Vector3(...p)));
  world.add(new THREE.Mesh(new THREE.TubeGeometry(path,80,.023,6,false),new THREE.MeshBasicMaterial({color:0xdea866})));
  const trail=new THREE.Mesh(new THREE.SphereGeometry(.07,12,12),new THREE.MeshBasicMaterial({color:0xffda8c}));world.add(trail);
  const light=new THREE.PointLight(0x9cecf5,4,10);light.position.set(0,2.6,2.8);scene.add(light);
  const hotspotAnchors={robotics:new THREE.Vector3(-.8,2.7,3.4),vision:new THREE.Vector3(7.4,3.8,5),digital:new THREE.Vector3(3,8.4,1.8),avatar:new THREE.Vector3(-7.8,2.8,5.25),airplane:new THREE.Vector3(-7.5,1.1,11.5)};
  const hotspotButtons=[...document.querySelectorAll('.hotspot')];
  let width=1,height=1,mobile=false,autoRotate=false,drag=false,moved=false,angle=.61,targetAngle=.61,pitch=.52,targetPitch=.52,distance=38,targetDistance=38;
  const lookAt=new THREE.Vector3(-4,4,0),targetLook=new THREE.Vector3(-4,4,0);
  const journey=conferenceJourney({scene,sourceDocument,getLanguage:()=>lang,reducedMotion:reduceMotion,onSelect(event){const desired=THREE.MathUtils.degToRad(event.lon);targetAngle+=Math.atan2(Math.sin(desired-targetAngle),Math.cos(desired-targetAngle));targetPitch=THREE.MathUtils.degToRad(event.lat)*.8;targetDistance=mobile?12:13;targetLook.copy(journey.center);}});
  function reset(){if(journeyOpen){journey.select(document.querySelector('#journey-view').dataset.conference);autoRotate=false;}else{targetAngle=.61;targetPitch=.52;targetDistance=mobile?45:38;targetLook.set(mobile?0:-4, mobile?5:4,0);autoRotate=false;}document.querySelector('#rotate').setAttribute('aria-pressed','false');}
  function zoom(factor){targetDistance=THREE.MathUtils.clamp(targetDistance*factor,journeyOpen?8:9,journeyOpen?22:65);}
  function focus(kind){const point=hotspotAnchors[kind]||new THREE.Vector3(1,5,0);targetAngle=.5;targetPitch=.4;targetDistance=kind==='robotics'?15:kind==='vision'?23:31;targetLook.copy(point).add(new THREE.Vector3(kind==='robotics'?5:9,0,0));autoRotate=false;}
  function resize(){width=container.clientWidth;height=container.clientHeight;mobile=width<=600;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();reset();if(mobile){lookAt.copy(targetLook);distance=targetDistance;}if(currentPanel)focus(currentPanel);}
  const observer=new ResizeObserver(resize);observer.observe(container);
  const pointers=new Map();let pinchDistance=0,dragTravel=0;
  renderer.domElement.addEventListener('pointerdown',event=>{if(event.button>0)return;drag=true;if(!pointers.size){moved=false;dragTravel=0;}pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(pointers.size===2){const [a,b]=[...pointers.values()];pinchDistance=Math.hypot(a.x-b.x,a.y-b.y);moved=true;}renderer.domElement.setPointerCapture(event.pointerId);});
  renderer.domElement.addEventListener('pointermove',event=>{const last=pointers.get(event.pointerId);if(!last)return;const dx=event.clientX-last.x,dy=event.clientY-last.y;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});dragTravel+=Math.hypot(dx,dy);if(dragTravel>5)moved=true;if(pointers.size===2){const [a,b]=[...pointers.values()],next=Math.hypot(a.x-b.x,a.y-b.y);if(next>0&&pinchDistance>0)zoom(pinchDistance/next);pinchDistance=next;}else{targetAngle-=dx*.005;targetPitch=THREE.MathUtils.clamp(targetPitch+dy*.005,-.45,1.48);}});
  function release(event){pointers.delete(event.pointerId);drag=pointers.size>0;pinchDistance=0;if(renderer.domElement.hasPointerCapture(event.pointerId))renderer.domElement.releasePointerCapture(event.pointerId);}
  renderer.domElement.addEventListener('pointerup',release);renderer.domElement.addEventListener('pointercancel',release);
  document.querySelector('.world').addEventListener('wheel',event=>{if(event.target.closest('.journey-card,.research-controls,.journey-stops,.hero-intro'))return;event.preventDefault();zoom(Math.exp(THREE.MathUtils.clamp(event.deltaY,-300,300)*.0015));},{passive:false});
  const raycaster=new THREE.Raycaster();const pointer=new THREE.Vector2();
  renderer.domElement.addEventListener('click',event=>{if(moved||currentPanel)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);if(journeyOpen){const hit=raycaster.intersectObjects(journey.pins)[0];if(hit)journey.select(hit.object.userData.event);return;}const hits=[];for(const [group,kind] of [[researcher,'avatar'],[parkedPlane,'airplane'],[robot,'robotics'],[sensor,'vision'],[building,'digital'],[crane,'digital']]){const hit=raycaster.intersectObject(group,true)[0];if(hit)hits.push({distance:hit.distance,kind});}hits.sort((a,b)=>a.distance-b.distance);if(hits[0]?.kind==='avatar'){location.assign(document.querySelector('#avatar-link').href);}else if(hits[0]?.kind==='airplane')enterJourney();else if(hits.length)openPanel(hits[0].kind);});
  let previous=performance.now();
  function animate(now){const delta=Math.min((now-previous)/1000,.05);previous=now;const t=now/1000;
    if(autoRotate&&!drag&&!currentPanel)targetAngle+=delta*.1;
    const factor=reduceMotion?1:1-Math.exp(-delta*4.5);angle=THREE.MathUtils.lerp(angle,targetAngle,factor);pitch=THREE.MathUtils.lerp(pitch,targetPitch,factor);distance=THREE.MathUtils.lerp(distance,targetDistance,factor);lookAt.lerp(targetLook,factor);
    camera.position.set(lookAt.x+Math.sin(angle)*Math.cos(pitch)*distance,lookAt.y+Math.sin(pitch)*distance,lookAt.z+Math.cos(angle)*Math.cos(pitch)*distance);camera.lookAt(lookAt);
    if(journeyOpen&&!mobile)camera.setViewOffset(width,height,width*.15,0,width,height);else if(mobile&&!journeyOpen)camera.setViewOffset(width,height,0,-height*.015,width,height);else camera.clearViewOffset();
    if(!reduceMotion){scan.position.y=.6+(Math.sin(t*.7)*.5+.5)*2.1;trail.position.copy(path.getPointAt((t*.035)%1));hoist.position.y=Math.sin(t*.3)*.18;}
    sprayer.animate(t);
    journey.animate(t);
    container.dataset.view=journeyOpen?'journey':'site';container.dataset.orbitPitch=String(pitch);container.dataset.orbitAngle=String(angle);container.dataset.orbitDistance=String(distance);
    if(robot.userData.loaded){container.dataset.robotJoints=robot.userData.joints;container.dataset.robotNozzle=String(robot.userData.nozzle);container.dataset.robotSpraying=String(robot.userData.spraying);container.dataset.robotMotion=String(robot.userData.animationTime||0);container.dataset.sprayDistance=String(robot.userData.sprayDistance||0);container.dataset.nozzlePosition=JSON.stringify(robot.userData.nozzlePosition||[]);}
    renderer.render(scene,camera);
    hotspotButtons.forEach(button=>{const point=hotspotAnchors[button.dataset.research||button.dataset.sceneKey].clone().project(camera);const x=(point.x*.5+.5)*width,y=(-point.y*.5+.5)*height;const valid=point.z<1&&x>0&&x<width&&y>0&&y<height;button.style.visibility=valid?'visible':'hidden';const labelWidth=button.offsetWidth||150;button.style.transform=`translate(${Math.min(Math.max(x-10,8),width-labelWidth-8)}px,${y+container.offsetTop-10}px)`;});
  }
  renderer.setAnimationLoop(animate);resize();lookAt.copy(targetLook);
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();document.querySelector('.scene-fallback').hidden=false;document.querySelector('#hotspots').hidden=true;});
  return {reset,focus,zoom,rotate(value){autoRotate=value;},refreshJourney(){journey.render();},enterJourney(){world.visible=false;scene.fog=null;journey.open();},exitJourney(){journey.close();world.visible=true;scene.fog=new THREE.FogExp2(0x233744,.015);reset();}};
}
try {sceneAPI=createScene();}catch(error){console.warn('3D scene unavailable',error);document.querySelector('.scene-fallback').hidden=false;document.querySelector('#hotspots').hidden=true;}
