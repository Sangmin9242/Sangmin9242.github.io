export const LAB_ROOM='526';
// Set this when the separate interactive lab website has its final address.
export const LAB_INTERACTIVE_URL=null;
export function getLabDestination(value=LAB_INTERACTIVE_URL){
  if(typeof value!=='string'||!value.trim())return null;
  try{const url=new URL(value.trim());return ['https:','http:'].includes(url.protocol)?url.href:null;}catch{return null;}
}
