import {createStartupLoader} from './startup-loader.js';

const loader=createStartupLoader({root:document.getElementById('startup-loader'),getLanguage:()=>new URLSearchParams(location.search).get('lang')||document.documentElement.lang});
window.siteStartup=loader;loader.stage('download');
const styles=[...document.querySelectorAll('link[data-scene-style]')].map(link=>new Promise((resolve,reject)=>{if(link.dataset.sceneStyleError==='true'){reject(new Error('Styles unavailable'));return;}if(link.sheet){resolve();return;}link.addEventListener('load',resolve,{once:true});link.addEventListener('error',()=>reject(new Error('Styles unavailable')),{once:true});}));
window.sceneStylesReady=Promise.all(styles);
window.sceneStylesReady.catch(()=>{});
import('./experience.js').catch(()=>loader.fail());
