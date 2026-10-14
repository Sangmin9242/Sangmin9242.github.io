// World metres; local +Z points forward. Connected clear corridors avoid the
// office furniture, robot, columns, core, crane, parked cars and sports annex.
// Edges at slab entrances interpolate height for a short, smooth step up/down.
const NODES = {
  home:[-7,.102,6.7,'office'], office:[-7,.102,7.26,'office'], door:[-7,-.135,7.75,'outdoors'],
  junction:[-4.1,-.135,7.75,'outdoors'], west:[-4.1,-.135,.1,'outdoors'],
  lip:[-2.8,-.135,.1,'outdoors'], entry:[-2.1,.08,.1,'first-floor'],
  inside:[-1.4,.08,.1,'first-floor'], hall:[-.3,.08,.4,'first-floor'],
  middle:[1,.08,.4,'first-floor'], far:[3.5,.08,.4,'first-floor'],
  rearWest:[-4.1,-.135,-5.5,'outdoors'], rearEast:[6.7,-.135,-5.5,'outdoors'],
  east:[6.7,-.135,7.75,'outdoors'], frontLip:[6.7,-.135,10.7,'outdoors'],
  front:[6.7,-.075,11.3,'outdoors'], lawn:[6.7,-.075,14,'outdoors'],
  leftLawn:[-14,-.075,14,'outdoors'], leftFront:[-14,-.075,11.3,'outdoors'],
  leftLip:[-14,-.135,10.7,'outdoors'], officeFront:[-7,-.135,10.7,'outdoors'],
};
const EDGES = [['home','office'],['office','door'],['door','junction'],['junction','west'],
  ['west','lip'],['lip','entry'],['entry','inside'],['inside','hall'],['hall','middle'],['middle','far'],
  ['west','rearWest'],['rearWest','rearEast'],['rearEast','east'],['east','junction'],
  ['east','frontLip'],['frontLip','front'],['front','lawn'],['lawn','leftLawn'],
  ['leftLawn','leftFront'],['leftFront','leftLip'],['leftLip','officeFront'],['officeFront','door']];
const graph=Object.fromEntries(Object.keys(NODES).map(n=>[n,[]]));
const length=(a,b)=>Math.hypot(NODES[b][0]-NODES[a][0],NODES[b][2]-NODES[a][2]);
for(const [a,b] of EDGES){graph[a].push(b);graph[b].push(a);}
function shortest(from,to){
  const distances={[from]:0},previous={},pending=new Set(Object.keys(NODES));
  while(pending.size){let current;for(const n of pending)if(current===undefined||(distances[n]??Infinity)<(distances[current]??Infinity))current=n;
    pending.delete(current);if(current===to)break;
    for(const next of graph[current]){const cost=distances[current]+length(current,next);if(cost<(distances[next]??Infinity)){distances[next]=cost;previous[next]=current;}}
  }
  const path=[];for(let n=to;n!==from;n=previous[n])path.unshift(n);
  return {path,distance:distances[to]};
}
const ROUTINE=[
  {action:'sit',duration:5},{action:'sleep',duration:10},
  {action:'walk',to:'inside',speed:.85},{action:'sniff',duration:3},
  {action:'walk',to:'far',speed:.85},{action:'sit',duration:4},
  {action:'run',to:'rearWest',speed:2.2},{action:'sniff',duration:2},
  {action:'pee',duration:3.4},{action:'run',to:'rearEast',speed:2.2},
  {action:'walk',to:'east',speed:.95},{action:'sniff',duration:3},
  {action:'run',to:'lawn',speed:2.2},{action:'walk',to:'leftLawn',speed:1.0},
  {action:'poop',duration:3.5},{action:'run',to:'officeFront',speed:2.2},
  {action:'walk',to:'home',speed:.85},{action:'sleep',duration:18},
  {action:'run',to:'leftLawn',speed:2.2},{action:'sniff',duration:4},
  {action:'run',to:'east',speed:2.2},{action:'walk',to:'middle',speed:.95},
  {action:'sit',duration:5},{action:'walk',to:'home',speed:.85},
];
const EPS=1e-9,HOME_HEADING=0;
export function createDogBehaviour({reducedMotion=false}={}){
  const state={};let paused,focused,stage,wait,response,responseLeft,returning,node,edge,path;
  function setPose(action,pose=action,speed=0){if(state.action!==action)state.actionTime=0;Object.assign(state,{action,pose,speed,moving:speed>0});}
  function atNode(n){const [x,y,z,zone]=NODES[n];Object.assign(state,{x,y,z,zone});node=n;}
  function beginEdge(to){edge={from:node,to,position:0,length:length(node,to)};}
  function alongEdge(){const a=NODES[edge.from],b=NODES[edge.to],t=Math.max(0,Math.min(1,edge.position/edge.length));
    state.x=a[0]+(b[0]-a[0])*t;state.y=a[1]+(b[1]-a[1])*t;state.z=a[2]+(b[2]-a[2])*t;
    state.zone=a[3]===b[3]?a[3]:'entrance';state.heading=Math.atan2(b[0]-a[0],b[2]-a[2]);
  }
  function plan(to){path=shortest(node,to).path;if(path.length)beginEdge(path.shift());else edge=null;}
  function enter(index){stage=index;const current=ROUTINE[stage];wait=current.duration||0;setPose(current.action,current.action,current.speed||0);
    if(current.to)plan(current.to);if(current.action==='pee')state.peeCount++;if(current.action==='poop')state.poopCount++;
    if(node==='home'&&!edge)state.heading=HOME_HEADING;
  }
  function resume(){if(response)return;if(returning)setPose('call','walk',1.1);else if(reducedMotion||focused)setPose('sit');else {const c=ROUTINE[stage];setPose(c.action,c.action,c.speed||0);}}
  function arrivedHome(){returning=false;edge=null;path=[];atNode('home');enter(0);resume();}
  function reset(){paused=false;focused=false;response=null;responseLeft=0;returning=false;node='home';edge=null;path=[];
    Object.assign(state,{x:-7,y:.102,z:6.7,zone:'office',heading:HOME_HEADING,pose:'sit',action:'sit',speed:0,moving:false,
      affection:50,hearts:0,treats:0,peeCount:0,poopCount:0,effectTime:0,treatCooldown:0,petCooldown:0,time:0,actionTime:0,paused:false,focused:false});enter(0);
  }
  function update(dt){
    if(paused||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.25);const x=state.x,z=state.z;state.time+=dt;
    for(const key of ['effectTime','treatCooldown','petCooldown'])state[key]=Math.max(0,state[key]-dt);
    let left=dt;while(left>EPS){
      if(response){const used=Math.min(left,responseLeft);responseLeft-=used;left-=used;state.actionTime+=used;if(responseLeft<=EPS){response=null;resume();}continue;}
      if(reducedMotion||(focused&&!returning)){state.actionTime+=left;break;}
      const current=returning?{speed:1.1}:ROUTINE[stage];
      if(current.speed){
        if(!edge){if(returning)arrivedHome();else enter((stage+1)%ROUTINE.length);continue;}
        const used=Math.min(left,(edge.length-edge.position)/current.speed);edge.position+=used*current.speed;left-=used;state.actionTime+=used;alongEdge();
        if(edge.length-edge.position<=EPS){atNode(edge.to);edge=null;if(path.length)beginEdge(path.shift());else if(returning)arrivedHome();else enter((stage+1)%ROUTINE.length);}
      }else{const used=Math.min(left,wait);wait-=used;left-=used;state.actionTime+=used;if(wait<=EPS)enter((stage+1)%ROUTINE.length);}
    }
    if(state.moving&&Math.hypot(state.x-x,state.z-z)>EPS)state.heading=Math.atan2(state.x-x,state.z-z);
  }
  function interact(kind){
    if(paused||!['pet','treat','call'].includes(kind))return false;
    if(kind==='call'){
      response=null;responseLeft=0;
      if(reducedMotion||(!edge&&node==='home'))arrivedHome();
      else{
        returning=true;
        if(edge){const a=shortest(edge.from,'home'),b=shortest(edge.to,'home');
          if(edge.position+a.distance<edge.length-edge.position+b.distance){const from=edge.from;edge={from:edge.to,to:from,position:edge.length-edge.position,length:edge.length};path=a.path;node=edge.from;}
          else path=b.path;
          alongEdge();
        }else plan('home');
        setPose('call','walk',1.1);
      }return true;
    }
    if((kind==='pet'?state.petCooldown:state.treatCooldown)>EPS)return false;
    response=kind;responseLeft=3;state.actionTime=0;setPose(kind,kind==='pet'?'wag':'eat');state.affection=Math.min(100,state.affection+(kind==='pet'?5:3));state.effectTime=3;
    if(kind==='pet'){state.hearts++;state.petCooldown=2;}else{state.treats++;state.treatCooldown=8;}return true;
  }
  reset();return {state,update,interact,reset,
    setFocused(value){const next=Boolean(value);if(next===focused)return;focused=next;state.focused=next;resume();},
    setPaused(value){paused=Boolean(value);state.paused=paused;}};
}
