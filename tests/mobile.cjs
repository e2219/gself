const vm=require('node:vm');
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('dist/index.html','utf8');
const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://localhost'}),w=dom.window;
const noop=()=>{},ctx=new Proxy({createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
w.HTMLCanvasElement.prototype.getContext=()=>ctx;w.HTMLElement.prototype.getBoundingClientRect=()=>({width:390,height:844,left:0,top:0});
w.ResizeObserver=class{observe(){}};w.requestAnimationFrame=noop;const calls=[];
w.MooncatchNative={files:{setAwake:async v=>calls.push(v),getInsets:async()=>({top:32,bottom:16,left:0,right:0}),exportBackup:async ({text})=>{calls.push(JSON.parse(text))},importBackup:async()=>({text:JSON.stringify({app:'mooncatch',format:1,data:{'mooncatch-world':'warp'}})})},App:{exitApp:async()=>calls.push('exit')}};
w.MooncatchSaveChanged=async()=>calls.push('save');
for(const file of ['dist/profile-data.js','dist/game.js','dist/profile-ui.js','mobile/native-runtime.js'])vm.runInContext(fs.readFileSync(file,'utf8'),dom.getInternalVMContext());
const run=s=>vm.runInContext(s,dom.getInternalVMContext()),el=id=>w.document.getElementById(id);
(async()=>{
 assert(run('focusMode&&canvasOnly'));assert(w.MooncatchIsHome());assert(!el('nativeHome').hidden);
 assert(el('nativePicks').querySelector('.worlds'));el('world-aurora').click();assert.equal(run('selectedWorld'),'aurora');
 el('nativeStart').click();assert.equal(run('state'),'playing');assert(el('nativeHome').hidden);
 w.MooncatchBack();assert.equal(run('state'),'paused');assert(run('panelOpen'));
 el('mode-stick').click();assert.equal(run('driverMode()'),'stick');assert.equal(w.localStorage.getItem('mooncatch-canvas-controls'),'stick');
 w.MooncatchBack();assert(!run('panelOpen'));assert.equal(run('state'),'paused');el('start').click();assert.equal(run('state'),'resuming');run('update(3)');assert.equal(run('state'),'playing');
 w.MooncatchLifecycle(false);assert.equal(run('state'),'paused');assert(run('resumeSafetyPending'));w.MooncatchLifecycle(true);assert.equal(run('state'),'paused');el('start').click();assert.equal(run('state'),'resuming');run('update(3)');assert(run('resumeShield>=1.5'));
 run('dust=3;offerUpgrade()');assert.equal(run('state'),'upgrade');w.MooncatchBack();assert.equal(run('state'),'paused');assert.equal(run('upgradeCount'),0);assert(el('upgrade').hidden);
 el('start').click();w.MooncatchBack();el('nativeReturn').click();assert(w.MooncatchIsHome());assert.equal(run('state'),'ready');assert(!run('panelOpen'));
 el('nativeSettings').click();assert(run('panelOpen'));assert(!el('gamePanel').hidden);
 await el('saveExport').onclick();assert(calls.some(c=>c?.app==='mooncatch'));
 await el('saveImport').onclick();assert(!el('saveApply').hidden);assert.equal(w.localStorage.getItem('mooncatch-world'),'aurora');el('saveCancel').click();assert(el('saveApply').hidden);
 el('sound').click();assert.equal(w.localStorage.getItem('mooncatch-sound'),'true');
 w.MooncatchBack();w.MooncatchBack();await new Promise(r=>setTimeout(r,0));assert(calls.includes('exit'));
 assert.equal(w.document.documentElement.style.getPropertyValue('--native-safe-top'),'32px');
 // Insets are delivered in the event's detail and never change the selected control scheme.
 w.dispatchEvent(new w.CustomEvent('mooncatchInsets',{detail:{top:0,right:34,left:0,bottom:10}}));assert.equal(w.document.documentElement.style.getPropertyValue('--native-safe-right'),'34px');assert.equal(run('driverMode()'),'stick');
 // Dock survives native back/settings and background without starting the next leg.
 el('nativeStart').click();run("activeRun=selectedRun='endless';elapsed=90;expedition.credits=1;nextLeg()");
 assert.equal(run('state'),'dock');assert(!el('dock').hidden);assert.equal(run('expedition.picks'),2);
 w.MooncatchBack();assert(run('panelOpen'));w.MooncatchLifecycle(false);w.MooncatchLifecycle(true);w.MooncatchBack();assert.equal(run('state'),'dock');assert(!run('panelOpen'));
 el('module2').click();el('dockApply').click();assert.equal(run('expedition.modules.ward'),1);assert.equal(run('state'),'dock');
 el('dockLaunch').click();assert.equal(run('state'),'playing');assert(run('resumeShield>=3'));assert(run('guard>=2'));
 // Native pause is reachable without opening settings and background cancels preparation.
 assert(!el('canvasPause').hidden);el('canvasPause').click();assert.equal(run('state'),'paused');assert(!run('panelOpen'));
 el('canvasPause').click();assert.equal(run('state'),'resuming');assert.equal(calls.at(-1).awake,true);
 run('update(1)');assert.equal(el('resumeNumber').textContent,'2');w.MooncatchLifecycle(false);assert.equal(run('state'),'paused');assert(el('resumeCue').hidden);
 w.MooncatchLifecycle(true);assert.equal(run('state'),'paused');el('start').click();run('update(3)');assert.equal(run('state'),'playing');assert(run('resumeShield>=1.5'));
 // A hold does not replace the cancel surface; late/synthetic pointer clicks cannot go home.
 run('pause();pause()');const frozenRun=run('JSON.stringify([elapsed,score,hp,ship.x,ship.y])');
 el('resumeCancel').dispatchEvent(new w.Event('pointerdown',{bubbles:true}));assert.equal(run('state'),'resuming');assert(!el('resumeCue').hidden);
 el('resumeCancel').dispatchEvent(new w.Event('pointerup',{bubbles:true}));
 el('resumeCancel').dispatchEvent(new w.MouseEvent('click',{bubbles:true,detail:1}));assert.equal(run('state'),'paused');assert(el('resumeCue').hidden);
 for(const id of ['nativeResultHome','nativeReturn'])el(id).dispatchEvent(new w.MouseEvent('click',{bubbles:true,detail:1}));
 assert(!w.MooncatchIsHome());assert.equal(run('state'),'paused');assert.equal(run('JSON.stringify([elapsed,score,hp,ship.x,ship.y])'),frozenRun);
 el('resumeCancel').dispatchEvent(new w.MouseEvent('click',{bubbles:true,detail:1}));assert.equal(run('state'),'paused');
 el('nativeResultHome').dispatchEvent(new w.Event('pointerdown',{bubbles:true}));el('nativeResultHome').dispatchEvent(new w.Event('pointercancel',{bubbles:true}));el('nativeResultHome').dispatchEvent(new w.MouseEvent('click',{bubbles:true,detail:1}));assert(!w.MooncatchIsHome());
 el('nativeResultHome').dispatchEvent(new w.Event('pointerdown',{bubbles:true}));el('nativeResultHome').dispatchEvent(new w.Event('pointerup',{bubbles:true}));el('nativeResultHome').dispatchEvent(new w.MouseEvent('click',{bubbles:true,detail:1}));assert(w.MooncatchIsHome());
 el('nativeStart').click();run('pause()');el('nativeResultHome').click();assert(w.MooncatchIsHome()); // Keyboard/accessibility activation remains available.
 console.log('Native click-through PASS: complete cancel gesture, delayed navigation rejection, duplicate cancel, cancelled pointer, fresh navigation and keyboard activation');
 el('world-ion').click();assert.equal(run('selectedWorld'),'ion');el('music').click();assert.equal(w.localStorage.getItem('mooncatch-music'),'true');assert.equal(el('music').getAttribute('aria-pressed'),'true');el('music').click();
 el('nativeStart').click();run('elapsed=6;stepIon(0,ship.x,ship.y)');assert.equal(run('worldEvent.points.length'),3);w.MooncatchBack();el('nativeReturn').click();assert(w.MooncatchIsHome());
 for(const mode of ['relax','adventure']){
  el('run-'+mode).click();assert.equal(run('selectedRun'),mode);assert(w.document.body.classList.contains('special-run'));assert(el('runHint').textContent.length>10);if(run('state')==='ready')assert.equal(el('time').textContent,mode==='adventure'?'180s':'0s');
  el('nativeStart').click();assert.equal(run('state'),'playing');assert.equal(run('activeRun'),mode);assert(!el('endRun').hidden);
  assert.equal(run('boss'),null);assert(!el('moonToggle').disabled);const moon=run('moonPhase');el('moonToggle').click();assert.notEqual(run('moonPhase'),moon);run('dust=10;hud()');assert(!el('upgradeReady').hidden);w.MooncatchBack();const frozen=run('JSON.stringify([environment,researchTrip,meadow,elapsed])');run('update(10)');assert.equal(run('JSON.stringify([environment,researchTrip,meadow,elapsed])'),frozen);
  el('endRun').click();assert.equal(run('state'),'over');assert(!run('panelOpen'));assert.equal(run('bestKey()'),'mooncatch-'+mode+'-v25');
  el('nativeResultHome').click();assert(w.MooncatchIsHome());
 }
 el('run-timed').click();assert(!w.document.body.classList.contains('special-run'));assert.equal(run('activeWorld'),'ion');
 console.log('V25 native DOM PASS: mode selection, descriptions, pause freezes new entities, manual results and return to original map');
 assert(calls.some(c=>c?.awake===false));assert(calls.some(c=>c?.awake===true));
 dom.window.close();console.log('Native DOM PASS: fullscreen home, selection, back stack, controls, foreground safety, optional upgrade, backup preview/cancel, sound persistence and safe insets');
})().catch(e=>{console.error(e);process.exitCode=1;dom.window.close()});
