'use strict';
(function(){
 const native=window.MooncatchNative;
 document.body.classList.add('native-app');setFocused(true);setCanvasOnly(true);
 const home=document.createElement('section');home.id='nativeHome';home.className='native-home';
 home.innerHTML='<header><div><span class="eyebrow">MOONCATCH</span><h1>月面拾光</h1></div><button id="nativeSettings">设置</button></header><div id="nativePicks"></div><div class="native-start-row"><button id="nativeStart" class="primary">开始航行 →</button><span>离线版 __APP_VERSION__</span></div>';
 $('playShell').appendChild(home);
 const art=$('harborArt');if(art){art.classList.add('native-harbor');home.querySelector('header').after(art)}
 const picks=home.querySelector('#nativePicks');
 for(const selector of ['.run-picker','.worlds','.fleet:not(.worlds)']){const el=document.querySelector(selector);if(el)picks.appendChild(el)}
 const returnButton=document.createElement('button');returnButton.id='nativeReturn';returnButton.textContent='结束本局并返回主菜单';$('controlSettings').appendChild(returnButton);
 const resultHome=document.createElement('button');resultHome.id='nativeResultHome';resultHome.textContent='返回主菜单';document.querySelector('#overlay .dialog').appendChild(resultHome);
 let atHome=true;
 window.MooncatchIsHome=()=>atHome;
 window.MooncatchResumeChanged=()=>native.files.setAwake({awake:!atHome&&['playing','resuming'].includes(state)}).catch(()=>{});
 window.MooncatchDockChanged=()=>native.files.setAwake({awake:!atHome&&['playing','resuming'].includes(state)}).catch(()=>{});
 function setHome(value){atHome=value;home.hidden=!value;document.body.classList.toggle('native-at-home',value);$('nativeReturn').hidden=value;native.files.setAwake({awake:!value&&state==='playing'}).catch(()=>{});}
 function goHome(){
  if(panelOpen)closePanel(false);
  if(!['ready','over'].includes(state))finish();
  clearInput();state='ready';$('upgrade').hidden=$('wager').hidden=true;hudSignature=worldSignature=fleetSignature=runHudSignature='';hud();setHome(true);
  window.MooncatchSaveChanged?.();
 }
 $('nativeStart').onclick=()=>{setHome(false);start();native.files.setAwake({awake:true}).catch(()=>{});};
 $('nativeSettings').onclick=()=>openPanel('controls');
 // A delayed compatibility click from a disappearing dialog must not end the run.
 let homePress=null;
 document.addEventListener('pointerdown',e=>{homePress=[$('nativeReturn'),resultHome].find(b=>b.contains(e.target))||null},true);
 document.addEventListener('pointercancel',()=>{homePress=null},true);
 window.addEventListener('blur',()=>{homePress=null});
 for(const button of [$('nativeReturn'),resultHome])button.onclick=e=>{
  const fresh=!e||e.detail===0||homePress===button;homePress=null;e?.stopPropagation();
  if(fresh)goHome();
 };
 window.MooncatchBack=()=>{
  if(panelOpen){closePanel(false);return}
  if(atHome){window.MooncatchSaveChanged?.().then(()=>native.App.exitApp()).catch(()=>{});return}
  if(state==='over'){goHome();return}
  if(state==='dock'){openPanel('controls');return}
  if(state==='wager'){skipWager();return}
  if(state==='upgrade'){$('upgrade').hidden=true;offers=[];state='paused';resumeSafetyPending=true;show('已暂停','强化仍可稍后选择。','继续航行 →');hud();return}
  if(state==='menuIntro'){menuIntro=null;$('menuCue').hidden=true;state='playing'}
  openPanel('controls');
 };
 window.MooncatchLifecycle=active=>{
  if(!active){
   homePress=null;clearInput();if(state==='playing'||state==='resuming')pause();else if(state==='menuIntro'){menuIntro=null;$('menuCue').hidden=true;state='playing';pause()}
   resumeSafetyPending=true;window.MooncatchSaveChanged?.();audio?.suspend().catch(()=>{});
   native.files.setAwake({awake:false}).catch(()=>{});
  }else{if(sound||musicEnabled)audio?.resume().catch(()=>{});native.files.setAwake({awake:!atHome&&['playing','resuming'].includes(state)}).catch(()=>{});}
 };
 function insets(value){for(const side of ['top','right','bottom','left'])document.documentElement.style.setProperty('--native-safe-'+side,Math.max(0,Number(value[side])||0)+'px')}
 window.addEventListener('mooncatchInsets',event=>insets(event.detail));native.files.getInsets().then(insets).catch(()=>{});
 // Physical pause/resume remains explicit, while settings and record writes persist in native storage.
 const originalPause=pause;pause=function(){originalPause();native.files.setAwake({awake:!atHome&&['playing','resuming'].includes(state)}).catch(()=>{})};
 const originalClose=closePanel;closePanel=function(resume=true){originalClose(resume);native.files.setAwake({awake:!atHome&&['playing','resuming'].includes(state)}).catch(()=>{})};
 const originalStart=$('start').onclick;$('start').onclick=()=>{setHome(false);originalStart();if(sound||musicEnabled)audio?.resume().catch(()=>{});native.files.setAwake({awake:true}).catch(()=>{})};
 setHome(true);resize();document.getElementById('nativeBoot')?.remove();
})();
