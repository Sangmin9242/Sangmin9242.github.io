import * as THREE from './vendor/three.module.js';

const text = {
  en: { introLabel:'Construction, in motion', headline:'The site is<br>my laboratory.', intro:'I study how robots see, understand, and work in the built environment.', explore:'Explore the site <span>↓</span>', about:'About', publications:'Publications', robotics:'Construction robotics', vision:'Computer vision', digital:'Digital construction', roboticsTag:'From motion to execution', visionTag:'From pixels to perception', digitalTag:'From data to the field', sceneLabel:'A field of possibilities', rotate:'Rotate view', reset:'Reset view', hint:'Drag to look around · Select a research point', student:"Master’s student · SeoulTech", projects:'R&D projects', ip:'Patents & software', awards:'Awards', contact:'Get in touch ↗', fallback:'Explore the research areas below.', kind:'Research', related:'Related publications', all:'All publications', cv:'Full CV', loading:'Loading…', loadError:'Please open the full CV to view these records.', roboticsDescription:'Robotic fireproofing spray connects motion planning, spray quality, and the realities of a construction site. My work explores work-area recognition and simulation for robotic execution.', visionDescription:'A camera sees pixels. A robot needs surfaces it can work on. My research uses RGB and RGB-D images to recognize steel members and classify work surfaces for fireproofing spray.', digitalDescription:'From construction inspection to human–robot collaboration, I explore how field data and digital models can support automated construction processes.' },
  ko: { introLabel:'현장에서 시작하는 연구', headline:'공사 현장이<br>나의 연구실.', intro:'로봇이 건설 현장을 보고, 이해하고, 작업하는 방법을 연구합니다.', explore:'현장 탐색하기 <span>↓</span>', about:'소개', publications:'연구 논문', robotics:'건설 로봇', vision:'컴퓨터 비전', digital:'디지털 건설', roboticsTag:'움직임을 실제 작업으로', visionTag:'영상을 현장 인식으로', digitalTag:'데이터를 현장 실행으로', sceneLabel:'연구가 만나는 현장', rotate:'시점 회전', reset:'전체 보기', hint:'드래그로 둘러보기 · 연구 지점 선택하기', student:'서울과학기술대학교 석사과정', projects:'연구과제', ip:'특허·소프트웨어', awards:'수상', contact:'이메일 보내기 ↗', fallback:'아래에서 연구 분야를 탐색하세요.', kind:'연구 분야', related:'관련 논문', all:'전체 논문 보기', cv:'전체 CV', loading:'불러오는 중…', loadError:'전체 CV에서 연구 이력을 확인해 주세요.', roboticsDescription:'내화뿜칠 로봇의 움직임과 분사 품질을 실제 현장 작업에 연결하는 방법을 연구합니다. 작업영역 인식과 분사 시뮬레이션을 통해 로봇의 작업 실행을 다룹니다.', visionDescription:'카메라에 담긴 영상을 로봇이 작업할 수 있는 면으로 바꿉니다. RGB 및 RGB-D 영상으로 철골 부재를 인식하고 내화뿜칠 작업면을 구분하는 기술을 연구합니다.', digitalDescription:'디지털 건축감리부터 인간–로봇 협업까지, 현장 데이터와 디지털 모델을 건설 자동화에 연결하는 방법을 연구합니다.' }
};
let lang = new URLSearchParams(location.search).get('lang') === 'ko' ? 'ko' : 'en';
let currentPanel = null;
let lastFocused = null;
let panelRequest = 0;
let sceneAPI = null;
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
  document.querySelector('#cv-link').href = lang === 'ko' ? 'cv-ko.html' : 'cv.html';
  document.querySelector('#close-panel').setAttribute('aria-label', lang === 'ko' ? '상세 내용 닫기' : 'Close details');
  document.title = lang === 'ko' ? '이상민 — 현장에서 시작하는 연구' : 'Sangmin Lee — Construction, in motion';
  if (currentPanel) renderPanel(currentPanel);
}
async function sourceDocument() {
  if (!docs.has(lang)) {
    const language = lang;
    const result = fetch(language === 'ko' ? './cv-ko.html' : './cv.html').then(response => {
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
      const image=doc.querySelector('.hero-portrait img').cloneNode(); image.className='profile-photo'; panelBody.append(image);
      const p=document.createElement('p'); p.className='panel-description'; p.textContent=doc.querySelector('.hero-description').textContent; panelBody.append(p);
      panelBody.innerHTML += doc.querySelector('.hero-education').outerHTML + doc.querySelector('.hero-links').outerHTML;
      const link=document.createElement('a'); link.className='panel-action'; link.href=lang==='ko'?'cv-ko.html':'cv.html'; link.textContent=text[lang].cv+' ↗'; panelBody.append(link);
    } else {
      panelBody.innerHTML=doc.querySelector('#'+kind+' .section-body').innerHTML;
      panelBody.querySelector('.lead')?.remove();
    }
  } catch {
    if(request !== panelRequest) return;
    panelBody.textContent=text[lang].loadError;
    const link=document.createElement('a'); link.className='panel-action'; link.href=lang==='ko'?'cv-ko.html':'cv.html'; link.textContent=text[lang].cv; panelBody.append(link);
  }
}
function openPanel(kind) {
  if (!currentPanel) lastFocused=document.activeElement;
  currentPanel=kind; panel.hidden=false; document.body.classList.add('panel-open');
  document.querySelector('main').inert=true;document.querySelector('header').inert=true;
  document.querySelectorAll('.research-controls button').forEach(button=>button.classList.toggle('active',button.dataset.research===kind));
  sceneAPI?.focus(kind); renderPanel(kind); document.querySelector('#close-panel').focus({preventScroll:true});
}
function closePanel() { currentPanel=null; ++panelRequest; panel.hidden=true; document.body.classList.remove('panel-open');document.querySelector('main').inert=false;document.querySelector('header').inert=false; document.querySelectorAll('.research-controls button').forEach(b=>b.classList.remove('active')); sceneAPI?.reset(); lastFocused?.focus({preventScroll:true}); }
document.querySelectorAll('[data-open]').forEach(button=>button.onclick=()=>openPanel(button.dataset.open));
document.querySelectorAll('[data-research]').forEach(button=>button.onclick=()=>openPanel(button.dataset.research));
document.querySelector('#language').onclick=()=>setLanguage(lang==='en'?'ko':'en');
document.querySelector('#panel-language').onclick=()=>setLanguage(lang==='en'?'ko':'en');
document.querySelector('#close-panel').onclick=closePanel;
document.querySelector('#explore').onclick=()=>openPanel('robotics');
document.querySelector('#reset').onclick=()=>{ closePanel(); sceneAPI?.reset(); };
document.querySelector('#rotate').onclick=()=>{ const button=document.querySelector('#rotate'); const next=button.getAttribute('aria-pressed')!=='true'; button.setAttribute('aria-pressed',String(next)); sceneAPI?.rotate(next); };
document.addEventListener('keydown',event=>{
  if(panel.hidden) return;
  if(event.key==='Escape') closePanel();
  if(event.key==='Tab') { const focusable=[...panel.querySelectorAll('button,a[href]')].filter(el=>!el.hidden); const first=focusable[0],last=focusable.at(-1); if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus()} }
});
setLanguage(lang);

function createScene() {
  const container=document.querySelector('#scene');
  const scene=new THREE.Scene(); scene.fog=new THREE.FogExp2(0x102738,.011);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75)); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.3; container.append(renderer.domElement);
  const camera=new THREE.PerspectiveCamera(37,1,.1,150);
  scene.add(new THREE.HemisphereLight(0xbad8f1,0x283d4c,2.1));
  const sun=new THREE.DirectionalLight(0xffe7cb,3.2); sun.position.set(-8,22,12); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); Object.assign(sun.shadow.camera,{left:-25,right:25,top:25,bottom:-25,near:1,far:60}); sun.shadow.bias=-.0006; scene.add(sun);
  const rim=new THREE.DirectionalLight(0x6cbfe8,2.3); rim.position.set(14,10,-10); scene.add(rim);
  const world=new THREE.Group(); scene.add(world);
  const palette={concrete:0xaab9c4,slab:0xc8d4db,steel:0x495e6b,orange:0xe99f47,dark:0x233849,cyan:0x8ee8f0};
  const materialCache=new Map();
  function material(color,options={}) { const key=String(color)+JSON.stringify(options); if(!materialCache.has(key)) materialCache.set(key,new THREE.MeshStandardMaterial({color,roughness:.72,metalness:.12,...options})); return materialCache.get(key); }
  function box(parent,size,position,color,options={}){ const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material(color,options)); mesh.position.set(...position); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh; }
  function cylinder(parent,radius,length,position,color){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,12),material(color));mesh.position.set(...position);mesh.castShadow=true;parent.add(mesh);return mesh;}
  function beam(parent,start,end,radius,color){const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end);const mesh=cylinder(parent,radius,a.distanceTo(b),a.clone().add(b).multiplyScalar(.5).toArray(),color);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());return mesh;}
  function line(parent,points,color,opacity=1){const geo=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));const mesh=new THREE.Line(geo,new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity}));parent.add(mesh);return mesh;}
  const ground=box(world,[29,.45,23],[0,-.36,0],0x284151);ground.receiveShadow=true;
  const grid=new THREE.GridHelper(40,40,0x486075,0x294052);grid.position.y=-.105;scene.add(grid);
  box(world,[22,.035,1.4],[0,-.11,9.8],0x1c303e);
  for(let x=-9;x<=9;x+=2.5)box(world,[1.2,.04,.055],[x,-.08,9.8],0x8ca3b0);
  // Open residential structure: slabs, columns, steel beams, and a cutaway facade.
  const building=new THREE.Group(); building.position.set(1.3,0,-.8);world.add(building);
  for(let floor=0;floor<=6;floor++) {
    const y=floor*1.65;
    box(building,[7.4,.2,5.8],[0,y,0],palette.slab);
    if(floor===6)continue;
    for(const x of [-3.3,0,3.3])for(const z of [-2.5,0,2.5])box(building,[.27,1.45,.27],[x,y+.83,z],palette.concrete);
    box(building,[.18,1.5,5.35],[3.45,y+.86,0],0x8dabbc);
    for(let x=-2.7;x<3;x+=1.5){box(building,[1.2,.9,.06],[x,y+.9,-2.83],0x486f85,{metalness:.35,roughness:.3});box(building,[.1,1.45,.11],[x+.68,y+.85,-2.82],palette.concrete);}
    for(const z of [-2.5,2.5])box(building,[6.8,.15,.18],[0,y+1.5,z],palette.steel);
    if(floor<4) {box(building,[.13,1.4,2.7],[-.8,y+.8,-1.1],palette.concrete);box(building,[1.3,1.4,.13],[-2.3,y+.8,-.4],palette.concrete);}
    if(floor>3){line(building,[[-3.6,y+.6,2.9],[3.6,y+.6,2.9]],palette.orange);for(let x=-3.6;x<4;x+=1.2)box(building,[.035,.7,.035],[x,y+.35,2.9],palette.orange);}
  }
  box(building,[2,1.6,1.8],[-1.8,10.9,-1],palette.slab);
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
  const robot=new THREE.Group();robot.position.set(-3.7,0,4.1);world.add(robot);
  box(robot,[1.8,.4,1.3],[0,.45,0],palette.orange);box(robot,[1.1,.42,1.1],[0,.85,0],palette.slab);
  for(const x of [-.83,.83])for(const z of [-.44,.44]){const wheel=cylinder(robot,.28,.18,[x,.3,z],0x162936);wheel.rotation.z=Math.PI/2;}
  cylinder(robot,.28,.35,[0,1.2,0],palette.dark);
  const arm=new THREE.Group();arm.position.y=1.3;robot.add(arm);
  beam(arm,[0,0,0],[.2,1.3,0],.16,palette.orange);beam(arm,[.2,1.3,0],[1.15,2.3,-.3],.13,palette.slab);beam(arm,[1.15,2.3,-.3],[1.7,2.1,-.45],.1,palette.orange);
  for(const point of [[0,0,0],[.2,1.3,0],[1.15,2.3,-.3]]){const joint=new THREE.Mesh(new THREE.SphereGeometry(.21,16,12),material(palette.dark));joint.position.set(...point);arm.add(joint);}
  beam(arm,[1.7,2.1,-.45],[2.1,2.15,-.6],.055,palette.dark);
  const hoseCurve=new THREE.CatmullRomCurve3([[0,.8,.3],[-.5,1.3,.4],[-.3,2.5,.2],[.8,3.55,-.15],[1.6,3.4,-.5]].map(p=>new THREE.Vector3(...p)));
  robot.add(new THREE.Mesh(new THREE.TubeGeometry(hoseCurve,36,.035,6,false),material(0x182c3b)));
  // RGB-D camera and its projected recognition surface.
  const sensor=new THREE.Group();sensor.position.set(7.4,0,5);world.add(sensor);
  for(const x of [-.4,.4])beam(sensor,[0,1.6,0],[x,0,.25],.035,palette.slab);beam(sensor,[0,1.6,0],[0,0,-.5],.035,palette.slab);
  box(sensor,[1.2,.33,.32],[0,1.8,0],palette.slab);
  for(const x of [-.4,.4]){const lens=cylinder(sensor,.115,.07,[x,1.8,.18],palette.dark);lens.rotation.x=Math.PI/2;}
  const positions=[];
  for(let i=0;i<250;i++){const x=-2.2+(i%25)*.19;const y=.6+Math.floor(i/25)*.23;positions.push(x,y,2.16);}
  const pointsGeo=new THREE.BufferGeometry();pointsGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  const points=new THREE.Points(pointsGeo,new THREE.PointsMaterial({color:palette.cyan,size:.045,transparent:true,opacity:.8}));world.add(points);
  const scan=new THREE.Mesh(new THREE.PlaneGeometry(4.6,.025),new THREE.MeshBasicMaterial({color:palette.cyan,transparent:true,opacity:.75,side:THREE.DoubleSide}));scan.position.set(.05,1,2.18);world.add(scan);
  for(const end of [[-2.2,.6,2.16],[2.3,.6,2.16],[2.3,2.7,2.16],[-2.2,2.7,2.16]])line(world,[[7.4,1.8,5],end],0x70d9e5,.14);
  line(world,[[-2.2,.6,2.18],[2.3,.6,2.18],[2.3,2.7,2.18],[-2.2,2.7,2.18],[-2.2,.6,2.18]],palette.cyan,.5);
  // Site cabins, material stacks, fence, and residential context.
  box(world,[3.3,1.65,1.9],[-8,.8,5.5],0x587080);box(world,[3.6,.14,2.2],[-8,1.65,5.5],palette.slab);
  for(const x of [-8.9,-7.5])box(world,[.8,.55,.035],[x,1,6.47],0x8cbdcf);
  for(let i=0;i<4;i++)box(world,[2,.12,.28],[-7.7,.16+i*.13,1.8],palette.steel);
  for(let i=0;i<4;i++)box(world,[.75,.35,.75],[7.7,.2+i*.36,-5],0x83949b);
  for(let x=-13;x<14;x+=1.5){box(world,[.045,1.05,.045],[x,.5,-10.3],0x68808d);}
  line(world,[[-13,1,-10.3],[13,1,-10.3]],0x68808d);
  for(const pos of [[-10,-6.5],[10,-7.5]]) {const block=box(world,[3,5,3],[pos[0],2.5,pos[1]],0x496372);for(let y=.6;y<5;y+=.8)for(const x of [-.8,0,.8])box(world,[.35,.4,.025],[pos[0]+x,y,pos[1]+1.51],0x7697aa);}
  for(const x of [-11.7,11.8])for(const z of [1,4.3,7]){cylinder(world,.1,1,[x,.4,z],0x3e5863);const tree=new THREE.Mesh(new THREE.IcosahedronGeometry(.65,1),material(0x3f6970));tree.position.set(x,1.25,z);world.add(tree);}
  // A warm path visually connects perception, execution, and the building.
  const path=new THREE.CatmullRomCurve3([[-9,.025,7.7],[-5,.025,7.7],[-3.8,.025,5.3],[1.5,.025,5.7],[7.4,.025,6.2],[9,.025,2]].map(p=>new THREE.Vector3(...p)));
  world.add(new THREE.Mesh(new THREE.TubeGeometry(path,80,.023,6,false),new THREE.MeshBasicMaterial({color:0xdea866})));
  const trail=new THREE.Mesh(new THREE.SphereGeometry(.07,12,12),new THREE.MeshBasicMaterial({color:0xffda8c}));world.add(trail);
  const light=new THREE.PointLight(0x9cecf5,4,10);light.position.set(0,2.6,2.8);scene.add(light);
  const hotspotAnchors={robotics:new THREE.Vector3(-3.6,2,4.1),vision:new THREE.Vector3(7.4,3.8,5),digital:new THREE.Vector3(3,8.4,1.8)};
  const hotspotButtons=[...document.querySelectorAll('.hotspot')];
  let width=1,height=1,mobile=false,autoRotate=false,drag=false,moved=false,lastX=0,angle=.61,targetAngle=.61,pitch=.52,targetPitch=.52,distance=38,targetDistance=38;
  const lookAt=new THREE.Vector3(-4,4,0),targetLook=new THREE.Vector3(-4,4,0);
  function reset(){targetAngle=.61;targetPitch=.52;targetDistance=mobile?45:38;targetLook.set(mobile?0:-4, mobile?5:4,0);autoRotate=false;document.querySelector('#rotate').setAttribute('aria-pressed','false');}
  function focus(kind){const point=hotspotAnchors[kind]||new THREE.Vector3(1,5,0);targetAngle=.5;targetPitch=.4;targetDistance=kind==='robotics'||kind==='vision'?23:31;targetLook.copy(point).add(new THREE.Vector3(9,0,0));autoRotate=false;}
  function resize(){width=container.clientWidth;height=container.clientHeight;mobile=width<=600;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();reset();if(mobile){lookAt.copy(targetLook);distance=targetDistance;}if(currentPanel)focus(currentPanel);}
  const observer=new ResizeObserver(resize);observer.observe(container);
  renderer.domElement.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')return;drag=true;moved=false;lastX=event.clientX;renderer.domElement.setPointerCapture(event.pointerId);});
  renderer.domElement.addEventListener('pointermove',event=>{if(!drag)return;const dx=event.clientX-lastX;if(Math.abs(dx)>2)moved=true;targetAngle-=dx*.005;lastX=event.clientX;});
  renderer.domElement.addEventListener('pointerup',()=>{drag=false;});
  const raycaster=new THREE.Raycaster();const pointer=new THREE.Vector2();
  renderer.domElement.addEventListener('click',event=>{if(moved||currentPanel)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);for(const [group,kind] of [[robot,'robotics'],[sensor,'vision'],[building,'digital'],[crane,'digital']]){if(raycaster.intersectObject(group,true).length){openPanel(kind);return;}}});
  let previous=performance.now();
  function animate(now){const delta=Math.min((now-previous)/1000,.05);previous=now;const t=now/1000;
    if(autoRotate&&!drag&&!currentPanel)targetAngle+=delta*.1;
    const factor=reduceMotion?1:1-Math.exp(-delta*4.5);angle=THREE.MathUtils.lerp(angle,targetAngle,factor);pitch=THREE.MathUtils.lerp(pitch,targetPitch,factor);distance=THREE.MathUtils.lerp(distance,targetDistance,factor);lookAt.lerp(targetLook,factor);
    camera.position.set(lookAt.x+Math.sin(angle)*Math.cos(pitch)*distance,lookAt.y+Math.sin(pitch)*distance,lookAt.z+Math.cos(angle)*Math.cos(pitch)*distance);camera.lookAt(lookAt);
    if(mobile)camera.setViewOffset(width,height,0,-height*.015,width,height);else camera.clearViewOffset();
    if(!reduceMotion){scan.position.y=.6+(Math.sin(t*.7)*.5+.5)*2.1;trail.position.copy(path.getPointAt((t*.035)%1));hoist.position.y=Math.sin(t*.3)*.18;}
    renderer.render(scene,camera);
    hotspotButtons.forEach(button=>{const point=hotspotAnchors[button.dataset.research].clone().project(camera);const x=(point.x*.5+.5)*width,y=(-point.y*.5+.5)*height;const valid=point.z<1&&x>0&&x<width&&y>0&&y<height;button.style.visibility=valid?'visible':'hidden';const labelWidth=button.offsetWidth||150;button.style.transform=`translate(${Math.min(Math.max(x-10,8),width-labelWidth-8)}px,${y+container.offsetTop-10}px)`;});
  }
  renderer.setAnimationLoop(animate);resize();lookAt.copy(targetLook);
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();document.querySelector('.scene-fallback').hidden=false;document.querySelector('#hotspots').hidden=true;});
  return {reset,focus,rotate(value){autoRotate=value;}};
}
try {sceneAPI=createScene();}catch(error){console.warn('3D scene unavailable',error);document.querySelector('.scene-fallback').hidden=false;document.querySelector('#hotspots').hidden=true;}
