// Keyboard and touch inputs belong to the car only while Direct drive is active.
export function carDriveControls({container,getLanguage,onInput,onExit,onRear}){
  const element=document.createElement('section');element.id='drive-controls';element.className='drive-controls';element.hidden=true;element.setAttribute('aria-label','Driving controls');
  element.innerHTML='<div class="drive-topbar"><div><strong id="drive-title"></strong><p id="drive-instructions"></p><span id="drive-feedback" role="status" aria-live="polite"></span></div><div class="drive-speed"><span id="drive-gear">N</span><strong id="drive-speed">0</strong><small>km/h</small></div></div><div class="drive-bottom"><div class="drive-actions"><button type="button" id="drive-rear" aria-pressed="false"></button><button type="button" id="drive-exit"></button></div><div class="drive-pad" aria-label="Drive"><button type="button" data-drive="ArrowUp">↑</button><button type="button" data-drive="ArrowLeft">←</button><button type="button" data-drive="Space">■</button><button type="button" data-drive="ArrowRight">→</button><button type="button" data-drive="ArrowDown">↓</button></div></div>';
  container.append(element);
  const q=id=>element.querySelector('#'+id),keys=new Set(),touch=new Map();let active=false,language='',rearToggle=false,lastMessage='';
  const copy={ko:{title:'직접 운전',instructions:'↑ 가속 · ↓ 브레이크/후진 · ← → 조향 · Space 제동 · R 뒤보기',exit:'운전 종료 · 자동복귀',rear:'뒤보기 (R)',ahead:'앞보기',blocked:'장애물이나 도로 가장자리에 닿았어요. 후진하거나 방향을 바꿔 주세요.',names:['가속','왼쪽 조향','브레이크','오른쪽 조향','후진 / 감속']},en:{title:'Direct drive',instructions:'↑ Accelerate · ↓ Brake/reverse · ← → Steer · Space Brake · R Rear view',exit:'Finish driving · Return',rear:'Rear view (R)',ahead:'Front view',blocked:'At an obstacle or road edge. Reverse or turn to continue.',names:['Accelerate','Steer left','Brake','Steer right','Reverse / slow down']}};
  function has(key){return keys.has(key)||[...touch.values()].includes(key);}
  function input(){if(!active)return;onInput({throttle:Number(has('ArrowUp'))-Number(has('ArrowDown')),steer:Number(has('ArrowRight'))-Number(has('ArrowLeft')),brake:has('Space')});rear();}
  function rear(){const value=active&&(rearToggle||has('KeyR'));q('drive-rear').setAttribute('aria-pressed',String(value));q('drive-rear').textContent=copy[getLanguage()].rear;onRear(value);}
  function clear(){keys.clear();touch.clear();rearToggle=false;for(const b of element.querySelectorAll('[data-drive]'))b.classList.remove('held');if(active)onInput({throttle:0,steer:0,brake:true});rear();}
  function refresh(state={speed:0,blocked:false}){
    const lang=getLanguage(),c=copy[lang];if(language!==lang){language=lang;q('drive-title').textContent=c.title;q('drive-instructions').textContent=c.instructions;q('drive-exit').textContent=c.exit;element.setAttribute('aria-label',c.title);element.querySelectorAll('[data-drive]').forEach((b,i)=>b.setAttribute('aria-label',c.names[i]));rear();}
    const speed=String(Math.round(Math.abs(state.speed||0)*3.6));if(q('drive-speed').textContent!==speed)q('drive-speed').textContent=speed;
    q('drive-gear').textContent=Math.abs(state.speed||0)<.03?'N':state.speed<0?'R':'D';const message=state.blocked?c.blocked:'';if(lastMessage!==message){lastMessage=message;q('drive-feedback').textContent=message;}
  }
  document.addEventListener('keydown',e=>{if(!active||e.ctrlKey||e.altKey||e.metaKey)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();clear();onExit();return;}const key=e.code==='Space'?'Space':e.code==='KeyR'?'KeyR':e.key;if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyR'].includes(key))return;e.preventDefault();e.stopImmediatePropagation();keys.add(key);input();},true);
  document.addEventListener('keyup',e=>{if(!active)return;const key=e.code==='Space'?'Space':e.code==='KeyR'?'KeyR':e.key;if(keys.delete(key)){e.preventDefault();e.stopImmediatePropagation();input();}},true);
  for(const b of element.querySelectorAll('[data-drive]')){
    b.addEventListener('pointerdown',e=>{if(!active)return;e.preventDefault();try{b.setPointerCapture(e.pointerId);}catch{}touch.set(e.pointerId,b.dataset.drive);b.classList.add('held');input();});
    const release=e=>{touch.delete(e.pointerId);b.classList.remove('held');if(active)input();};for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,release);
  }
  q('drive-rear').onclick=()=>{rearToggle=!rearToggle;rear();};q('drive-exit').onclick=()=>{clear();onExit();};
  window.addEventListener('blur',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
  return {element,refresh,clear,setActive(value){if(active===value)return;clear();active=value;element.hidden=!value;document.body.classList.toggle('car-driving',value);if(value){language='';lastMessage='';refresh();q('drive-exit').focus({preventScroll:true});}else onRear(false);},isActive:()=>active};
}
