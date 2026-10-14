import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
let loadRobotBuffer;
try{({loadRobotBuffer}=await import('../asset-loading.js'));}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
test('compressed robot loading preserves every original byte and reports real transferred bytes',async()=>{
  assert.equal(typeof loadRobotBuffer,'function');
  const original=new Uint8Array([103,108,84,70,2,0,0,0,8,7,6,5,4]),compressed=gzipSync(original),reports=[];
  const body=new ReadableStream({start(c){c.enqueue(compressed.subarray(0,10));c.enqueue(compressed.subarray(10));c.close();}});
  const result=await loadRobotBuffer({fetcher:async()=>new Response(body,{headers:{'Content-Length':String(compressed.length)}}),onProgress:p=>reports.push(p)});
  assert.deepEqual(new Uint8Array(result),original);assert.equal(reports.at(-1).loaded,compressed.length);assert.equal(reports.at(-1).total,compressed.length);
});
test('unsupported decompression and missing compressed file fall back to the original model',async()=>{
  assert.equal(typeof loadRobotBuffer,'function');const bytes=new Uint8Array([103,108,84,70,1]);
  for(const supported of [false,true]){const urls=[];const result=await loadRobotBuffer({decompressor:supported?DecompressionStream:null,fetcher:async url=>{urls.push(url);return String(url).endsWith('.gz')?new Response('',{status:404}):new Response(bytes);}});assert.deepEqual(new Uint8Array(result),bytes);assert.equal(urls.at(-1),'./assets/robot/fireproofing-robot.glb');}
});
test('abort is preserved instead of retrying an unwanted download',async()=>{
  assert.equal(typeof loadRobotBuffer,'function');let calls=0;
  await assert.rejects(loadRobotBuffer({fetcher:async()=>{calls++;throw new DOMException('Cancelled','AbortError');}}),{name:'AbortError'});assert.equal(calls,1);
});
test('HTTP-decoded body does not use encoded Content-Length as a false progress total',async()=>{
  assert.equal(typeof loadRobotBuffer,'function');const bytes=new Uint8Array([103,108,84,70,2,0,0,0]),reports=[];
  const result=await loadRobotBuffer({fetcher:async()=>new Response(bytes,{headers:{'Content-Encoding':'gzip','Content-Length':'2'}}),onProgress:p=>reports.push(p)});
  assert.deepEqual(new Uint8Array(result),bytes);assert.equal(reports.at(-1).loaded,bytes.length);assert.equal(reports.at(-1).total,undefined);
});
