import * as THREE from './vendor/three.module.js';

// A compact architectural interpretation of SeoulTech's official exterior photo.
// Room 526 is a symbolic fifth-floor research-lab marker, not a surveyed floor plan.
export function sangsangHall(world) {
  const group = new THREE.Group();
  group.name = 'Sangsang Hall · 상상관';
  group.position.set(-5, -.135, 40);
  // Small edge clearance keeps projecting frames inside the reserved building envelope.
  group.scale.set(.986, 1, .992);
  group.userData.panel = 'sangsang';
  group.userData.roomLocation = 'Symbolic fifth-floor marker for research lab 526';
  world.add(group);

  const material = (color, extras = {}) => new THREE.MeshStandardMaterial({color, roughness: .76, ...extras});
  // Square cladding joints use a repeating canvas tile rather than hundreds of meshes.
  const tile = document.createElement('canvas'); tile.width = tile.height = 128;
  const tileContext = tile.getContext('2d');
  tileContext.fillStyle = '#e3e4e0'; tileContext.fillRect(0, 0, 128, 128);
  tileContext.strokeStyle = '#c5c9c6'; tileContext.lineWidth = 1.5;
  tileContext.strokeRect(.75, .75, 126.5, 126.5);
  const panelMap = new THREE.CanvasTexture(tile); panelMap.colorSpace = THREE.SRGBColorSpace;
  panelMap.wrapS = panelMap.wrapT = THREE.RepeatWrapping;
  panelMap.anisotropy = 4;
  const pale = material(0xdfe3df), trim = material(0xebede7), joint = material(0x7c8c8b);
  const dark = material(0x283d43, {roughness: .45, metalness: .28});
  const glass = material(0x547f89, {roughness: .28, metalness: .4, emissive: 0x8bbaa7, emissiveIntensity: .025});
  const connector = material(0x699b9d, {roughness: .38, metalness: .25, emissive: 0x638f87, emissiveIntensity: .02});
  const soffit = material(0xc89b50, {emissive: 0xe3ad59, emissiveIntensity: .04});
  const stone = material(0xa8afaa), paving = material(0xc2c6bf), planter = material(0x83907b);
  const warmGlass = material(0x648c8e, {roughness: .3, metalness: .35, emissive: 0xffce88, emissiveIntensity: .08});
  const accent = material(0xa29675, {metalness: .2, emissive: 0xe6b36c, emissiveIntensity: .02});
  const downlight = material(0xece4c9, {emissive: 0xffdb9b, emissiveIntensity: .04});
  const batches = new Map();
  function box(size, position, mat) {
    if (!batches.has(mat)) batches.set(mat, []);
    batches.get(mat).push({size, position});
  }
  function panelFace(width, height, position, rotationY) {
    const map = panelMap.clone(); map.repeat.set(width / .73, height / .73); map.needsUpdate = true;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material(0xffffff, {map}));
    face.position.set(...position); face.rotation.y = rotationY; face.receiveShadow = true; group.add(face);
  }
  function mass(x, width, depth, top, front, bottom = .025) {
    const height = top - bottom, z = front + depth / 2;
    box([width, height, depth], [x, bottom + height / 2, z], pale);
    panelFace(width, height, [x, bottom + height / 2, front - .012], Math.PI);
    panelFace(depth, height, [x + width / 2 + .012, bottom + height / 2, z], Math.PI / 2);
    panelFace(depth, height, [x - width / 2 - .012, bottom + height / 2, z], -Math.PI / 2);
    panelFace(width, height, [x, bottom + height / 2, front + depth + .012], 0);
    box([width, .12, depth], [x, top + .035, z], trim);
    box([width - .25, .11, depth - .25], [x, top + .135, z], stone);
  }

  // The plaza sits slightly above the existing ground; it clears every vehicle route.
  box([23, .035, 13.2], [0, .0075, .1], paving);
  box([21.5, .035, 2.1], [-.1, .038, -5.15], trim);
  box([8.2, .09, 1.05], [6.2, .1, -4.7], stone);
  // Highest eight-storey tower on the right; five/six-storey stepped wings on the left.
  mass(-8.15, 4.7, 8.35, 8.0, -4.15);
  mass(-1.4, 5.6, 7.7, 9.55, -3.5);
  mass(7, 7, 6.7, 12.6, -2.55, 1.87);
  box([7, 1.845, 5.75], [7, .9475, .975], glass);
  box([1.6, 7.75, 6.6], [-5, 3.9, .4], connector);
  box([2.1, 9.15, 6.0], [2.45, 4.6, .65], connector);

  // Recessed blue-green curtain walls join each pale block.
  for (const spec of [{x:-5,w:1.6,h:7.75,z:-2.91},{x:2.45,w:2.1,h:9.15,z:-2.36}]) {
    for (let y = .12; y < spec.h; y += 1.55) box([spec.w, .035, .045], [spec.x, y, spec.z], joint);
    for (const x of [spec.x - spec.w / 2 + .07, spec.x, spec.x + spec.w / 2 - .07]) box([.035, spec.h, .045], [x, spec.h / 2 + .025, spec.z], joint);
  }

  // Continuous dark slots with separate window panes make all storeys legible.
  const slotSpecs = [
    {xs:[-9.68,-8.65,-7.62,-6.59], floors:5, front:-4.174, top:7.65},
    {xs:[-3.55,-2.22,-.89,.44], floors:6, front:-3.524, top:9.2},
    {xs:[4.3,5.93,7.56,9.19], floors:8, front:-2.574, top:12.25},
  ];
  let selectedPosition;
  for (const spec of slotSpecs) {
    for (const x of spec.xs) {
      box([.47, spec.top - .2, .04], [x, (spec.top + .2) / 2, spec.front], dark);
      for (let floor = 0; floor < spec.floors; floor++) {
        const y = .82 + floor * 1.55;
        const selected = spec.floors === 8 && x === 5.93 && floor === 4;
        const z = spec.front - .03;
        box([.355, 1.05, .022], [x, y, z], selected ? warmGlass : glass);
        box([.49, .055, .075], [x, y - .56, z + .008], trim);
        box([.37, .025, .03], [x, y + .04, z - .012], joint);
        if (selected) {
          selectedPosition = new THREE.Vector3(x, y, z - .09);
          for (const dx of [-.26,.26]) box([.045,1.22,.05],[x+dx,y,z-.027],accent);
          for (const dy of [-.59,.59]) box([.56,.045,.05],[x,y+dy,z-.027],accent);
        }
      }
    }
  }
  // The tower's side is deeply framed, with broad horizontal rows like the reference.
  box([.04, 10.55, 5.65], [10.514, 7.225, .8], dark);
  for (let floor = 1; floor < 8; floor++) {
    const y = .82 + floor * 1.55;
    for (let bay = 0; bay < 5; bay++) {
      const z = -1.44 + bay * 1.12;
      box([.035,1.03,.91],[10.54,y,z],glass);
      box([.11,1.26,.085],[10.58,y,z+.49],trim);
      box([.045,.025,.91],[10.57,y-.12,z],joint);
    }
    box([.58,.4,6.04],[10.35,y-.63,.81],trim);
  }
  // Secondary elevations keep the model convincing from both scene cameras.
  for (const wing of [{x:-10.525,z:0,floors:5,depth:6.5},{x:1.425,z:.35,floors:6,depth:6.3}]) {
    for (let floor=0;floor<wing.floors;floor++) for (let bay=0;bay<5;bay++) {
      box([.035,1.0,.43],[wing.x,.82+floor*1.55,wing.z-wing.depth/2+.6+bay*1.16],glass);
    }
  }
  for (let floor=0;floor<8;floor++) for (const x of [4.3,5.93,7.56,9.19]) box([.4,1.04,.035],[x,.82+floor*1.55,4.169],glass);

  // Broad entrance canopy, warm soffit and slender round supports.
  box([8.5,.32,2.55],[6.25,1.88,-2.925],pale);
  box([8.28,.035,2.35],[6.25,1.7,-2.925],soffit);
  box([8.5,.065,.065],[6.25,2.07,-4.16],trim);
  const columnGeometry = new THREE.CylinderGeometry(.15,.17,1.655,12);
  const columns = new THREE.InstancedMesh(columnGeometry, trim, 4);
  columns.name = 'Entrance canopy columns'; columns.castShadow = columns.receiveShadow = true;
  const transform = new THREE.Object3D();
  [2.4,4.8,7.2,10].forEach((x,i)=>{transform.position.set(x,.8525,-3.92);transform.updateMatrix();columns.setMatrixAt(i,transform.matrix);}); group.add(columns);
  for (const x of [3.45,5.8,8.2,9.6]) box([.18,.03,.18],[x,1.672,-3.1],downlight);
  // Lobby doors remain under the canopy, leaving an open covered approach.
  box([4.2,1.52,.065],[7,.79,-1.94],glass);
  for (const x of [4.88,6.28,7.68,9.08]) box([.05,1.58,.09],[x,.81,-1.987],trim);
  for (const x of [6.44,7.52]) box([.028,.3,.025],[x,.78,-2.038],trim);
  box([4.3,.055,.08],[7,1.58,-1.99],trim);
  // Low planters stay outside the entrance and below the main view.
  for (const x of [-10.9,-6.1]) {
    box([1.25,.3,.75],[x,.175,-4.9],stone);
    box([1.13,.19,.64],[x,.415,-4.9],planter);
  }

  function label(lines, width, height, position, bg, text, fontSize) {
    const canvas = document.createElement('canvas'); canvas.width=1024; canvas.height=256;
    const ctx=canvas.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,1024,256);
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=text;
    lines.forEach((line,i)=>{ctx.font=`${i===0?'600':'400'} ${i===0?fontSize:fontSize*.62}px "Malgun Gothic", "Noto Sans KR", sans-serif`;ctx.fillText(line,512,lines.length===1?128:91+i*101);});
    const map=new THREE.CanvasTexture(canvas); map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
    const mat=material(0xffffff,{map,emissive:0xffffff,emissiveMap:map,emissiveIntensity:.03,roughness:.7});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),mat);mesh.position.set(...position);mesh.rotation.y=Math.PI;group.add(mesh);return mesh;
  }
  const entranceSign=label(['상상관 · Sangsang Hall','SeoulTech'],5.25,.52,[6.25,1.875,-4.211],'#e2e4df','#29484e',66);
  const roomLabel=label(['526 · 연구실','Research Lab'],1.38,.36,[5.93,selectedPosition.y+.87,-2.653],'#31545a','#f1e5c8',66);
  roomLabel.name='Room 526 · symbolic fifth-floor location';

  const boxGeometry=new THREE.BoxGeometry(1,1,1);
  for (const [mat,items] of batches) {
    const mesh=new THREE.InstancedMesh(boxGeometry,mat,items.length);
    mesh.name = `Sangsang Hall repeated elements (${items.length})`;
    mesh.castShadow=mesh.receiveShadow=true;
    items.forEach((item,i)=>{transform.position.set(...item.position);transform.scale.set(...item.size);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);});
    mesh.instanceMatrix.needsUpdate=true; group.add(mesh);
  }
  // Keep this light present at zero intensity during the day to avoid shader churn.
  const entryLight=new THREE.PointLight(0xffd49a,0,9,2);entryLight.position.set(6.25,1.55,-3.2);entryLight.castShadow=false;group.add(entryLight);
  let focused=false,night=false;
  function updateMaterials() {
    glass.emissiveIntensity=night?.27:.025;connector.emissiveIntensity=night?.13:.02;
    warmGlass.color.set(focused?0xc0a170:0x648c8e);warmGlass.emissiveIntensity=focused?(night?.65:.36):(night?.32:.08);
    accent.color.set(focused?0xd3b572:0xa29675);accent.emissiveIntensity=focused?.2:.02;
    soffit.emissiveIntensity=night?.2:.04;downlight.emissiveIntensity=night?1.6:.04;
    entranceSign.material.emissiveIntensity=night?.32:.03;roomLabel.material.emissiveIntensity=focused?.4:(night?.22:.03);
    entryLight.intensity=night?4.5:0;
  }
  group.updateMatrixWorld(true);
  const toWorld=(local)=>local.clone().multiply(group.scale).add(group.position);
  return {
    group,
    anchor:toWorld(new THREE.Vector3(2,10.7,-1)),
    center:toWorld(new THREE.Vector3(0,5.3,0)),
    roomAnchor:toWorld(selectedPosition),
    setFocused(value){focused=Boolean(value);updateMaterials();},
    setNight(value){night=Boolean(value);updateMaterials();},
  };
}
