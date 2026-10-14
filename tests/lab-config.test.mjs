import test from 'node:test';
import assert from 'node:assert/strict';
let lab;
try{lab=await import('../lab-config.js');}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
test('lab link config exists with Room526 and no invented homepage',()=>{assert.ok(lab);assert.equal(lab.LAB_ROOM,'526');assert.equal(lab.getLabDestination(),null);});
test('future lab destination accepts absolute web URLs and rejects missing/unsafe links',()=>{assert.equal(lab?.getLabDestination('https://example.org/lab/'),'https://example.org/lab/');for(const v of [null,'',' ',undefined,'javascript:alert(1)','data:text/html,hi','/unknown','ftp://example.org'])assert.equal(lab?.getLabDestination(v),null);});
