// A short document fade preserves ordinary links, new tabs and reduced motion.
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!reduced){document.body.classList.add('page-entering');document.body.addEventListener('animationend',event=>{if(event.target===document.body)document.body.classList.remove('page-entering');});}
let navigating=false;
document.addEventListener('click',event=>{
  const link=event.target.closest('a[data-transition]');
  if(!link||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||reduced)return;
  if(link.origin!==location.origin||link.target==='_blank')return;
  event.preventDefault();if(navigating)return;navigating=true;
  document.body.classList.remove('page-entering');document.body.classList.add('page-leaving');
  setTimeout(()=>location.assign(link.href),240);
});
window.addEventListener('pageshow',event=>{if(event.persisted){navigating=false;document.body.classList.remove('page-leaving');}});
document.querySelectorAll('[data-transition]').forEach(link=>link.addEventListener('pointerenter',()=>{
  if(document.querySelector('link[rel="prefetch"][href="'+link.getAttribute('href')+'"]'))return;
  const hint=document.createElement('link');hint.rel='prefetch';hint.href=link.href;document.head.append(hint);
},{once:true}));
