const esbuild=require('esbuild'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
(async()=>{const result=await esbuild.build({absWorkingDir:root,entryPoints:['site-start.js'],outdir:'assets/build',entryNames:'site-start',chunkNames:'chunk-[hash]',bundle:true,splitting:true,format:'esm',target:'es2022',minify:true,legalComments:'linked',metafile:true,plugins:[{name:'local-module-versions',setup(build){build.onResolve({filter:/^\..*\?.*$/},args=>({path:path.resolve(args.resolveDir,args.path.split('?')[0])}));}}]});
const version=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex').slice(0,12);
for(const name of ['interactive.html','index.html','ko.html']){
  const file=path.join(root,name);let html=fs.readFileSync(file,'utf8');
  html=html.replace(/assets\/build\/site-start\.js\?v=[^"'&]+/g,'assets/build/site-start.js?v='+version('assets/build/site-start.js'));
  html=html.replace(/(href=")([^"?]+\.css)(?:\?v=[^"]*)?"/g,(match,prefix,css)=>fs.existsSync(path.join(root,css))?prefix+css+'?v='+version(css)+'"':match);
  fs.writeFileSync(file,html);
}
fs.writeFileSync(path.join(root,'assets/build/manifest.json'),JSON.stringify({builder:'esbuild 0.28.2',files:Object.entries(result.metafile.outputs).map(([file,data])=>({file,bytes:data.bytes}))},null,2)+'\n');console.log('Built '+Object.keys(result.metafile.outputs).length+' browser files');})().catch(error=>{console.error(error);process.exitCode=1;});
