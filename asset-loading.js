async function download(url,{fetcher,signal,onProgress}){
  const response=await fetcher(url,{signal});if(!response.ok)throw new Error('Model download failed: '+response.status);
  const header=Number(response.headers.get('Content-Length')),encoding=response.headers.get('Content-Encoding');
  const total=header>0&&(!encoding||encoding==='identity')?header:undefined;
  if(!response.body?.getReader){const bytes=await response.arrayBuffer();onProgress?.({loaded:bytes.byteLength,total,label:'robot'});return bytes;}
  const reader=response.body.getReader(),chunks=[];let loaded=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);loaded+=value.byteLength;onProgress?.({loaded,total,label:'robot'});}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(loaded);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return bytes.buffer;
}

// The transport is smaller; the decompressed CAD model is byte-for-byte original.
export async function loadRobotBuffer({fetcher=globalThis.fetch.bind(globalThis),decompressor=globalThis.DecompressionStream,signal,onProgress}={}){
  const options={fetcher,signal,onProgress};
  if(decompressor){try{
    const bytes=await download('./assets/optimized/fireproofing-robot.glb.gz',options),magic=new Uint8Array(bytes,0,Math.min(2,bytes.byteLength));
    if(magic[0]===0x1f&&magic[1]===0x8b)return await new Response(new Blob([bytes]).stream().pipeThrough(new decompressor('gzip'))).arrayBuffer();
    // Some hosts decompress gzip during HTTP transport; accept a plain GLB too.
    if(new DataView(bytes).getUint32(0,true)===0x46546c67)return bytes;
    throw new Error('Unexpected robot payload');
  }catch(error){if(error.name==='AbortError')throw error;}}
  return download('./assets/robot/fireproofing-robot.glb',options);
}
