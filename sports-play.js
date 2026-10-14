// Optional games own their inputs until exit; view controls remain independent.
export function sportsPlay({hobbies,canvas,getLanguage,onStart,onStop}){
  const q=id=>document.querySelector('#'+id),held=new Set(),touchHeld=new Map();
  let kind=null,gesture=null,aiming=false,shootPointer=null,previous=performance.now(),statusKey='',labelKey='',controlKey='';
  const copy={
    en:{start:'Play as Sangmin',football:'Arrow keys: run. Hold D, use ← / → to aim, then release D to shoot. ↑ centres the aim. On mobile, hold Shoot while pressing the direction buttons.',bowling:'Hold the ball and pull BACK (↓). Pull sideways to change direction; pull farther for more power. Release to bowl. The line previews the throw.',exit:'Stop playing',restart:'New game',throw:'Bowl',next:'Next ball',aim:'Direction',power:'Power',shoot:'Hold to aim',ready:'Pull the ball back',rolling:'Ball rolling…',result:'Pins down',finished:'Game complete',goal:'Goal!',saved:'Saved',miss:'Try again',goals:'Goals',shots:'Shots',frame:'Frame',ball:'Ball',gesture:'Pull back, then release',aiming:'Aiming · release D to shoot',pull:'Pull back ↓',guide:'Pull down to set power · sideways to aim · release to bowl'},
    ko:{start:'아바타로 플레이',football:'방향키: 이동. D를 누른 채 ← / →로 조준하고 D를 놓으면 슛합니다. ↑는 중앙 조준. 모바일은 슛 버튼을 누른 채 방향 버튼을 사용하세요.',bowling:'공을 누르고 뒤로(↓) 당기세요. 옆으로 틀면 방향, 더 멀리 당기면 세기가 바뀝니다. 놓으면 투구하며 선으로 진행 방향이 보입니다.',exit:'플레이 종료',restart:'새 게임',throw:'투구',next:'다음 공',aim:'방향',power:'세기',shoot:'눌러서 조준',ready:'공을 뒤로 당기세요',rolling:'공이 굴러갑니다…',result:'쓰러진 핀',finished:'게임 종료',goal:'골!',saved:'선방',miss:'다시 도전',goals:'골',shots:'슛',frame:'프레임',ball:'투구',gesture:'뒤로 당긴 뒤 놓으세요',aiming:'조준 중 · D를 놓으면 슛',pull:'뒤로 당기기 ↓',guide:'아래로 당겨 세기 · 옆으로 방향 · 놓아서 투구'},
  };
  function labels(){
    const language=getLanguage(),key=language+kind+hobbies.focusKind();if(key===labelKey)return;labelKey=key;const t=copy[language];
    q('game-start').textContent=t.start;q('game-instructions').textContent=t[kind||hobbies.focusKind()]||'';
    for(const [id,key] of [['game-exit','exit'],['game-restart','restart'],['bowling-throw','throw'],['bowling-next','next'],['bowling-aim-label','aim'],['bowling-power-label','power'],['football-shoot','shoot'],['bowling-pull-label','pull'],['bowling-guide','guide']])q(id).textContent=t[key];
    q('bowling-pull').setAttribute('aria-label',t.gesture);q('game-pad').setAttribute('aria-label',language==='ko'?'축구 방향 조작':'Football movement and aim');
    const names=language==='ko'?['앞으로 이동 · 조준 중 중앙','왼쪽 이동 · 왼쪽 조준','뒤로 이동','오른쪽 이동 · 오른쪽 조준']:['Forward / centre aim','Left / aim left','Backward','Right / aim right'];
    q('game-pad').querySelectorAll('[data-x]').forEach((b,i)=>b.setAttribute('aria-label',names[i]));q('game-controls').setAttribute('aria-label',language==='ko'?'게임 조작':'Game controls');
  }
  function axes(){let x=Number(held.has('ArrowRight'))-Number(held.has('ArrowLeft')),z=Number(held.has('ArrowDown'))-Number(held.has('ArrowUp'));for(const b of touchHeld.values()){x+=+b.dataset.x;z+=+b.dataset.z;}return {x:Math.sign(x),z:Math.sign(z)};}
  function input(){hobbies.setInput(aiming?{x:0,z:0}:axes());}
  function finishAim(fire){if(!aiming)return;aiming=false;shootPointer=null;q('football-shoot').classList.remove('held');q('football-shoot').setAttribute('aria-pressed','false');if(fire&&kind==='football')hobbies.shoot();input();}
  function beginAim(){if(kind!=='football'||hobbies.gameState().phase!=='playing')return;aiming=true;q('football-shoot').classList.add('held');q('football-shoot').setAttribute('aria-pressed','true');input();}
  function clear(){
    finishAim(false);held.clear();touchHeld.clear();if(gesture){const {surface,id}=gesture;gesture=null;if(surface.hasPointerCapture(id))surface.releasePointerCapture(id);}
    canvas.classList.remove('throwing');q('gesture-meter').hidden=true;q('bowling-pull').style.transform='';hobbies.setInput({x:0,z:0});q('game-pad').querySelectorAll('button').forEach(b=>b.classList.remove('held'));
  }
  function start(next){
    if(!['football','bowling'].includes(next))return;clear();kind=next;hobbies.startGame(next);document.body.classList.add('game-playing');q('game-controls').hidden=false;q('game-start').hidden=true;q('game-pad').hidden=next!=='football';q('bowling-inputs').hidden=next!=='bowling';q('bowling-launcher').hidden=next!=='bowling';q('bowling-aim').value='0';q('bowling-power').value='.7';updateBowlingGuide();statusKey=controlKey='';labels();onStart(next);q('game-exit').focus({preventScroll:true});if(innerWidth<=1100)canvas.scrollIntoView({block:'start',behavior:'instant'});
  }
  function stop(){if(!kind)return;clear();const old=kind;kind=null;hobbies.stopGame();document.body.classList.remove('game-playing');q('game-controls').hidden=true;q('game-start').hidden=false;q('bowling-launcher').hidden=true;statusKey='';onStop(old);}
  function bowl(){if(kind!=='bowling')return false;return hobbies.throwBall({aim:+q('bowling-aim').value,power:+q('bowling-power').value,spin:0});}
  const updateBowlingGuide=()=>{hobbies.setAim(+q('bowling-aim').value,+q('bowling-power').value);q('bowling-power-value').textContent=Math.round(+q('bowling-power').value*100)+'%';};
  q('game-start').onclick=()=>start(hobbies.focusKind());q('game-exit').onclick=()=>{stop();q('game-start').focus({preventScroll:true});};
  q('game-restart').onclick=()=>{clear();hobbies.restartGame();updateBowlingGuide();statusKey=controlKey='';};q('bowling-throw').onclick=bowl;q('bowling-next').onclick=()=>hobbies.nextBall();
  q('bowling-aim').addEventListener('input',updateBowlingGuide);q('bowling-power').addEventListener('input',updateBowlingGuide);
  for(const b of q('game-pad').querySelectorAll('[data-x]')){
    b.addEventListener('pointerdown',e=>{if(kind!=='football')return;e.preventDefault();b.setPointerCapture(e.pointerId);touchHeld.set(e.pointerId,b);b.classList.add('held');input();});
    const release=e=>{touchHeld.delete(e.pointerId);b.classList.remove('held');input();};for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,release);
  }
  const shoot=q('football-shoot');
  shoot.addEventListener('pointerdown',e=>{if(kind!=='football')return;e.preventDefault();shoot.setPointerCapture(e.pointerId);beginAim();if(aiming)shootPointer=e.pointerId;});
  shoot.addEventListener('pointerup',e=>{if(shootPointer===e.pointerId)finishAim(true);});for(const name of ['pointercancel','lostpointercapture'])shoot.addEventListener(name,e=>{if(shootPointer===e.pointerId)finishAim(false);});
  shoot.addEventListener('keydown',e=>{if(['Space','Enter'].includes(e.code)){e.preventDefault();if(!e.repeat)beginAim();}});shoot.addEventListener('keyup',e=>{if(['Space','Enter'].includes(e.code)){e.preventDefault();finishAim(true);}});
  document.addEventListener('keydown',e=>{
    if(!kind||e.ctrlKey||e.altKey||e.metaKey||e.target.matches('input,textarea,select'))return;
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();stop();q('game-start').focus({preventScroll:true});return;}
    if(kind!=='football')return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();held.add(e.key);input();}else if(e.code==='KeyD'||e.key.toLowerCase()==='d'){e.preventDefault();if(!e.repeat)beginAim();}
  },true);
  document.addEventListener('keyup',e=>{if(kind==='football'&&(e.code==='KeyD'||e.key.toLowerCase()==='d')){e.preventDefault();if(shootPointer===null)finishAim(true);return;}if(held.delete(e.key)){input();e.preventDefault();}},true);
  window.addEventListener('blur',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
  function pullValues(e){const dy=e.clientY-gesture.y,dx=e.clientX-gesture.x;return {dy,dx,aim:Math.max(-1,Math.min(1,-dx/Math.max(80,dy)*.9)),power:Math.max(.15,Math.min(1,Math.hypot(dx,Math.max(0,dy))/Math.max(100,canvas.clientHeight*.27)))};}
  // Pull distance, not swipe speed, controls power. The orbit camera stays still.
  function down(e){if(!kind)return;e.stopImmediatePropagation();if(kind!=='bowling'||e.button!==0||gesture||hobbies.gamePhase()!=='ready')return;e.preventDefault();gesture={id:e.pointerId,x:e.clientX,y:e.clientY,surface:e.currentTarget};e.currentTarget.setPointerCapture(e.pointerId);canvas.classList.add('throwing');q('gesture-meter').hidden=false;q('gesture-meter').textContent=copy[getLanguage()].gesture;}
  function move(e){if(!kind)return;e.stopImmediatePropagation();if(gesture?.id!==e.pointerId)return;const v=pullValues(e);q('bowling-aim').value=String(v.aim);q('bowling-power').value=String(v.power);updateBowlingGuide();q('gesture-meter').textContent=copy[getLanguage()].gesture+' · '+Math.round(v.power*100)+'%';q('bowling-pull').style.transform=`translate(${Math.max(-70,Math.min(70,v.dx))}px,${Math.max(0,Math.min(85,v.dy))}px)`;}
  function release(e,cancel){if(!kind)return;e.stopImmediatePropagation();if(gesture?.id!==e.pointerId)return;const values=pullValues(e),{surface,id}=gesture;gesture=null;canvas.classList.remove('throwing');q('gesture-meter').hidden=true;q('bowling-pull').style.transform='';if(surface.hasPointerCapture(id))surface.releasePointerCapture(id);if(!cancel&&values.dy>18){q('bowling-aim').value=String(values.aim);q('bowling-power').value=String(values.power);bowl();}}
  for(const surface of [canvas,q('bowling-pull')]){surface.addEventListener('pointerdown',down,true);surface.addEventListener('pointermove',move,true);surface.addEventListener('pointerup',e=>release(e,false),true);surface.addEventListener('pointercancel',e=>release(e,true),true);surface.addEventListener('lostpointercapture',e=>release(e,true),true);}
  function refresh(){
    const now=performance.now(),delta=Math.min(.05,Math.max(0,(now-previous)/1000));previous=now;labels();if(!kind)return;const state=hobbies.gameState(),t=copy[getLanguage()];let content='';
    if(kind==='football'){
      if(aiming){const {x,z}=axes();hobbies.setFootballAim(z<0&&!x?0:state.aimX+x*1.6*delta);}
      document.querySelector('#scene').dataset.footballAiming=String(aiming);content=`${t.goals} ${state.goals} · ${t.shots} ${state.shots}`;
      if(aiming)content+=' · '+t.aiming;else if(['goal','saved','miss'].includes(state.phase))content+=' · '+t[state.phase];
    }else{
      if(controlKey!==state.phase){controlKey=state.phase;q('bowling-throw').disabled=state.phase!=='ready';q('bowling-next').hidden=state.phase!=='result';q('bowling-aim').disabled=q('bowling-power').disabled=state.phase!=='ready';q('bowling-launcher').hidden=state.phase!=='ready';}
      content=`${t.frame} ${state.frame} · ${t.ball} ${state.delivery} · `+(state.phase==='ready'?t.ready:state.phase==='result'?`${t.result} ${state.count}`:state.phase==='finished'?`${t.finished} · ${state.result.total}`:t.rolling);
    }
    if(content!==statusKey){q('game-status').textContent=content;statusKey=content;}
  }
  labels();return {start,stop,refresh,isPlaying:()=>kind!==null};
}
