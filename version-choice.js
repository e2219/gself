/* Two complete same-origin editions share one record store. No iframe or second native bridge. */
(()=>{'use strict';
 const original=/\/legacy\/(?:index\.html)?$/.test(location.pathname),edition=original?'original':'3d';
 const key='mooncatch-edition',params=new URLSearchParams(location.search);
 const requested=params.get('edition');
 function destination(value){const url=new URL(value==='original'?(original?'index.html':'legacy/index.html'):(original?'../index.html':'index.html'),location.href);url.search=location.search;url.searchParams.set('edition',value);return url.href}
 let saved;try{saved=localStorage.getItem(key)}catch{}
 const preferred=['original','3d'].includes(requested)?requested:params.has('qa')?edition:saved;
 if(preferred&&preferred!==edition){location.replace(destination(preferred));return}
 if(requested===edition)try{localStorage.setItem(key,edition)}catch{}
 window.MooncatchEdition={current:edition,async select(value){
  if(!['original','3d'].includes(value)||value===edition)return;
  // Switching is only exposed in the departure hall. Flush queued native saves before leaving.
  window.MooncatchSuite?.home();
  try{await window.MooncatchSaveChanged?.();localStorage.setItem(key,value)}catch{const hint=document.getElementById('editionHint');if(hint)hint.textContent='保存未完成，请稍后重试切换';return}
  location.assign(destination(value));
 }};
 function mount(){const home=document.getElementById('suiteHome');if(!home||document.getElementById('editionChoice'))return !!home;
  const style=document.createElement('style');style.textContent='#editionChoice{width:min(100%,980px);margin:0 auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap}#editionChoice .edition-label{font-size:12px;color:#bccbd6;margin-right:6px}#editionChoice button{font:inherit;font-size:13px;min-height:44px;padding:9px 15px;border:1px solid #647d92;border-radius:4px;background:#101e2e;color:#c7d6e1;cursor:pointer}#editionChoice button[aria-pressed="true"]{border-color:#efce8b;background:#263747;color:#ffdf9f}#editionChoice button:focus-visible{outline:2px solid #fff;outline-offset:3px}#editionHint{flex-basis:100%;margin:0!important;font-size:11px;line-height:1.4!important;color:#a7bccb!important}';document.head.append(style);
  const box=document.createElement('section');box.id='editionChoice';box.setAttribute('aria-label','选择游戏版本');box.innerHTML='<span class="edition-label">画面版本</span><button id="chooseOriginal" type="button">原版 2D</button><button id="choose3D" type="button">月夜 3D</button><p id="editionHint">'+(original?'原版界面与画面':'全新立体月夜画面')+' · 两个版本共用进度</p>';
  home.insertBefore(box,document.getElementById('suiteCards'));
  for(const [id,value]of [['chooseOriginal','original'],['choose3D','3d']]){const b=document.getElementById(id);b.setAttribute('aria-pressed',String(value===edition));b.onclick=()=>window.MooncatchEdition.select(value)}return true;
 }
 const observer=new MutationObserver(()=>{if(mount())observer.disconnect()});observer.observe(document.documentElement,{childList:true,subtree:true});if(mount())observer.disconnect();
})();
