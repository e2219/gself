const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const noop=()=>{},els={},events={},storage={};let width=390,height=844;
const ctx=new Proxy({createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
const classes=()=>({toggle:noop,contains:()=>false});
function el(id){return els[id]??={hidden:false,disabled:false,textContent:'',style:{setProperty:noop},classList:classes(),setAttribute:noop,focus:noop,addEventListener:noop,getContext:()=>ctx,getBoundingClientRect:()=>({width,height,left:0,top:0})}}
let seed=22;const seededMath=Object.create(Math);seededMath.random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
const sandbox={document:{hidden:false,body:{classList:classes()},getElementById:el,querySelector:()=>({classList:classes()}),addEventListener:noop},window:{addEventListener:(k,f)=>events[k]=f},localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v},ResizeObserver:class{observe(){}},requestAnimationFrame:noop,devicePixelRatio:1,Math:seededMath,console};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dist/game.js','utf8'),sandbox);const run=s=>vm.runInContext(s,sandbox);
function start(world='classic',mode='timed',leg=0){run(`state='over';selectedWorld='${world}';selectedRun='${mode}';resize();start();legIndex=${leg}`)}
function isolate(){run('environment.nextWreck=environment.nextGate=Infinity;spawn=hazardClock=100;items=[];warnings=[];pending=[];wagerSlot=wagerSchedule.length;adventureSlot=adventureSchedule.length;routeSlot=routeSchedule.length;laserSlot=laserSchedule.length;bountySeen=true;expedition.seen=true')}
const reset=(mode='timed')=>{start('classic',mode);isolate();run('environment.nextWreck=environment.nextGate=Infinity;resumeShield=invincible=0')};
for(const size of [[320,568],[844,390],[960,510]]){
 [width,height]=size;reset();run("beginObjective({kind:'sling',duration:20});elapsed=3;globalThis.g=blackHoleGeometry();for(let i=0;i<3;i++){const o={rock:true,r:10,prevX:g.x-g.r,prevY:g.y,x:g.x+g.r,y:g.y};environmentalMeteor(o,.01);if(!o.dead)throw Error('hole missed swept rock')}");
 assert.equal(run('environment.swallowed'),3);assert.equal(run('environment.pulses.length'),1);assert(run('environment.pulses[0].fire-elapsed>=1.5'));
 run('stepEnvironmentalPulses(.1,ship.x,ship.y)');assert.equal(run('environment.loot.length'),0);assert.equal(run('hp'),3);
 run('elapsed=environment.pulses[0].fire+.1;stepEnvironmentalPulses(.1,ship.x,ship.y);stepEnvironmentalPulses(.1,ship.x,ship.y)');assert.equal(run('environment.loot.length'),3);
 run('pause()');const snap=run('JSON.stringify([environment,elapsed])');run('update(5)');assert.equal(run('JSON.stringify([environment,elapsed])'),snap);
 // Aimed physics throw: no teleport and earliest collision resolves once.
 reset();run('createGate();environment.wrecks=[];elapsed=3;ship.x=W*.25;ship.y=H*.34;environment.tow={x:.34,y:.34,vx:0,vy:0};boost()');assert.equal(run('environment.tow'),null);assert.equal(run('environment.shots.length'),1);
 run('for(let i=0;i<60;i++)stepEnvironment(1/120,ship.x,ship.y)');assert.equal(run('environment.gate.open'),true);assert.equal(run('environment.opened'),1);assert.equal(run('environment.shots.length'),0);
 run('ship.x=W*.78;ship.y=H*.49;stepEnvironment(.01,ship.x,ship.y)');const reward=run('score');run('stepEnvironment(.01,ship.x,ship.y)');assert.equal(run('score'),reward);
 reset();run('createGate();elapsed=3;globalThis.o={rock:true,r:11,prevX:0,prevY:H*.34,x:W,y:H*.34};environmentalMeteor(o,.1)');assert.equal(run('environment.gate.open'),true);assert.equal(run('o.dead'),true);
 reset();run('createGate();elapsed=3;environment.wrecks=[];ship.x=W*.3;ship.y=H*.34;environment.tow={x:.36,y:.34,vx:0,vy:0};items=[{rock:true,x:W*.44,y:H*.34,r:12}];boost();for(let i=0;i<60;i++)stepEnvironment(1/120,ship.x,ship.y)');assert.equal(run('environment.gate.open'),false);assert.equal(run('items[0].dead'),true);
 // The rope is visibly inertial, stays bounded and is shared by all screen sizes.
 reset();run('spawnWreck(.3,.4);elapsed=1;ship.x=W*.3;ship.y=H*.4;stepEnvironment(.01,ship.x,ship.y)');assert(run('environment.tow'));run('ship.x=W*.7;ship.y=H*.55;stepEnvironment(.1,ship.x,ship.y)');assert(run('Math.hypot(ship.x-environment.tow.x*W,ship.y-environment.tow.y*H)<=Math.min(48,Math.min(W,H)*.13)*1.81'));
 run('boss={x:W*.8,y:H*.3,r:30,hp:3,warning:0};environment.shots=[{x:.7,y:.3,vx:1,vy:0,life:2}];stepEnvironment(.2,ship.x,ship.y)');assert.equal(run('boss.hp'),2);
 // Relaxing mode has meaningful collection/planting, no timer loss and a clean manual exit.
 reset('relax');run('stepMeadow(0,ship.x,ship.y);for(const p of meadow.buds.slice(0,3)){ship.x=p.x*W;ship.y=p.y*H;stepMeadow(.01,ship.x,ship.y)}');assert.equal(run('meadow.seeds'),3);
 run('ship.x=W*.5;ship.y=H*.7;stepMeadow(.01,ship.x,ship.y);damage()');assert.equal(run('meadow.blooms'),1);assert.equal(run('hp'),3);
 run('elapsed=200;update(.01)');assert.equal(run('state'),'playing');assert.equal(run('boss'),null);run('endVoyage()');assert.equal(run('state'),'over');assert.match(els.message.textContent,/1 片星花/);assert.equal(run('bestKey()'),'mooncatch-relax-v25');
}
// Each branch changes actual resources, final hazard rate/opening, records and ending.
for(const choice of [0,1]){
 reset('adventure');assert.equal(run('time'),180);run(`elapsed=4;ship.x=W*${choice?.72:.28};ship.y=H*.44;stepJourney(0,ship.x,ship.y)`);assert.equal(run('researchTrip.choice'),choice);
 if(choice===0){run('for(const p of researchTrip.pods){ship.x=p.x*W;ship.y=p.y*H;stepJourney(.01,ship.x,ship.y);ship.x=W*.82;ship.y=H*.43;stepJourney(.01,ship.x,ship.y)}');assert.equal(run('researchTrip.rescued'),3)}
 else{run('hitGate(0);ship.x=W*.78;ship.y=H*.49;stepEnvironment(.01,ship.x,ship.y)');assert.equal(run('researchTrip.data'),1)}
 run('elapsed=60;stepJourney(0,ship.x,ship.y);elapsed=64;ship.x=W*.72;ship.y=H*.44;stepJourney(.01,ship.x,ship.y)');assert.equal(run('researchTrip.choice'),1);
 run('for(let i=0;i<2;i++){environment.tow={x:.7,y:.43,vx:0,vy:0};ship.x=W*.82;ship.y=H*.43;stepJourney(.01,ship.x,ship.y)}');assert.equal(run('researchTrip.energy'),2);
 run('elapsed=120;stepJourney(0,ship.x,ship.y)');assert.equal(run('researchTrip.exitAt'),160);assert.equal(run('researchTrip.chapter'),2);assert(run('difficulty().interval>2'));
 run('elapsed=160;ship.x=W*.82;ship.y=H*.43;stepJourney(.01,ship.x,ship.y)');assert.equal(run('state'),'over');assert.equal(run('researchTrip.extracted'),true);assert.equal(run('journeyEnding()'),choice?'文明火种':'载光归航');const score=run('score');run('finish()');assert.equal(run('score'),score);assert.equal(run('bestKey()'),'mooncatch-adventure-v25');
}
reset('adventure');run('elapsed=120;stepJourney(0,ship.x,ship.y)');assert.equal(run('researchTrip.exitAt'),172);run('elapsed=151;hitGate(0);stepJourney(0,0,0)');assert.equal(run('researchTrip.exitAt'),151);
reset('adventure');run('elapsed=180;update(.01)');assert.equal(run('state'),'over');assert.equal(run('researchTrip.extracted'),false);assert.match(els.title.textContent,/错过撤离/);
// The energy route generates feedable asteroids and usable loot through real simulation.
reset('adventure');run('elapsed=60;stepJourney(0,ship.x,ship.y);chooseJourneyRoute(0);ship.x=ship.target=W*.08;ship.y=ship.targetY=H*.2;invincible=100;for(let i=0;i<1500;i++)update(1/60)');assert(run('environment.swallowed>=3'));assert(run('environment.loot.length>0'));
// Long relax play covers each environment without enemy/boss failure or unbounded entities.
reset('relax');run('globalThis.peaks={items:0,loot:0,shots:0,garden:0};for(let i=0;i<10800;i++){update(1/60);peaks.items=Math.max(peaks.items,items.length);peaks.loot=Math.max(peaks.loot,environment.loot.length);peaks.shots=Math.max(peaks.shots,environment.shots.length);peaks.garden=Math.max(peaks.garden,meadow.garden.length);if(i%60===0)draw(i/60)}');assert.equal(run('state'),'playing');assert.equal(run('hp'),3);assert.equal(run('boss'),null);assert(run('peaks.items<100&&peaks.loot<=12&&peaks.shots<=4&&peaks.garden<=8'));
console.log('V25 PASS: swallowed meteors/telegraphed pulse/loot, tether inertia and swept throws, earliest-hit towers and boss shells, relaxing planting/manual exit/three environments, mission branch resources/endings/exit rules, isolated records and bounded three-minute simulation',run('JSON.stringify(peaks)'));
// Collision safety on both sides of a telegraphed gap; discarded waves cannot pay late.
for(const angle of [0,Math.PI])for(const accelerated of [false,true]){
 reset();run(`elapsed=2;environment.pulses=[{x:.5,y:.5,fire:1,end:4,gap:0,radius:Math.min(W,H)*.655,paid:true}];ship.x=W*.5+Math.cos(${angle})*Math.min(W,H)*.655;ship.y=H*.5+Math.sin(${angle})*Math.min(W,H)*.655;boostTime=${accelerated?1:0};stepEnvironmentalPulses(.01,ship.x,ship.y)`);
 assert.equal(run('hp'),angle===0||accelerated?3:2);
}
reset();run('elapsed=10;environment.pulses=[{x:.5,y:.5,fire:1,end:4,gap:0,radius:20,paid:false}];stepEnvironmentalPulses(.01,ship.x,ship.y)');assert.equal(run('environment.loot.length'),0);
// Relative swept paths also catch a meteor crossing a stationary wreck shot.
reset();run('items=[{rock:true,x:W*.5,y:H*.8,prevX:W*.5,prevY:H*.2,r:10}];globalThis.s={x:.5,y:.5,life:2};collideThrown(s,W*.5,H*.5)');assert.equal(run('items[0].dead'),true);
reset('relax');run('elapsed=201;time=0;hud()');assert.match(els.time.innerHTML,/201/);run('elapsed=202;hud()');assert.match(els.time.innerHTML,/202/);
// Resize a live pulse without moving its normalized centre or losing held keys.
reset();run('environment.pulses=[{x:.5,y:.5,radius:Math.min(W,H)*.3}];keys.add("d")');width=390;height=844;run('resize()');assert(run('Math.abs(environment.pulses[0].radius-Math.min(W,H)*.3)<.001'));assert(run('keys.has("d")'));
// Continuous finite-speed missions isolate navigation from combat; hazards are covered above.
// No coordinate jumps, fabricated resources, gate-open calls or skipped chapter time.
for(const size of [[390,844],[960,510]])for(const route of [0,1,2,3]){
 [width,height]=size;reset('adventure');run('invincible=1000;globalThis.routeStage=0;globalThis.maxStep=0;globalThis.collectedPath=[];globalThis.prevChapter=-1');
 for(let frame=0;frame<10800 && run('state')==='playing';frame++){
  run(`{
   const j=researchTrip,g=environment.gate;let tx=.82,ty=.43;
   if(j.chapter!==prevChapter){prevChapter=j.chapter;routeStage=0;collectedPath.push(j.chapter)}
   if(j.choice===null&&j.chapter<2){tx=j.chapter===0?${route%2?.72:.28}:${route>=2?.28:.72};ty=.44}
   else if(j.chapter===0&&j.choice===0){const pod=j.pods.find(p=>!p.taken);if(!j.carry&&pod){tx=pod.x;ty=pod.y}}
   else if(j.chapter===0&&j.choice===1&&g&&!g.claimed){
    if(g.open){tx=g.cache.x;ty=g.cache.y}
    else if(!environment.tow){const wreck=environment.wrecks[0];if(wreck){tx=wreck.x;ty=wreck.y}else if(!environment.shots.length)spawnWreck(.3,.49)}
    else {tx=.53;ty=routeStage===0?.43:.18;if(Math.hypot(ship.x-W*.53,ship.y-H*.43)<8)routeStage=1;
     const o=environment.tow,v=towLaunchVelocity(o),p=g.points[0],cross=impactTime(o.x*W-p.x*W,o.y*H-p.y*H,(o.x+v.vx*1.5)*W-p.x*W,(o.y+v.vy*1.5)*H-p.y*H,28);
     if(routeStage&&cross!==null&&Math.hypot(o.x*W-p.x*W,o.y*H-p.y*H)>20&&boostCooldown<=0){boost();routeStage=0}
    }
   }
   else if(j.chapter===1&&j.choice===0){const loot=environment.loot.find(p=>!p.taken);if(loot){tx=loot.x;ty=loot.y}else{tx=.85;ty=.75}if(objective?.kind==='sling'&&Math.hypot(ship.x-W*.5,ship.y-H*.46)<blackHoleGeometry().r*.8&&boostCooldown<=0)boost()}
   else if(j.chapter===1&&!environment.tow&&j.delivered<2){const wreck=environment.wrecks[0];if(wreck){tx=wreck.x;ty=wreck.y}}
   const ox=ship.x,oy=ship.y,dx=tx*W-ox,dy=ty*H-oy,d=Math.hypot(dx,dy)||1,step=Math.min(d,Math.min(W,H)*.55/60);
   inputMode='pointer';ship.target=ox+dx/d*step;ship.targetY=oy+dy/d*step;update(1/60);maxStep=Math.max(maxStep,Math.hypot(ship.x-ox,ship.y-oy));if(Math.floor(elapsed*60)%120===0)draw(elapsed);
  }`);
 }
 assert.equal(run('researchTrip.extracted'),true,`No continuous extraction ${size} route ${route}`);
 assert.equal(run('researchTrip.delivered'),route>=2?0:2);assert(run('researchTrip.energy')>=2);assert.equal(run('researchTrip.rescued'),route%2?0:3);assert.equal(run('researchTrip.data'),route%2?1:0);
 assert.equal(run('journeyEnding()'),route%2?'文明火种':'载光归航');assert(run('elapsed>=150&&elapsed<180'));assert(run('maxStep<Math.min(W,H)*.02'));
 console.log('Continuous mission PASS',size,route,run('JSON.stringify({elapsed,route:researchTrip.route,energy:researchTrip.energy,data:researchTrip.data,rescued:researchTrip.rescued,maxStep})'));
}
