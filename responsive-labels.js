export function responsiveLabels({buttons,anchors,camera,width,height,top,officeMode}){
  const compact=matchMedia('(max-width:1100px)').matches;
  if(compact){for(const b of buttons)b.style.visibility=(!b.classList.contains('office-hotspot')||officeMode)?'visible':'hidden';return;}
  const world=document.querySelector('.world'),origin=world.getBoundingClientRect();
  const reserved=[...document.querySelectorAll('.hero-intro,.seoul-status,.scene-label,.scene-tools,.interaction-hint,.research-controls')].filter(n=>getComputedStyle(n).display!=='none'&&getComputedStyle(n).opacity!=='0').map(n=>{const r=n.getBoundingClientRect();return {x:r.left-origin.left,y:r.top-origin.top,w:r.width,h:r.height};});
  const hit=(a,b)=>a.x<b.x+b.w+7&&a.x+a.w+7>b.x&&a.y<b.y+b.h+7&&a.y+a.h+7>b.y;
  const ordered=[...buttons].sort((a,b)=>Number(a.classList.contains('office-hotspot'))-Number(b.classList.contains('office-hotspot')));
  for(const b of ordered){const key=b.dataset.research||b.dataset.sceneKey,p=anchors[key].clone().project(camera),x=(p.x*.5+.5)*width,y=(-p.y*.5+.5)*height+top,w=b.offsetWidth||160,h=b.offsetHeight||44;
    if((b.classList.contains('office-hotspot')&&!officeMode)||p.z>=1||x<0||x>width||y<top||y>height+top){b.style.visibility='hidden';continue;}
    const candidates=[];for(const dy of [0,-48,48,-96,96,-144,144,-192,192])for(const dx of [-10,-w-10,16,100,-w-100])candidates.push({x:Math.max(8,Math.min(width-w-8,x+dx)),y:Math.max(top+8,Math.min(height+top-h-8,y+dy)),w,h});
    const placed=candidates.find(r=>!reserved.some(v=>hit(r,v)));b.style.visibility=placed?'visible':'hidden';if(placed){b.style.transform=`translate(${placed.x}px,${placed.y}px)`;reserved.push(placed);}
  }
}
