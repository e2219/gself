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
// Deterministic AudioContext: bounded voices, independent mute, pause/background/foreground.
let made=0,live=new Set();
class TestAudio{
 constructor(){this.currentTime=0;this.state='running';this.destination={}}
 resume(){this.state='running';return Promise.resolve()}
 createGain(){return {gain:{value:0,setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect(){return this},disconnect:noop}}
 createOscillator(){made++;const o={frequency:{setValueAtTime:noop},connect(g){return g},disconnect:noop,start:()=>live.add(o),stop:(at)=>{if(at===undefined){live.delete(o);o.onended?.()}else o.until=at}};return o}
 advance(dt){this.currentTime+=dt;for(const o of [...live])if(o.until<=this.currentTime){live.delete(o);o.onended?.()}}
}
sandbox.window.AudioContext=TestAudio;start('ion');assert.equal(run('musicEnabled'),false);els.music.onclick();assert.equal(run('sound'),false);assert.equal(storage['mooncatch-music'],'true');run('musicTick()');assert(made>0);
for(let i=0;i<200;i++){run('audio.advance(.72);musicTick()');assert(run('musicVoices.size<=10'))}
run('pause()');assert.equal(run('musicVoices.size'),0);assert.equal(live.size,0);const before=made;run('audio.advance(30);musicTick()');assert.equal(made,before);
run('audio.state="suspended";pause();update(3);musicTick()');assert(run('musicVoices.size>0'));sandbox.document.hidden=true;run('musicTick()');assert.equal(run('musicVoices.size'),0);sandbox.document.hidden=false;els.music.onclick();run('musicTick()');assert.equal(run('musicEnabled'),false);assert.equal(live.size,0);
console.log('V22 music PASS: original offline score, opt-in persistence, independent sound setting, bounded voices and pause/background cleanup');
