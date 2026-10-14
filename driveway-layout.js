// Shared site coordinates: the drive leaves the aisle before the bowling room,
// then travels around its front. +Z faces the parking forecourt.
export const driveway = Object.freeze({turnX:9.5, neckX:13, bendZ:30, crossZ:33.5, farX:46, outX:49.5, returnX:57.5, loopX:53.5, loopZ:55});
// One continuous pavement outline; no coplanar overlapping road boxes.
export const roadOutline = [ [-22,13.6],[14,13.6],[14,17.1],[15.9,17.1],[15.9,30.6],[60.4,30.6],
  ...Array.from({length:25},(_,i)=>{const a=i*Math.PI/24;return [53.5+6.9*Math.cos(a),55+6.9*Math.sin(a)];}),
  [46.6,36.4],[10.1,36.4],[10.1,19.4],[-22,19.4] ];
// Concrete stops exactly at the driveway boundary, rather than covering it.
export const forecourtPads = [ {x:-3,z:12.3,width:28,length:2.6}, {x:-3.45,z:22.2,width:27.1,length:5.6} ];
export const parkingLampPositions = [[-18.5,23.8],[9.3,24.8]];
export const parkingBollardPositions = [[-18.5,11.3],[-18.5,24.7],[9.3,11.3],[9.3,24.7]];

// Poles stay beyond the asphalt edge; each fixture faces the driving surface.
export const drivewayLampSpecs = [
  [-18,12.6,-18,16.5],[-8,12.6,-8,16.5],[2,12.6,2,16.5],
  [9.1,20.5,13,22],[9.1,28,13,28],
  [18,37.4,18,33.5],[28,37.4,28,33.5],[38,37.4,38,33.5],[45,37.4,48,34.5],
  [45.4,44,49.5,44],[45.4,53,49.5,53],
  [61.4,39,57.5,39],[61.4,47,57.5,47],[61.4,55,57.5,55],
  [47.1,61,50,57],[53.5,63,53.5,59],[59.9,61,57,57]
];
