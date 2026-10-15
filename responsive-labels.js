const layouts=new WeakMap();
export function responsiveLabels({buttons,anchors,camera,width,height,top,officeMode}){
  let layout=layouts.get(buttons);
  if(!layout){
    const ordered=[...buttons].map(button=>({button,key:button.dataset.research||button.dataset.sceneKey,office:button.classList.contains('office-hotspot')})).sort((a,b)=>Number(a.office)-Number(b.office));
    layout={world:document.querySelector('.world'),root:document.querySelector('.hotspots'),compact:matchMedia('(max-width:1100px)'),ordered,reserved:[...document.querySelectorAll('.hero-intro,.hobby-caption,.seoul-status,.scene-label,.scene-tools,.interaction-hint,.research-controls')]};
    layouts.set(buttons,layout);
  }
  if(layout.root&&getComputedStyle(layout.root).display==='none')return;
  if(layout.compact.matches){for(const {button,office} of layout.ordered){const visibility=(!office||officeMode)?'visible':'hidden';if(button.style.visibility!==visibility)button.style.visibility=visibility;}return;}
  const origin=layout.world.getBoundingClientRect(),reserved=[];
  for(const node of layout.reserved){const style=getComputedStyle(node);if(style.display==='none'||style.opacity==='0')continue;const r=node.getBoundingClientRect();reserved.push({x:r.left-origin.left,y:r.top-origin.top,w:r.width,h:r.height});}
  // Finish every layout read before any label style is changed.
  const measured=layout.ordered.map(entry=>({...entry,w:entry.button.offsetWidth||160,h:entry.button.offsetHeight||44}));
  const hit=(a,b)=>a.x<b.x+b.w+7&&a.x+a.w+7>b.x&&a.y<b.y+b.h+7&&a.y+a.h+7>b.y;
  const placements=[];
  for(const {button,key,office,w,h} of measured){const p=anchors[key].clone().project(camera),x=(p.x*.5+.5)*width,y=(-p.y*.5+.5)*height+top;
    if((office&&!officeMode)||p.z>=1||x<0||x>width||y<top||y>height+top){placements.push({button});continue;}
    const candidates=[];for(const dy of [0,-48,48,-96,96,-144,144,-192,192])for(const dx of [-10,-w-10,16,100,-w-100])candidates.push({x:Math.max(8,Math.min(width-w-8,x+dx)),y:Math.max(top+8,Math.min(height+top-h-8,y+dy)),w,h});
    const placed=candidates.find(r=>!reserved.some(v=>hit(r,v)));placements.push({button,placed});if(placed)reserved.push(placed);
  }
  for(const {button,placed} of placements){const visibility=placed?'visible':'hidden';if(button.style.visibility!==visibility)button.style.visibility=visibility;if(placed){const transform=`translate(${placed.x}px,${placed.y}px)`;if(button.style.transform!==transform)button.style.transform=transform;}
  }
}
