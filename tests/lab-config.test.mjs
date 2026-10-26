import test from 'node:test';
import assert from 'node:assert/strict';
let lab;
try{lab=await import('../lab-config.js');}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
test('Room526 resolves to the lab homepage supplied by the owner',()=>{assert.ok(lab);assert.equal(lab.LAB_ROOM,'526');assert.equal(lab.getLabDestination(),'https://conict526-ai.github.io/conict-3d/');});
test('lab destination accepts absolute web URLs and rejects explicit missing/unsafe links',()=>{assert.equal(lab?.getLabDestination('https://example.org/lab/'),'https://example.org/lab/');for(const v of [null,'',' ','javascript:alert(1)','data:text/html,hi','/unknown','ftp://example.org'])assert.equal(lab?.getLabDestination(v),null);assert.equal(lab?.getLabDestination(undefined),'https://conict526-ai.github.io/conict-3d/');});
