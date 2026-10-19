const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const noop=()=>{},els={},events={},storage={};let width=390,height=844;
const ctx=new Proxy({createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
const classes=()=>({toggle:noop,contains:()=>false});
function el(id){return els[id]??={hidden:false,disabled:false,textContent:'',style:{setProperty:noop},classList:classes(),setAttribute:noop,focus:noop,addEventListener:noop,getContext:()=>ctx,getBoundingClientRect:()=>({width,height,left:0,top:0})}}
let seed=22;const seededMath=Object.create(Math);seededMath.random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
const sandbox={document:{hidden:false,body:{classList:classes()},getElementById:el,querySelector:()=>({classList:classes()}),addEventListener:noop},window:{addEventListener:(k,f)=>events[k]=f},localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v},ResizeObserver:class{observe(){}},requestAnimationFrame:noop,devicePixelRatio:1,Math:seededMath,console};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dist/game.js','utf8'),sandbox);const run=s=>vm.runInContext(s,sandbox);
function start(world='classic',mode='timed',leg=0){run(`state='over';selectedWorld='${world}';selectedRun='${mode}';resize();start();legIndex=${leg}`)}
function isolate(){run('spawn=hazardClock=100;items=[];warnings=[];pending=[];wagerSlot=wagerSchedule.length;adventureSlot=adventureSchedule.length;routeSlot=routeSchedule.length;laserSlot=laserSchedule.length;bountySeen=true;expedition.seen=true')}
// Higher cap is real: both emission and flight speed continue beyond the old level-6 cap.
const pressure=[];
for(const leg of [0,10,14,20,100]){
 start('classic','endless',leg);isolate();run('invincible=1000;hazardClock=4;globalThis.emitted=0;globalThis.volleyCount=0;globalThis.savedWarn=warnWave;warnWave=function(){const before=warnings.length;savedWarn();emitted+=warnings.length-before;volleyCount+=Number(warnings.slice(before).some(w=>w.variant===\'trident\'))};for(let i=0;i<3600;i++)update(1/60);warnWave=savedWarn');
 pressure.push(JSON.parse(run('JSON.stringify({leg:legIndex,speed:difficulty(0).speed,count:difficulty(0).count,emitted,volleyCount,interval:difficulty(90).interval})')));
 assert(run('state===\'playing\'&&items.length+warnings.length<130'));
}
assert(pressure[3].speed>pressure[1].speed);assert(pressure[3].emitted>pressure[1].emitted);assert(pressure[3].interval<pressure[1].interval);assert.equal(pressure[2].count,3);assert.equal(pressure[3].speed,pressure[4].speed);assert(pressure[3].volleyCount>0);
console.log('V22 pressure PASS:',JSON.stringify(pressure));
// Three edges, one frozen aim, equal travel time. No hidden retarget or surprise fragment.
for(const size of [[320,568],[844,390],[960,510]]){
 [width,height]=size;start('classic','endless',4);isolate();run('ship.x=W*.4;ship.y=H*.65;warnTrident(difficulty(),0)');
 assert.equal(run('warnings.length'),3);assert.equal(run('new Set(warnings.map(w=>w.edge)).size'),3);assert(run('warnings.every(w=>w.remaining>=1.5)'));
 const target=run('JSON.stringify(warnings.map(w=>[w.tx,w.ty]))');run('ship.x=W*.9;ship.y=H*.1');assert.equal(run('JSON.stringify(warnings.map(w=>[w.tx,w.ty]))'),target);
 run('globalThis.arrivals=warnings.map(w=>{const v=warningVector(w);return Math.hypot(w.tx*W-v.x,w.ty*H-v.y)/(w.speedScale*difficulty().speed)});warnings.forEach(spawnMeteor)');assert(run('Math.max(...arrivals)-Math.min(...arrivals)<1e-9'));
 run('for(const o of items)moveMeteor(o,arrivals[0],difficulty().speed)');assert(run('items.every(o=>Math.hypot(o.x-W*.4,o.y-H*.65)<1e-7&&o.trident)'));run('draw(1)');
}
// Exact field collisions, safe areas, warning boundaries, immunity, pause and reset.
for(const size of [[320,568],[844,390]])for(const kind of ['cross','zones']){
 [width,height]=size;start('ion');isolate();run(`elapsed=10;ship.x=W*.5;ship.y=H*.5;globalThis.field=makeField('${kind}',1.7);hazardFields=[field]`);
 run('stepField(field,ship.x,ship.y,false)');assert.equal(run('hp'),3);
 run('elapsed=field.fire+.1;stepField(field,ship.x,ship.y,true)');assert.equal(run('hp'),3);
 run('stepField(field,ship.x,ship.y,false)');assert.equal(run('hp'),2);
 run('invincible=0;ship.x=W*.05;ship.y=H*.05;stepField(field,ship.x,ship.y,false)');assert.equal(run('hp'),2);
 run('ship.x=W*.7;ship.y=H*.5;invincible=0;stepField(field,W*.3,H*.5,false)');assert.equal(run('hp'),1);
 run('invincible=0;elapsed=field.end+.1;stepField(field,ship.x,ship.y,false)');assert.equal(run('hp'),1);
 run('elapsed=11;pause()');const frozen=run('JSON.stringify([elapsed,hazardFields])');run('update(5)');assert.equal(run('JSON.stringify([elapsed,hazardFields])'),frozen);run('draw(1);start()');assert.equal(run('hazardFields.length'),0);
}
start('ion');isolate();run("elapsed=10;globalThis.boundary={kind:'cross',x:.5,y:.8,fire:9.9,end:12};ship.x=W*.9;ship.y=H*.2;stepField(boundary,W*.1,H*.2,false,1)");assert.equal(run('hp'),3,'Crossing before arming must not hurt');
run('elapsed=12.1;boundary.fire=10;ship.x=W*.9;stepField(boundary,W*.1,H*.2,false,1)');assert.equal(run('hp'),2,'Crossing during the active part of expiry frame must hurt');
console.log('V22 obstacles PASS: locked synchronized tridents, swept cross/zone damage, warning/expiry boundaries, safe areas, boost immunity, pause and cleanup');
// Ion map: ordered phase matching, harmless wrong phase, rewards once, independent record.
start('ion');isolate();run('elapsed=6;stepIon(0,ship.x,ship.y)');assert.equal(run('worldEvent.index'),0);
run('ship.x=worldEvent.points[1].x*W;ship.y=worldEvent.points[1].y*H;moonPhase=worldEvent.points[1].polarity;stepIon(0,ship.x,ship.y)');assert.equal(run('worldEvent.index'),0);
run("ship.x=worldEvent.points[0].x*W;ship.y=worldEvent.points[0].y*H;moonPhase=worldEvent.points[0].polarity==='bright'?'dark':'bright';stepIon(0,ship.x,ship.y)");assert.equal(run('worldEvent.index'),0);assert.equal(run('hp'),3);
run("hazardFields=[makeField('cross')];boostCooldown=5;for(let i=0;i<3;i++){const p=worldEvent.points[worldEvent.index];moonPhase=p.polarity;ship.x=p.x*W;ship.y=p.y*H;stepIon(0,ship.x,ship.y)}");assert.equal(run('worldWins'),1);assert.equal(run('score'),450);assert.equal(run('dust'),2);assert.equal(run('guard'),1);assert.equal(run('boostCooldown'),3);assert.equal(run('hazardFields.length'),0);
run('stepIon(0,ship.x,ship.y)');assert.equal(run('score'),450);run('elapsed=18;stepIon(0,0,0)');assert.equal(run('worldSlot'),2);run('elapsed=28.1;stepIon(0,0,0)');assert.equal(run('worldEvent'),null);assert.equal(run('worldWins'),1);
run('finish()');assert.match(els.hint.textContent,/接通回路 1\/5/);assert.doesNotMatch(els.hint.textContent,/信标链|折跃/);assert.equal(storage['mooncatch-best-ion-v13'],'450');start('classic');assert.notEqual(run('bestKey()'),'mooncatch-best-ion-v13');
console.log('V22 ion circuits PASS: ordering, both polarities, harmless mismatch, timed expiry, one-shot score/armor/clear/refill and separate records');
// All four boss variants really schedule their new skills and leave a way to counterattack.
for(const world of ['classic','aurora','warp','ion']){
 start(world,'endless',8);isolate();run('invincible=100;elapsed=70;updateBoss(0,0,0,true,0);globalThis.seenBoss=new Set();for(let i=0;i<1200;i++){elapsed+=1/60;stepStorm(1/60,ship.x,ship.y,false);if(storm.event)seenBoss.add(storm.event.kind);if(i%40===0)draw(elapsed)}');
 assert(run('seenBoss.has("lattice")'),world);assert(run('seenBoss.has("core")'),world);
}
for(const phase of ['bright','dark'])for(const size of [[320,568],[844,390]]){
 [width,height]=size;start('ion');isolate();run(`elapsed=70;updateBoss(0,0,0,true,0);boss.warning=0;globalThis.pulse={kind:'polarity',x:.5,y:.42,fire:73,end:76,gap:0,polarity:'${phase}'};elapsed=74;globalThis.pulseGeo=irisGeometry(pulse);ship.x=pulseGeo.x;ship.y=pulseGeo.y+pulseGeo.r;moonPhase='${phase}';storm.event=pulse;stepStorm(0,ship.x,ship.y,false)`);assert.equal(run('hp'),3);
 run("moonPhase=moonPhase==='bright'?'dark':'bright';stepStorm(0,ship.x,ship.y,false)");assert.equal(run('hp'),2);const hp=run('boss.hp');run('breakBossShell()');assert.equal(run('boss.hp'),hp);run(`moonPhase='${phase}';breakBossShell()`);assert.equal(run('boss.hp'),hp-1);run('draw(1)');
}
start('warp','endless',8);isolate();run("elapsed=70;updateBoss(0,0,0,true,0);storm.slot=1;elapsed=stormSchedule()[1].at;stepStorm(0,0,0,true);elapsed=storm.event.fire;boostTime=1;const gate=finaleGate(storm.event);ship.x=gate.x*W;ship.y=gate.y*H");assert.equal(run('storm.event.kind'),'lattice');assert(run('stepFinalePortal(ship.x,ship.y)'));assert(run('ship.y<boss.y'));
console.log('V22 bosses PASS: real new move schedules, polarity immunity/weakness, cross-beam evasion and warp rear-attack gate');
// Full playable route: traverse each node with actual bounded movement, no forced menus.
const trips=[];
for(const size of [[390,844],[844,390],[960,510]])for(const leg of [0,20]){
 [width,height]=size;start('ion','endless',leg);run('invincible=1000;inputMode="keyboard";globalThis.ionAudit={peak:0,wins:0,kinds:new Set(),fields:new Set()};');
 run(`for(let i=0;i<5500&&state==='playing';i++){
  const node=worldEvent?.points[worldEvent.index];if(node){ship.target=node.x*W;ship.targetY=node.y*H;if(moonPhase!==node.polarity&&moonCooldown===0)switchMoon(false)}
  else{ship.target=W*.5;ship.targetY=H*.8}
  update(1/60);ionAudit.wins=Math.max(ionAudit.wins,worldWins);for(const f of hazardFields)ionAudit.fields.add(f.kind);if(storm?.event)ionAudit.kinds.add(storm.event.kind);ionAudit.peak=Math.max(ionAudit.peak,items.length+warnings.length+shards.length);if(i%120===0)draw(elapsed)
 }`);
 assert.equal(run('state'),'dock');assert.equal(run('ionAudit.wins'),5);assert(run('ionAudit.peak<160'));assert(run('ionAudit.kinds.has("polarity")&&ionAudit.kinds.has("lattice")&&ionAudit.kinds.has("core")'));assert(run('ionAudit.fields.has("cross")&&ionAudit.fields.has("zones")'));assert.equal(run('hazardFields.length'),0);
 trips.push({size,leg,peak:run('ionAudit.peak')});run('departDock()');assert.equal(run('worldSlot'),0);assert.equal(run('worldEvent'),null);
}
console.log('V22 full voyages PASS:',JSON.stringify(trips));
// V23 vector models must not change physics, rewards, collision radii or objective state.
const modelLabels=[];ctx.fillText=(value)=>modelLabels.push(String(value));
for(const tier of ['clear','smooth'])for(const size of [[320,568],[390,844],[844,390],[960,510]]){
 [width,height]=size;start('classic','endless',6);isolate();run(`renderMode='${tier}';elapsed=18;beginObjective({kind:'cargo',duration:12});objective.load=2;hazardFields=[makeField('cross'),makeField('zones')];expedition.chain={index:1,until:36,points:[{x:.22,y:.45},{x:.53,y:.28},{x:.78,y:.48}]}`);
 const snap=()=>run('JSON.stringify([ship,score,hp,elapsed,objective,hazardFields,expedition.chain,particles,items])');const before=snap();
 for(let i=0;i<20;i++)run(`drawAdventure(${i/3});drawSupplyChain(${i/3});hazardFields.forEach(drawField);drawMeteor({x:100,y:100,r:14,dx:0,dy:-1,trident:true},${i/3})`);
 assert.equal(snap(),before);run('navigationHud()');assert.match(els.navigationCue.textContent,/货舱 2\/3/);assert.equal(els.navigationCue.hidden,false);
 run('beginObjective({kind:"rings",duration:12});objective.index=1;drawAdventure(1);navigationHud()');assert.match(els.navigationCue.textContent,/导航星环 2\/4/);
 start('ion');run('elapsed=6;stepIon(0,ship.x,ship.y);worldEvent.index=1');const ion=run('JSON.stringify(worldEvent)');run('drawIon(1);drawIon(2);navigationHud()');assert.equal(run('JSON.stringify(worldEvent)'),ion);assert.match(els.navigationCue.textContent,/下一点 2/);
 run('pause();navigationHud()');assert.equal(els.navigationCue.hidden,true);run('state="playing";boss={hp:3};navigationHud()');assert.equal(els.navigationCue.hidden,true);
}
assert(modelLabels.includes('02')&&modelLabels.includes('03')&&modelLabels.includes('明月'));
let rotations=[];ctx.rotate=a=>rotations.push(a);run('drawMeteor({x:0,y:0,r:14,dx:0,dy:-1,trident:true},0)');assert.equal(rotations[0],-Math.PI/2);delete ctx.rotate;delete ctx.fillText;
console.log('V23 models/UI PASS: four sizes × two quality tiers, read-only cargo/beacons/hazards, completed/next labels, vertical trident direction and pause/boss cue isolation');

// Media playback regressions, including late promises, blocked playback and source switches.
class TestAudio{
 constructor(){this.state='running';this.destination={}}
 resume(){this.state='running';return Promise.resolve()}
 createGain(){return {gain:{value:0},connect(){return this}}}
 createMediaElementSource(){return {connect(g){return g}}}
}
let plays=0,failPlay=false,latePlay=null;
class TestMedia{
 constructor(){this.paused=true;this.currentTime=0;this.listeners={};this.muted=false}
 addEventListener(name,fn){this.listeners[name]=fn}
 play(){plays++;this.paused=false;return failPlay?Promise.reject(Error('blocked')):latePlay?new Promise(resolve=>latePlay.resolve=resolve):Promise.resolve()}
 pause(){this.paused=true}
 load(){this.currentTime=0;this.paused=true}
}
sandbox.window.AudioContext=TestAudio;els.backgroundMusic=new TestMedia();
(async()=>{
 start('ion');assert.equal(run('musicEnabled'),false);els.music.onclick();await new Promise(setImmediate);
 assert.equal(run('sound'),false);assert.equal(storage['mooncatch-music'],'true');assert(run('musicPlayer.loop&&!musicPlayer.paused&&musicPlayer.preload==="none"'));assert.equal(run('musicPlayer.src'),'audio/floating-cities.mp3');
 run('musicPlayer.currentTime=32;pause()');assert(run('musicPlayer.paused'));assert.equal(run('musicPlayer.currentTime'),32);
 run('pause()');await new Promise(setImmediate);assert(run('musicPlayer.paused'));run('update(3);musicTick()');await new Promise(setImmediate);assert(run('!musicPlayer.paused'));assert.equal(run('musicPlayer.currentTime'),32);
 els.musicTrack.value='dream-culture';els.musicTrack.onchange();await new Promise(setImmediate);assert.equal(storage['mooncatch-music-track'],'dream-culture');assert(run('musicPlayer.src==="audio/dream-culture.mp3"&&musicPlayer.currentTime===0&&!musicPlayer.paused'));
 els.musicTrack.value='https://untrusted.invalid';els.musicTrack.onchange();assert.equal(run('musicTrack'),'dream-culture');
 sandbox.document.hidden=true;run('musicTick()');assert(run('musicPlayer.paused'));sandbox.document.hidden=false;
 failPlay=true;run('musicTick()');await new Promise(setImmediate);assert(run('musicBlocked'));const count=plays;for(let i=0;i<60;i++)run('musicTick()');assert.equal(plays,count,'Blocked playback must not retry every frame');
 failPlay=false;els.music.onclick();els.music.onclick();await new Promise(setImmediate);assert(run('!musicBlocked&&!musicPlayer.paused'));
 run('stopMusic()');latePlay={};run('musicTick()');els.music.onclick();latePlay.resolve();await new Promise(setImmediate);assert(run('!musicEnabled&&musicPlayer.paused&&!musicPending'));latePlay=null;
 els.music.onclick();await new Promise(setImmediate);run("musicPlayer.listeners.error()");assert(run('musicBlocked&&musicPlayer.paused'));assert.match(els.musicStatus.textContent,/未能播放/);
 console.log('V22.1 recorded music PASS: two local tracks, single player, opt-in, independent SFX, retained offset, countdown silence, mute/late promise, source switch, error backoff and gesture retry');
})().catch(e=>{console.error(e);process.exitCode=1});

// V24: the field never seizes control, and drift works with every driver and frame rate.
for(const size of [[320,568],[844,390],[960,510]]){
 [width,height]=size;
 for(const driver of ['pointer','keyboard','virtual']){
  start();isolate();run(`inputMode='${driver}';beginObjective({kind:'sling',duration:12});ship.x=ship.target=W*.5+blackHoleGeometry().r*.6;ship.y=ship.targetY=H*.56`);
  const x=run('ship.x');run('for(let i=0;i<60;i++)update(1/60)');assert.equal(run('ship.x'),x,'formation warning must not pull');
  run('for(let i=0;i<120;i++)update(1/60)');assert(run('ship.x<ship.target+1e-8&&ship.x<'+x),'stationary target must drift');assert(run('objective.exposure>=.25'));
  run('boostCooldown=0;boost();for(let i=0;i<70;i++)update(1/60)');assert.equal(run('slingWins'),1);assert.equal(run('objective.kind'),'sling');assert.equal(run('objective.rewarded'),true);
  const bonus=run('score');run('stepBlackHole(.1);stepBlackHole(.1)');assert.equal(run('score'),bonus,'escape pays once');
 }
 start();isolate();run("beginObjective({kind:'sling',duration:12});elapsed=3;ship.x=ship.target=W*.5;ship.y=ship.targetY=H*.56;stepBlackHole(.01)");assert.equal(run('hp'),2);assert(run('Number.isFinite(ship.x+ship.y)'));
 run('hp=3;invincible=0;boostTime=1;stepBlackHole(.01)');assert.equal(run('hp'),3);
 run('boostTime=0;ship.x=W*.9;ship.y=H*.56;stepBlackHole(.01,W*.1,H*.56)');assert.equal(run('hp'),2,'fast mouse crossing must hit core');
 run('pause()');const frozen=run('JSON.stringify([objective,ship,elapsed])');run('update(5)');assert.equal(run('JSON.stringify([objective,ship,elapsed])'),frozen);
 run("state='playing';elapsed=13;updateAdventure(.01,ship.x,ship.y)");assert.equal(run('objective'),null);
}
const driftSamples=[];
for(const fps of [30,60,120]){
 start();isolate();run("beginObjective({kind:'sling',duration:12});inputMode='pointer';ship.x=ship.target=W*.5+blackHoleGeometry().r*.8;ship.y=ship.targetY=H*.56;invincible=100");
 run(`for(let i=0;i<${fps*4};i++)update(1/${fps})`);driftSamples.push(run('ship.x'));
}
assert(Math.max(...driftSamples)-Math.min(...driftSamples)<2,'pull should not depend on refresh rate');
// Busy primary objectives own the scene; hidden supply cannot tick down or collect.
start('classic','endless');isolate();run("expedition.seen=false;elapsed=18;stepSupplyChain(0,0,0);globalThis.deadline=expedition.chain.until;beginObjective({kind:'cargo',duration:12});elapsed+=2;stepSupplyChain(2,0,0)");
assert.equal(run('expedition.chain.until'),run('deadline+2'));assert.equal(run('expedition.chain.index'),0);assert.equal(run('supplyBusy()'),true);
run('objective=null;fork=null;elapsed+=.1;stepSupplyChain(.1,0,0)');assert(run('expedition.chain.armed>elapsed'));
for(const world of ['ion','warp']){
 start(world,'endless');isolate();run('expedition.seen=false;elapsed=18;stepSupplyChain(0,0,0)');assert.equal(run('expedition.chain'),null);
 run('expedition.modules.coil=2;boostCooldown=5;mapSupplyReward();mapSupplyReward()');assert(Math.abs(run('boostCooldown')-.2)<1e-8);assert.equal(run('expedition.completed'),1);assert.equal(run('expedition.credits'),1);assert.equal(run('score'),105);assert.equal(run('dust'),2);
}
// The drawings are recognizably different and completed targets leave no icon behind.
const labels=[];ctx.fillText=t=>labels.push(t);run("drawNavBeacon(100,100,2,0,{active:true});drawMoonBeacon(100,100,'dark',0,{active:true})");assert.deepEqual(labels,['02','暗月']);
labels.length=0;run("drawNavBeacon(100,100,1,0,{done:true});drawMoonBeacon(100,100,'bright',0,{done:true})");assert.equal(labels.length,0);
console.log('V24 PASS: distinct numeric/lunar targets, conflict scheduling and one-time map supplies; three drivers/screens, warm-up, cumulative pull, boost escape, swept core, center stability, pause/expiry and 30/60/120Hz drift',driftSamples);
