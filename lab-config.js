export const LAB_ROOM='526';
// Interactive lab homepage supplied by the owner.
export const LAB_INTERACTIVE_URL='https://conict526-ai.github.io/conict-3d/';
export function getLabDestination(value=LAB_INTERACTIVE_URL){
  if(typeof value!=='string'||!value.trim())return null;
  try{const url=new URL(value.trim());return ['https:','http:'].includes(url.protocol)?url.href:null;}catch{return null;}
}
