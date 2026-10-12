const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const els={},events={},docEvents={},elementEvents={},storage={},noop=()=>{};
const classList=()=>({values:new Set(),toggle(k,v){if(v)this.values.add(k);else this.values.delete(k)},contains(k){return this.values.has(k)}});
const ctx=new Proxy({createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
let width=960,height=510,resizeCallback;
function el(id){return els[id]??={style:{},classList:classList(),attributes:{},captures:new Set(),textContent:'',innerHTML:'',hidden:false,disabled:false,setAttribute:function(k,v){this.attributes[k]=v},focus:function(){sandbox.document.activeElement=this},closest:()=>null,addEventListener:(name,f)=>{elementEvents[id+':'+name]=f},setPointerCapture:function(id){this.captures.add(id)},releasePointerCapture:function(id){this.captures.delete(id)},getContext:()=>ctx,getBoundingClientRect:function(){return this.bounds||{width,height,left:0,top:0}}}}
const sandbox={document:{body:{classList:classList()},getElementById:el,querySelector:()=>({classList:{toggle:noop}}),addEventListener:(n,f)=>docEvents[n]=f},window:{addEventListener:(n,f)=>events[n]=f},localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v},ResizeObserver:class{constructor(callback){resizeCallback=callback}observe(){}},devicePixelRatio:1,requestAnimationFrame:noop,Math,console};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dist/game.js','utf8'),sandbox);
const run=x=>vm.runInContext(x,sandbox);
const isolate=()=>run('spawn=hazardClock=100;items=[];pending=[];warnings=[];shards=[];dust=0;perfectReady=false;wagerSlot=wagerSchedule.length;adventureSlot=adventureSchedule.length;routeSlot=routeSchedule.length;laserSlot=laserSchedule.length');
const hit=rock=>run(`items=[{x:ship.x,y:shipY(),r:9,v:0,rock:${rock},a:0}];update(.01)`);
run('start()');isolate();for(let i=0;i<10;i++)hit(false);assert.equal(run('score'),170);
run('items=[{x:0,y:H+21,r:9,v:0,rock:false,a:0}];update(.01)');assert.equal(run('combo'),0);
// Boost ignores incoming damage, covers a useful distance, and cannot be spammed.
run('ship.direction=1;boost()');const x=run('ship.x');hit(true);assert.equal(run('hp'),3);assert.equal(run('ship.x'),x);
const cd=run('boostCooldown');run('boost()');assert.equal(run('boostCooldown'),cd);
run('boostTime=0');hit(true);assert.equal(run('hp'),2);hit(true);assert.equal(run('hp'),2);
// A star between the old and new ship position must be caught during a boost.
run('boostCooldown=0;ship.x=ship.target=200;ship.direction=1;boost();ship.target=400;items=[{x:250,y:shipY(),r:9,v:0,rock:false,a:0}];update(.05)');assert.equal(run('combo'),1);
run('pause()');assert.equal(run('state'),'paused');assert(els.boost.disabled);run('pause()');assert.equal(run('state'),'playing');
run('elapsed=29.99;update(.02)');assert.equal(run('phase'),1);run('elapsed=59.99;update(.02)');assert.equal(run('phase'),2);
run('boostTime=0;combo=0;score=0');hit(false);assert.equal(run('score'),20);
// Warning precedes hazards before they enter the arena.
isolate();run('warnWave()');assert.equal(run('warnings.length'),2);assert.equal(run('items.length'),0);for(let i=0;i<40;i++)run('update(.05)');assert.equal(run('warnings.length'),0);assert(run('items.filter(o=>o.rock).length')>0);
run('start()');isolate();run('starWave()');assert.equal(run('pending.length'),6);assert(run('pending.every(p=>p.x>=.1&&p.x<=.9)'));
// Terminal states and records reset cleanly.
run('score=234;hp=1;invincible=boostTime=0');hit(true);assert.equal(run('state'),'over');assert.equal(storage['mooncatch-best-v6'],'234');
run('start()');assert.equal(run('phase'),0);assert.equal(run('boostCooldown'),0);assert.equal(run('warnings.length'),0);assert.equal(run('score'),0);
run('elapsed=89.99;update(.02)');assert.equal(run('state'),'over');assert.equal(run('time'),0);
width=340;height=330;run('resize();start();starWave();warnWave();draw(1)');assert(run('ship.x>=24&&ship.x<=W-24'));
events.keydown({key:' ',target:{tagName:'CANVAS'},preventDefault:noop,repeat:false});assert(run('boostTime')>0);
events.keydown({key:'p',target:{tagName:'CANVAS'},preventDefault:noop,repeat:false});assert.equal(run('state'),'paused');
console.log('V2 regression PASS: combo, miss, boost immunity/no-auto-movement/cooldown/swept collision, damage cooldown, pause, phases, double score, hazard telegraph, patterns, loss/record/restart/time limit, mobile draw and keyboard controls');

// Mobile: touch-down does not teleport, a second finger boostes without steering.
width=360;height=420;run('resize();start()');isolate();
const touch=(id,x)=>({pointerId:id,clientX:x,pointerType:'touch',preventDefault:noop});
const before=run('ship.target');elementEvents['sky:pointerdown'](touch(1,40));assert.equal(run('ship.target'),before);
elementEvents['sky:pointermove'](touch(1,70));assert.equal(run('ship.target'),before+30);
elementEvents['sky:pointerdown'](touch(2,330));assert(run('boostTime')>0);assert.equal(run('ship.target'),before+30);
elementEvents['sky:pointermove'](touch(2,10));assert.equal(run('ship.target'),before+30);
elementEvents['sky:pointercancel'](touch(1,70));assert.equal(run('movePointer'),2);const handoffTarget=run('ship.target');
elementEvents['sky:pointermove'](touch(2,20));assert.equal(run('ship.target'),handoffTarget+20);
elementEvents['sky:pointerup'](touch(2,20));assert.equal(run('movePointer'),null);
run('pause()');assert.equal(run('touches.size'),0);run('pause();boostCooldown=0');
elementEvents['boost:pointerdown']({preventDefault:noop,stopPropagation:noop});assert(run('boostTime')>0);
els.hand.onclick();assert.equal(storage['mooncatch-left-hand'],'true');
// Breaking a rock makes a collectible, but non-boost invulnerability does not.
run('start()');isolate();run('boostTime=.3;items=[{x:ship.x,y:shipY(),v:0,a:0,r:12,rock:true}];update(.01)');
assert.equal(run('hp'),3);assert.equal(run('shards.length'),1);assert.equal(run('dust'),0);
for(let i=0;i<30;i++)run('update(.01)');assert.equal(run('dust'),1);assert.equal(run('score'),25);
run('shards=[];boostTime=0;invincible=1');hit(true);assert.equal(run('shards.length'),0);assert.equal(run('hp'),3);
// Upgrade screen freezes all gameplay, offers two valid choices, and resumes explicitly.
run('dust=3;offerUpgrade()');assert.equal(run('state'),'upgrade');assert.equal(run('offers.length'),2);assert.notEqual(run('offers[0].id'),run('offers[1].id'));
const frozen=run('[time,boostCooldown,elapsed].join()');run('update(1)');assert.equal(run('[time,boostCooldown,elapsed].join()'),frozen);
const chosen=run('offers[0].id');run('chooseUpgrade(0)');assert.equal(run('powers["'+chosen+'"]'),1);assert.equal(run('state'),'paused');assert.equal(run('upgradeCount'),1);
run('chooseUpgrade(0)');assert.equal(run('upgradeCount'),1);run('pause()');assert.equal(run('state'),'playing');
run('powers={magnet:2,echo:0,chain:0};dust=8;offerUpgrade()');assert(run('offers.every(p=>p.id!=="magnet")'));
run('chooseUpgrade(1);pause();dust=15;offerUpgrade();chooseUpgrade(0);pause();dust=24;offerUpgrade();chooseUpgrade(0);pause();dust=50;offerUpgrade()');assert.equal(run('upgradeCount'),4);assert.equal(run('state'),'playing');
// Magnet pulls in an otherwise missed star; echo catches without damaging the real ship.
run('start()');isolate();run('powers.magnet=1;items=[{x:ship.x+80,y:shipY()-10,v:0,a:0,r:9,rock:false}]');
const distance=run('items[0].x-ship.x');run('update(.05)');assert(run('items[0].x-ship.x')<distance);
for(let i=0;i<15;i++)run('update(.05)');assert.equal(run('combo'),1);
run('start()');isolate();run('powers.echo=1;ship.x=ship.target=80;boost();boostTime=0;ship.x=ship.target=260;items=[{x:80,y:shipY(),v:0,a:0,r:9,rock:false}];update(.01)');assert.equal(run('combo'),1);assert(run('echoes.length')>0);
run('items=[{x:80,y:shipY(),v:0,a:0,r:12,rock:true}];update(.01)');assert.equal(run('hp'),3);
// Chain reaction is bounded and does not duplicate shard drops.
run('start()');isolate();run('powers.chain=1;items=[{x:50,y:100,rock:true},{x:110,y:100,rock:true},{x:170,y:100,rock:true},{x:300,y:100,rock:true}];shatter(items[0])');
assert.equal(run('shards.length'),3);assert(!run('items[3].dead'));run('shatter(items[0])');assert.equal(run('shards.length'),3);
run('start()');assert.equal(run('dust'),0);assert.equal(run('echoes.length'),0);assert.equal(run('powers.chain'),0);assert.equal(run('upgradeCount'),0);assert(els.upgrade.hidden);
run('powers={magnet:2,echo:2,chain:2};boost();shards=[{x:80,y:80,life:1}];rings=[{x:80,y:80,radius:85,life:.2}];draw(1)');
console.log('V3 PASS: relative touch, two-finger boost, cancel/release handoff, immediate button, handedness, shard collection, upgrade freeze/choice/caps/reset, magnet, echo, bounded chain, mobile draw');

// V3.1: activating boost never moves the ship by itself, even near an edge.
run('start()');isolate();run('ship.x=ship.target=30;boost();update(.05)');assert.equal(run('ship.x'),30);
run('update(.05)');assert.equal(run('ship.x'),30);
// Exact double keyboard speed, instant reversal, no drift on release.
run('start()');isolate();run('ship.x=ship.target=180;keys.add("d");update(.05)');const normalMove=run('ship.x')-180;
run('start()');isolate();run('ship.x=ship.target=180;boost();keys.add("d");update(.05)');assert(Math.abs(run('ship.x')-180-normalMove*2)<1e-8);
const right=run('ship.x');run('keys.delete("d");keys.add("a");update(.05)');assert(run('ship.x')<right);
events.keyup({key:'a'});const stopped=run('ship.x');run('update(.05)');assert.equal(run('ship.x'),stopped);
// Same mouse destination, faster approach during boost, no overshoot.
run('start()');isolate();run('ship.x=ship.target=100;pointer({clientX:300});update(.05)');const normalMouse=run('ship.x');assert.equal(normalMouse,300);
run('start()');isolate();run('ship.x=ship.target=100;boost();pointer({clientX:300});update(.05)');assert.equal(run('ship.x'),normalMouse);
for(let i=0;i<20;i++)run('update(.05)');assert.equal(run('ship.x'),300);
// Touch is more responsive during boost, then stops immediately on release.
run('start()');isolate();run('ship.x=ship.target=180;boost()');elementEvents['sky:pointerdown'](touch(10,50));elementEvents['sky:pointermove'](touch(10,60));assert.equal(run('ship.target'),200);
elementEvents['sky:pointerup'](touch(10,60));run('update(.05)');assert.equal(run('ship.x'),200);run('update(.05)');assert.equal(run('ship.x'),200);
// Expiry returns to normal speed and collision damage.
run('start()');isolate();run('boost();boostTime=.01;update(.02);ship.x=ship.target=180;keys.add("d");update(.05)');assert(Math.abs(run('ship.x')-180-normalMove)<1e-8);
run('keys.clear();ship.target=ship.x;invincible=0');hit(true);assert.equal(run('hp'),2);
console.log('V3.1 PASS: stationary activation, double keyboard speed, reversal/release, mouse approach, touch gain/release, normal speed and damage after expiry');

// V4 regression: falling stars below the ship used to hover forever at +33px.
for(const fps of [30,60,120]){
 width=960;height=510;run('resize();start()');isolate();
 run('powers.magnet=1;items=[{x:ship.x,y:shipY()+40,v:220,a:0,r:9,rock:false}]');
 for(let i=0;i<fps;i++)run('update('+1/fps+')');
 assert.equal(run('items.length'),0);assert.equal(run('score'),10);
 for(let i=0;i<fps;i++)run('update('+1/fps+')');assert.equal(run('score'),10);
}
// All-around pickup, including underside cyan shards, at both magnet tiers.
for(const level of [1,2])for(const [dx,dy] of [[0,70],[0,-70],[-70,0],[70,0]]){
 run('start()');isolate();run('powers.magnet='+level+';shards=[{x:ship.x+('+dx+'),y:shipY()+('+dy+'),age:0,life:5,locked:false}]');
 for(let i=0;i<60;i++)run('update(1/60)');assert.equal(run('dust'),1);assert.equal(run('score'),25);assert.equal(run('shards.length'),0);
}
// No pointer speed backlog: a fast swipe reaches the target on the next frame.
width=360;height=420;run('resize();start()');isolate();elementEvents['sky:pointerdown'](touch(21,30));elementEvents['sky:pointermove'](touch(21,160));run('update(1/120)');assert.equal(run('ship.x'),310);
elementEvents['sky:pointerup'](touch(21,160));run('update(1/120)');assert.equal(run('ship.x'),310);
// Mouse stays aligned during boost and after expiry.
run('start()');isolate();run('pointer({clientX:100});update(.01);boost();pointer({clientX:120});update(.01)');assert.equal(run('ship.x'),120);
run('boostTime=0;pointer({clientX:130});update(.01)');assert.equal(run('ship.x'),130);
// Perfect reward once per activation, even when several rocks break together.
run('start()');isolate();run('boost();items=[{x:ship.x,y:shipY(),r:12,v:0,a:0,rock:true},{x:ship.x+5,y:shipY(),r:12,v:0,a:0,rock:true}];update(.01)');assert.equal(run('perfectCount'),1);assert.equal(run('score'),50);assert.equal(run('shards.length'),4);assert(run('slowTime')>0);
run('start()');isolate();run('boost();update(.2);items=[{x:ship.x,y:shipY(),r:12,v:0,a:0,rock:true}];update(.01)');assert.equal(run('perfectCount'),0);
// Recharge, armor and combo insurance have distinct, capped effects.
run('start();powers.capacitor=1;boostCooldown=2;collectDust()');assert.equal(run('boostCooldown'),1.75);
run('powers.capacitor=2;boostCooldown=.1;collectDust()');assert.equal(run('boostCooldown'),0);
run('start();guard=1;combo=7;damage()');assert.equal(run('hp'),3);assert.equal(run('guard'),0);assert.equal(run('combo'),7);
run('invincible=0;damage()');assert.equal(run('hp'),2);assert.equal(run('combo'),0);
run('start();powers.streak=1;combo=7;boost();missStar();missStar()');assert.equal(run('combo'),7);run('missStar()');assert.equal(run('combo'),0);
run('start();state="upgrade";offers=[powersList.find(p=>p.id==="aegis")];chooseUpgrade(0)');assert.equal(run('guard'),1);
run('state="upgrade";offers=[powersList.find(p=>p.id==="aegis")];chooseUpgrade(0)');assert.equal(run('guard'),3);
// Giant meteor warns first; optional safe lane; one shell per distinct boost.
run('start()');isolate();run('elapsed=69.99;update(.02)');assert(run('boss.warning')>0);assert.equal(run('boss.hp'),3);
run('elapsed=72;boss.warning=0;boss.y=shipY()-36;ship.x=ship.target=24;updateBoss(.01,.01,24,false)');assert.equal(run('hp'),3);
run('ship.x=ship.target=W/2;boostSerial=1;updateBoss(.01,.01,ship.x,true)');assert.equal(run('boss.hp'),2);
run('updateBoss(.01,.01,ship.x,true)');assert.equal(run('boss.hp'),2);
run('boostSerial=2;updateBoss(.01,.01,ship.x,true);boostSerial=3;updateBoss(.01,.01,ship.x,true)');assert.equal(run('boss.hp'),0);assert.equal(run('score'),600);
run('updateBoss(.01,.01,ship.x,true)');assert.equal(run('score'),600);
run('start()');isolate();run('elapsed=72;updateBoss(.01,.01,ship.x,false);boss.warning=0;boss.y=shipY()-36;ship.x=ship.target=W/2;updateBoss(.01,.01,ship.x,false)');assert.equal(run('hp'),2);
// New features pause and reset, and both 360px and desktop scenes render.
run('pause()');const frozenBoss=run('JSON.stringify([boss,perfectWindow,slowTime,boostCooldown])');run('update(1)');assert.equal(run('JSON.stringify([boss,perfectWindow,slowTime,boostCooldown])'),frozenBoss);
run('pause();draw(1);start()');assert.equal(run('boss'),null);assert.equal(run('guard'),0);assert.equal(run('perfectCount'),0);assert.equal(run('powers.capacitor'),0);
console.log('V4 PASS: underside magnet equilibrium at 30/60/120fps, radial shards, no pointer backlog, perfect window and one-shot reward, recharge/armor/insurance, boss warning/safe lane/3-hit reward/damage, pause/reset');

// V5: offers pause the world, skipping is free, and the two schedule slots are consumed once.
run('start()');isolate();run('wagerSlot=0;elapsed=18;maybeOfferWager()');assert.equal(run('state'),'wager');assert.equal(run('wagerOffers.length'),2);assert.notEqual(run('wagerOffers[0].id'),run('wagerOffers[1].id'));
const offerFreeze=run('[elapsed,time,boostCooldown].join()');run('update(1)');assert.equal(run('[elapsed,time,boostCooldown].join()'),offerFreeze);
run('score=123;skipWager()');assert.equal(run('state'),'paused');run('pause()');assert.equal(run('state'),'playing');assert.equal(run('score'),123);assert.equal(run('wagerSlot'),1);run('maybeOfferWager()');assert.equal(run('state'),'playing');
run('elapsed=46;maybeOfferWager()');assert.equal(run('state'),'wager');run('skipWager();pause();maybeOfferWager()');assert.equal(run('state'),'playing');assert.equal(run('wagerSlot'),2);
function accept(id){run('state="wager";wagerOffers=[wagerTypes.find(w=>w.id==="'+id+'")];chooseWager(0);pause();resumeShield=0')}
// Quiet wager: success queues one bonus; boost still works when it forfeits the wager.
run('start()');isolate();accept('quiet');run('pause()');const contractFreeze=run('activeWager.remaining');run('update(5)');assert.equal(run('activeWager.remaining'),contractFreeze);run('pause();elapsed=10;tickWager()');assert.equal(run('wagersWon'),1);assert.equal(run('bonusCredits'),1);run('tickWager()');assert.equal(run('bonusCredits'),1);
run('offerUpgrade()');assert.equal(run('upgradeSource'),'wager');run('chooseUpgrade(0)');assert.equal(run('upgradeCount'),0);assert.equal(run('bonusUpgradeCount'),1);assert.equal(run('bonusCredits'),0);
run('start()');isolate();accept('quiet');run('score=55;boostCooldown=1;boost()');assert(run('activeWager'));run('boostCooldown=0;boost()');assert.equal(run('activeWager'),null);assert(run('boostTime')>0);assert.equal(run('score'),55);assert.equal(run('wagersFailed'),1);assert.equal(run('bonusCredits'),0);
// Armor is allowed in safe wager; base shield damage fails without score penalties.
run('start()');isolate();accept('safe');run('guard=1;score=77;damage()');assert(run('activeWager'));assert.equal(run('hp'),3);run('invincible=0;damage()');assert.equal(run('activeWager'),null);assert.equal(run('score'),77);
// Gold star objective excludes shards, succeeds once, and expires if incomplete.
run('start()');isolate();accept('stars');run('collectDust()');assert.equal(run('activeWager.progress'),0);
for(let i=0;i<8;i++)run('collectStar({x:ship.x,y:shipY()})');assert.equal(run('wagersWon'),1);assert.equal(run('bonusCredits'),1);
run('collectStar({x:ship.x,y:shipY()})');assert.equal(run('bonusCredits'),1);
run('start()');isolate();accept('stars');run('elapsed=10;tickWager()');assert.equal(run('wagersFailed'),1);assert.equal(run('bonusCredits'),0);
// A bonus and a dust upgrade ready together never stack dialogs or consume each other.
run('start();dust=3;bonusCredits=1;offerUpgrade()');assert.equal(run('upgradeSource'),'wager');run('chooseUpgrade(0);pause();offerUpgrade()');assert.equal(run('upgradeSource'),'dust');run('chooseUpgrade(0)');assert.equal(run('upgradeCount'),1);assert.equal(run('bonusUpgradeCount'),1);
// Gravity twin catches from below and above; expired echo targets fall back to the real ship.
width=960;height=510;run('resize();start()');isolate();run('powers.magnet=1;powers.echo=1;ship.x=ship.target=700;echoes=[{x:200,y:shipY(),life:2}];items=[{x:200,y:shipY()+55,v:220,a:0,r:9,rock:false}];shards=[{x:230,y:shipY()-55,age:0,life:5,locked:false}]');
for(let i=0;i<60;i++)run('update(1/60)');assert.equal(run('items.length'),0);assert.equal(run('shards.length'),0);assert.equal(run('combo'),1);assert.equal(run('dust'),1);assert.equal(run('score'),35);
run('start()');isolate();run('powers.magnet=1;powers.echo=1;ship.x=ship.target=350;echoes=[{x:200,y:shipY(),life:.02}];items=[{x:200,y:shipY()+75,v:220,a:0,r:9,rock:false}]');for(let i=0;i<90;i++)run('update(1/60)');assert.equal(run('items.length'),0);assert.equal(run('score'),10);
// Without magnet, an echo does not attract remote objects.
run('start()');isolate();run('powers.echo=1;ship.x=ship.target=700;echoes=[{x:200,y:shipY(),life:2}];items=[{x:200,y:shipY()-80,v:0,a:0,r:9,rock:false}];update(.05)');assert.equal(run('items[0].captured'),undefined);
// Shield nova destroys nearby rocks once, retains combo, and cannot remove boss shells.
run('start()');isolate();run('powers.aegis=1;powers.chain=1;guard=1;combo=9;boss={hp:3};items=[{x:ship.x+45,y:shipY(),rock:true},{x:ship.x-40,y:shipY(),rock:true},{x:ship.x+300,y:shipY(),rock:true}];damage()');assert.equal(run('hp'),3);assert.equal(run('combo'),9);assert.equal(run('shards.length'),2);assert.equal(run('boss.hp'),3);assert(!run('items[2].dead'));run('damage()');assert.equal(run('shards.length'),2);
// Flow: exactly once per five gold stars, cooldown and grace stay bounded.
run('start();powers.capacitor=1;powers.streak=1;boostCooldown=3;grace=0');for(let i=0;i<4;i++)run('collectStar({x:0,y:0})');assert.equal(run('boostCooldown'),3);run('collectStar({x:0,y:0})');assert.equal(run('boostCooldown'),2.5);assert.equal(run('grace'),1);
run('boostCooldown=.1;grace=2');for(let i=0;i<5;i++)run('collectStar({x:0,y:0})');assert.equal(run('boostCooldown'),0);assert.equal(run('grace'),2);
// Upgrade previews expose synergy; unlock is immediate; restart clears all wager state.
run('start();powers.magnet=1;state="upgrade";offers=[powersList.find(p=>p.id==="echo")];chooseUpgrade(0)');assert(run('hasSynergy("gravity")'));assert(run('synergyHint("echo").includes("引力双生")'));
run('start()');assert.equal(run('wagerSlot'),0);assert.equal(run('activeWager'),null);assert.equal(run('bonusCredits'),0);assert.equal(run('bonusUpgradeCount'),0);assert.equal(run('flowProgress'),0);assert(els.wager.hidden);
console.log('V5 PASS: wager schedule/skip/freeze/success/failure/bonus separation, gravity pickup and expiry fallback, shield nova, five-star flow, synergy hints/reset');
// Real echo pickup advances the gold wager; timed offers cannot cover an upgrade dialog.
run('start()');isolate();accept('stars');run('activeWager.progress=7;powers.echo=1;ship.x=ship.target=700;echoes=[{x:200,y:shipY(),life:2}];items=[{x:200,y:shipY(),v:0,a:0,r:9,rock:false}];update(.01)');assert.equal(run('wagersWon'),1);assert.equal(run('state'),'playing');assert(!els.upgradeReady.hidden);els.upgradeReady.onclick();assert.equal(run('state'),'menuIntro');run('update(.8)');assert.equal(run('state'),'upgrade');assert.equal(run('upgradeSource'),'wager');assert(els.wager.hidden);
run('start();elapsed=18;dust=3;offerUpgrade();maybeOfferWager()');assert.equal(run('state'),'upgrade');assert.equal(run('wagerSlot'),0);assert(els.wager.hidden);
run('chooseUpgrade(0);pause();maybeOfferWager()');assert.equal(run('state'),'wager');assert(els.upgrade.hidden);assert(els.overlay.hidden);
console.log('PASS: actual echo wager progress and automatic menu priority');

{
// V6: real keyboard events move vertically, diagonals normalize, and release stops movement.
width=960;height=510;run('resize();start()');isolate();
const key=(type,k)=>events[type]({key:k,target:{tagName:'CANVAS'},preventDefault:noop,repeat:false});
const origin=run('[ship.x,ship.y]');key('keydown','w');run('update(.1)');
const cardinal=origin[1]-run('ship.y');assert(cardinal>40);assert.equal(run('ship.x'),origin[0]);
key('keyup','w');const stopped=run('ship.y');run('update(.1)');assert.equal(run('ship.y'),stopped);
run('start()');isolate();key('keydown','ArrowUp');key('keydown','ArrowRight');run('update(.1)');
assert(Math.abs(run('Math.hypot(ship.x-W/2,ship.y-H*.68)')-cardinal)<1e-8);
run('start()');isolate();key('keydown','s');run('boost();update(.1)');assert(Math.abs(run('ship.y-H*.68')-cardinal*2)<1e-8);
run('ship.y=ship.targetY=H-29;update(.1)');assert.equal(run('ship.y'),height-28);
// Two-finger control preserves both coordinates through boost and pointer handoff.
width=360;height=480;run('resize();start()');isolate();
const touchXY=(id,x,y)=>({...touch(id,x),clientY:y});
const mobileY=run('ship.y');elementEvents['sky:pointerdown'](touchXY(1,40,80));run('update(.01)');assert.equal(run('ship.y'),mobileY);
elementEvents['sky:pointermove'](touchXY(1,60,50));run('update(.01)');assert.equal(run('ship.x'),200);assert.equal(run('ship.y'),mobileY-30);
elementEvents['sky:pointerdown'](touchXY(2,310,420));elementEvents['sky:pointermove'](touchXY(2,320,400));run('update(.01)');assert.equal(run('ship.y'),mobileY-30);
elementEvents['sky:pointermove'](touchXY(1,65,40));run('update(.01)');assert.equal(run('ship.x'),210);assert.equal(run('ship.y'),mobileY-50);
elementEvents['sky:pointerup'](touchXY(1,65,40));elementEvents['sky:pointermove'](touchXY(2,310,390));run('update(.01)');assert.equal(run('ship.x'),190);assert.equal(run('ship.y'),mobileY-70);
elementEvents['sky:pointercancel'](touchXY(2,310,390));const released=run('[ship.x,ship.y].join()');run('update(.05)');assert.equal(run('[ship.x,ship.y].join()'),released);
// Relative swept circles handle crossing movement but reject diagonal near misses.
width=960;height=510;run('resize();start()');isolate();
run('ship.x=ship.target=200;ship.y=ship.targetY=100;inputMode="pointer";ship.targetY=400;items=[{x:200,y:250,r:12,v:0,rock:true,a:0}];update(.01)');assert.equal(run('hp'),2);
run('ship.x=300;ship.y=300');assert(!run('touchesPath({x:100,y:300},100,100,28)'));
assert(run('touchesPath({prevX:300,prevY:100,x:100,y:300},100,100,28)'));
run('start()');isolate();run('ship.x=ship.target=200;ship.y=ship.targetY=250;items=[{x:100,y:250,dx:1,dy:0,speedScale:30,r:12,rock:true,a:0}];update(.05)');assert.equal(run('hp'),2);
// All four edges warn first, launch inward, and hold their launch direction after the player moves.
run('start()');isolate();run('warnWave();warnWave();warnWave();warnWave()');assert.equal(run('new Set(warnings.map(w=>w.edge)).size'),4);assert.equal(run('items.length'),0);
assert(run('warnings.every(w=>w.remaining>=1.25)'));
run('warnings.forEach(spawnMeteor)');assert(run('items.every(o=>o.dx*(W/2-o.x)+o.dy*(H/2-o.y)>0)'));
const direction=run('JSON.stringify(items.map(o=>[o.dx,o.dy]))');run('warnings=[];ship.x=ship.target=24;ship.y=ship.targetY=28;update(.01)');assert.equal(run('JSON.stringify(items.map(o=>[o.dx,o.dy]))'),direction);
for(let t=1;t<=90;t++)assert(run(`difficulty(${t}).speed>difficulty(${t-1}).speed && difficulty(${t}).interval<difficulty(${t-1}).interval && difficulty(${t}).count>=difficulty(${t-1}).count`));
assert(run('difficulty(90).speed/difficulty(0).speed>2 && difficulty(90).speed/difficulty(0).speed<2.4'));assert.equal(run('difficulty(59).count'),1);assert.equal(run('difficulty(90).count'),2);assert(run('difficulty(90).interval>=1.1'));
run('start()');isolate();run('ship.x=ship.target=24;ship.y=ship.targetY=28;items=[{x:500,y:250,dx:1,dy:0,speedScale:1,r:12,rock:true,a:0}];update(.01)');const earlySpeed=run('items[0].x-500');run('items[0].x=500;elapsed=85;bossStarted=true;update(.01)');assert(run('items[0].x-500')>earlySpeed*2);assert(run('items[0].x-500')<earlySpeed*2.4);
// Echo remains at the 2D departure point; attraction and expiry use the correct Y coordinate.
run('start()');isolate();run('powers.echo=1;powers.magnet=1;ship.x=ship.target=200;ship.y=ship.targetY=100;boost();ship.x=ship.target=700;ship.y=ship.targetY=400;items=[{x:200,y:165,v:220,a:0,r:9,rock:false}]');
for(let i=0;i<30;i++)run('update(1/60)');assert.equal(run('echoes[0].y'),100);assert.equal(run('score'),10);
run('items=[{x:700,y:340,v:220,a:0,r:9,rock:false,captured:true,echoTarget:echoes[0]}];echoes=[]');for(let i=0;i<30;i++)run('update(1/60)');assert.equal(run('score'),20);
// Resize, pause and restart do not leave stale input or invalid moving objects.
run('warnWave();warnings.forEach(spawnMeteor);draw(1)');width=360;height=480;run('resize();draw(2)');assert(run('items.every(o=>Number.isFinite(o.x)&&Number.isFinite(o.y)&&(!("v" in o)||Number.isFinite(o.v)))'));
run('pause()');const freeze=run('JSON.stringify([ship,items,warnings,elapsed])');run('update(.5)');assert.equal(run('JSON.stringify([ship,items,warnings,elapsed])'),freeze);
run('start()');assert.equal(run('hazardWave'),0);assert.equal(run('ship.targetY'),run('ship.y'));
console.log('V6 PASS: 2D keyboard/normalized diagonals/boost/bounds, touch XY and handoff, swept crossings and near misses, four-edge telegraphs, fixed trajectories, continuous difficulty, 2D echo attraction/expiry, resize/pause/reset');

}

// V6.1 pose easing is independent of frame rate and never delays ship position.
{
 width=960;height=510;run('resize();start()');isolate();
 const angles=[];
 for(const fps of [30,60,120]){
  run('flight=newFlight();ship.x=300;ship.y=200');
  for(let i=0;i<fps/2;i++)run(`updateFlight(${1/fps},ship.x-3,ship.y)`);
  angles.push(run('flight.angle'));
 }
 assert(Math.abs(angles[0]-angles[2])<1e-10);
 run('flight.angle=Math.PI-.01;ship.x=100;ship.y=100;updateFlight(.01,103,100.03)');
 assert(run('Math.abs(flight.angle)>3')); // shortest turn across the +/-pi seam
 run('start()');isolate();run('inputMode="pointer";ship.target=230;ship.targetY=170;update(1/120)');
 assert.equal(run('ship.x'),230);assert.equal(run('ship.y'),170);assert(run('flight.trail.length')>0);
 for(let i=0;i<100;i++)run('update(1/120)');
 assert.equal(run('ship.x'),230);assert.equal(run('ship.y'),170);assert.equal(run('flight.trail.length'),0);assert(run('flight.throttle<.001'));
 run('powers.echo=1;flight.angle=.7;boost()');assert.equal(run('echoes[0].angle'),.7);
 for(let i=0;i<200;i++)run('updateFlight(.001,ship.x-1,ship.y)');assert(run('flight.trail.length<=32'));
 run('draw(3);pause()');assert.equal(run('flight.trail.length'),0);run('start()');assert.equal(run('flight.angle'),-Math.PI/2);assert.equal(run('flight.throttle'),0);
 console.log('V6.1 PASS: frame-rate-independent pose, shortest rotation, immediate 2D position/stop, fading bounded trails, echo orientation and reset');
}

// V6.2: use the actual independent pad handlers, including a held finger across an upgrade.
{
 width=360;height=380;run('resize();start()');isolate();
 const pad=els.touchPad;
 const event=(id,x,y,type='touch')=>({pointerId:id,clientX:x,clientY:y,pointerType:type,currentTarget:pad,preventDefault:noop});
 const down=e=>elementEvents['touchPad:pointerdown'](e),move=e=>elementEvents['touchPad:pointermove'](e),up=e=>elementEvents['touchPad:pointerup'](e);
 const original=run('[ship.x,ship.y].join()');
 down(event(30,50,600));run('update(.01)');assert.equal(run('[ship.x,ship.y].join()'),original);assert(pad.captures.has(30));
 move(event(30,70,590));run('update(.01)');assert.equal(run('ship.x'),213);assert(Math.abs(run('ship.y')-(height*.68-16.5))<1e-8);
 up(event(30,70,590));const stoppedAt=run('[ship.x,ship.y].join()');down(event(31,140,680));run('update(.01)');assert.equal(run('[ship.x,ship.y].join()'),stoppedAt);
 // Upgrade releases capture. Moving the old finger, even after resume, is ignored.
 run('dust=3;offerUpgrade()');assert.equal(run('state'),'upgrade');assert(!pad.captures.has(31));assert.equal(run('touches.size'),0);assert.equal(pad.attributes['data-active'],'false');assert(els.padBoost.disabled);
 run('chooseUpgrade(0);pause()');move(event(31,20,510));run('update(.01)');assert.equal(run('[ship.x,ship.y].join()'),stoppedAt);
 down(event(32,10,700));run('update(.01)');assert.equal(run('[ship.x,ship.y].join()'),stoppedAt);
 move(event(32,20,690));run('update(.01)');assert.equal(run('ship.x'),229.5);
 // Separate boost button leaves steering attached to the pad and doubles pad movement.
 elementEvents['padBoost:pointerdown']({preventDefault:noop,stopPropagation:noop});assert.equal(run('movePointer'),32);assert(run('boostTime>0'));assert.equal(els.padBoostLabel.textContent,'加速中');assert(els.padBoost.disabled);
 move(event(32,25,685));run('update(.01)');assert.equal(run('ship.x'),246);
 run('pause()');assert.equal(run('touches.size'),0);assert(!pad.captures.has(32));assert.equal(pad.attributes['aria-disabled'],'true');
 // A mouse on a narrow-screen pad uses the same relative control, never absolute arena coordinates.
 run('start()');isolate();const mouseOrigin=run('ship.x');down(event(40,80,600,'mouse'));run('update(.01)');assert.equal(run('ship.x'),mouseOrigin);move(event(40,90,610,'mouse'));run('update(.01)');assert.equal(run('ship.x'),mouseOrigin+16.5);
 elementEvents['touchPad:lostpointercapture'](event(40,90,610,'mouse'));move(event(40,200,800,'mouse'));const cancelled=run('ship.x');run('update(.01)');assert.equal(run('ship.x'),cancelled);
 run('start()');isolate();down(event(50,80,600));down(event(51,160,600));assert(run('boostTime>0'));assert.equal(run('movePointer'),50);
 console.log('V6.2 PASS: independent relative pad, lift/re-anchor, upgrade capture release/stale input rejection/resume, separate boost, pause/cancel, pad mouse and second-finger boost');
}

// Restart button works from play, pause, upgrade and results, without carrying old inputs or rewards.
for(const previous of ['playing','paused','upgrade','wager','over']){
 run('start()');isolate();
 run(`state="${previous}";score=500;elapsed=65;time=25;hp=1;dust=8;powers.magnet=2;boostCooldown=4;bonusCredits=1;keys.add("w");ship.target=24;items=[{x:30,y:40}];warnings=[{remaining:1}]`);
 els.restart.onclick();
 assert.equal(run('state'),'playing');assert.equal(run('score'),0);assert.equal(run('time'),90);assert.equal(run('hp'),3);assert.equal(run('dust'),0);assert.equal(run('powers.magnet'),0);assert.equal(run('boostCooldown'),0);assert.equal(run('bonusCredits'),0);assert.equal(run('keys.size'),0);assert.equal(run('items.length+warnings.length'),0);assert.equal(run('ship.target'),run('ship.x'));assert(els.overlay.hidden&&els.upgrade.hidden&&els.wager.hidden);
}
console.log('V6.3 PASS: gentler escalating difficulty and restart button from every game state');

// V6.4: automatic menus have a frozen transition; return shields begin only on explicit continue.
{
 run('start()');isolate();run('dust=3;items=[{x:100,y:100,v:200,r:12,rock:true,a:0}];offerUpgrade(true)');
 assert.equal(run('state'),'menuIntro');assert(!els.menuCue.hidden);assert(els.pause.disabled&&els.padBoost.disabled);
 const frozen=run('JSON.stringify([elapsed,time,boostCooldown,items,hazardClock])');run('update(.4)');assert.equal(run('state'),'menuIntro');assert.equal(run('JSON.stringify([elapsed,time,boostCooldown,items,hazardClock])'),frozen);
 run('update(.4)');assert.equal(run('state'),'upgrade');assert(els.menuCue.hidden);assert.equal(run('JSON.stringify([elapsed,time,boostCooldown,items,hazardClock])'),frozen);
 // Both accepting and skipping a wager now wait; each menu exit grants a full 1.5s.
 for(const choice of ['upgrade','accept','skip']){
  run('start()');isolate();
  if(choice==='upgrade')run('dust=3;offerUpgrade();chooseUpgrade(0)');
  else {run('state="wager";wagerOffers=[wagerTypes.find(w=>w.id==="safe")]');run(choice==='accept'?'chooseWager(0)':'skipWager()')}
  assert.equal(run('state'),'paused');assert.equal(run('resumeShield'),0);const waiting=run('elapsed');run('update(5)');assert.equal(run('elapsed'),waiting);
  run('pause()');assert.equal(run('resumeShield'),1.5);assert.equal(run('resumeSafetyPending'),false);
  run('guard=2;combo=9;invincible=0');hit(true);assert.equal(run('hp'),3);assert.equal(run('guard'),2);assert.equal(run('combo'),9);assert.equal(run('shards.length'),0);
  run('boss={x:ship.x,y:ship.y,r:40,hp:3,warning:0,lastBoost:-1};updateBoss(0,0,ship.x,false,ship.y)');assert.equal(run('hp'),3);assert.equal(run('boss.hp'),3);assert.equal(run('guard'),2);run('boss=null');
  const remaining=run('resumeShield');run('pause();update(10);pause()');assert.equal(run('resumeShield'),remaining);
  run('guard=0;update(1.48);damage()');assert.equal(run('hp'),3);run('update(.02)');hit(true);assert.equal(run('hp'),2);
 }
 // Scheduled wager introduction freezes its clock, and upgrades do not immediately cover a return shield.
 run('start()');isolate();run('wagerSlot=0;elapsed=17.99;update(.02)');assert.equal(run('state'),'playing');els.wagerReady.onclick();assert.equal(run('state'),'menuIntro');const t=run('elapsed');run('update(.8)');assert.equal(run('state'),'wager');assert.equal(run('elapsed'),t);
 run('start()');isolate();run('dust=3;bonusCredits=1;offerUpgrade();chooseUpgrade(0);pause();offerUpgrade(true)');assert.equal(run('state'),'playing');run('update(1.51)');assert.equal(run('state'),'playing');els.upgradeReady.onclick();assert.equal(run('state'),'menuIntro');
 els.restart.onclick();assert.equal(run('menuIntro'),null);assert.equal(run('resumeShield'),0);assert.equal(run('resumeSafetyPending'),false);assert(els.menuCue.hidden);
 console.log('V6.4 PASS: frozen intro, explicit continue after wager/skip/upgrade, full return shield against rocks/boss, no armor/combo loss or free rewards, pause cannot replenish shield, delayed next menu and restart reset');
}

// V7: ordered optional objectives, phase tradeoffs, route choices and uninterrupted full runs.
{
 width=960;height=510;run('resize();start()');isolate();
 run('beginObjective({kind:"rings",duration:12});ship.x=objective.points[2].x*W;ship.y=objective.points[2].y*H;updateAdventure(0,ship.x,ship.y)');assert.equal(run('objective.index'),0);
 for(let i=0;i<4;i++)run('ship.x=objective.points[objective.index].x*W;ship.y=objective.points[objective.index].y*H;updateAdventure(0,ship.x,ship.y)');
 assert.equal(run('ringWins'),1);assert.equal(run('objective'),null);assert.equal(run('dust'),3);const reward=run('score');run('updateAdventure(.01,ship.x,ship.y);updateChoiceDock();hud()');assert.equal(run('score'),reward);assert.equal(run('state'),'playing');assert(!els.upgradeReady.hidden);
 run('start()');isolate();run('combo=8;score=90;beginObjective({kind:"rings",duration:1});elapsed=2;updateAdventure(.01,ship.x,ship.y)');assert.equal(run('objective'),null);assert.equal(run('hp'),3);assert.equal(run('score'),90);assert.equal(run('combo'),8);
 // Escort is picked up spatially, drops when outrun, reconnects, and rewards exactly once at home.
 run('start()');isolate();run('beginObjective({kind:"escort",duration:16});ship.x=ship.target=objective.x;ship.y=ship.targetY=objective.y;updateAdventure(.01,ship.x,ship.y)');assert(run('objective.following'));
 run('ship.x=W-objective.x;updateAdventure(.01,ship.x,ship.y)');assert(!run('objective.following'));assert(run('objective.met'));
 run('ship.x=objective.x;ship.y=objective.y;updateAdventure(.01,ship.x,ship.y)');assert(run('objective.following'));
 run('objective.x=objective.home.x*W;objective.y=objective.home.y*H;ship.x=objective.x;ship.y=objective.y;updateAdventure(.01,ship.x,ship.y)');assert.equal(run('objective'),null);assert.equal(run('escortWins'),1);assert.equal(run('bonusCredits'),1);assert.equal(run('score'),200);run('updateAdventure(.01,ship.x,ship.y)');assert.equal(run('bonusCredits'),1);
 // Phase changes affect real collision and collection, without consuming boost or pausing.
 run('start()');isolate();assert(run('starAttraction()>0'));const radius=run('shipRadius()');els.padMoon.onclick();assert.equal(run('moonPhase'),'dark');assert(run('shipRadius()<'+radius));assert.equal(run('starAttraction()'),0);assert.equal(run('boostCooldown'),0);assert.equal(run('state'),'playing');run('switchMoon()');assert.equal(run('moonPhase'),'dark');
 run('items=[{x:ship.x+25,y:ship.y,r:12,v:0,rock:true,a:0}];update(.01)');assert.equal(run('hp'),3);run('moonCooldown=0;switchMoon();update(.01)');assert.equal(run('hp'),2);
 run('start()');isolate();run('items=[{x:ship.x+55,y:ship.y,r:9,v:0,rock:false,a:0}];update(.01)');assert(run('items[0].captured'));
 // Gates arm for one second; ignore defaults to calm. Routes expire and reward only the rich route.
 run('start()');isolate();run('fork={deadline:7,armed:1};ship.x=W*.75;ship.y=H*.48;updateAdventure(0,ship.x,ship.y)');assert.equal(run('activeRoute'),null);
 run('elapsed=1;updateAdventure(0,ship.x,ship.y)');assert.equal(run('activeRoute.id'),'rich');run('collectStar({x:0,y:0})');assert.equal(run('score'),14);assert(run('difficulty().interval<2.1-elapsed/90'));
 run('elapsed=22;updateAdventure(.01,ship.x,ship.y)');assert.equal(run('activeRoute'),null);
 run('fork={deadline:22,armed:20};updateAdventure(.01,ship.x,ship.y)');assert.equal(run('activeRoute.id'),'calm');assert(run('difficulty().interval>2.1-elapsed/90'));
 // Ready choices wait for a click; optional wager invitation expires freely.
 run('start()');isolate();run('dust=3;wagerSlot=0;elapsed=18;updateChoiceDock();hud()');assert.equal(run('state'),'playing');assert(!els.upgradeReady.hidden&&!els.wagerReady.hidden);assert(els.upgrade.hidden&&els.wager.hidden);
 run('elapsed=26.01;updateChoiceDock();hud()');assert.equal(run('wagerInviteUntil'),0);assert.equal(run('wagerSlot'),1);assert.equal(run('score'),0);assert.equal(run('state'),'playing');els.upgradeReady.onclick();assert.equal(run('state'),'menuIntro');run('update(.8);chooseUpgrade(0);pause()');assert.equal(run('resumeShield'),1.5);
 // Resize uses normalized gates/rings and rescales the escort. Pauses freeze all deadlines.
 run('start()');isolate();run('beginObjective({kind:"escort",duration:16})');const relative=run('[objective.x/W,objective.y/H]');width=360;height=350;run('resize()');assert(Math.abs(run('objective.x/W')-relative[0])<1e-8);assert(Math.abs(run('objective.y/H')-relative[1])<1e-8);
 run('fork={deadline:7,armed:1};draw(1);pause()');const frozen=run('JSON.stringify([objective,fork,elapsed,moonCooldown])');run('update(10)');assert.equal(run('JSON.stringify([objective,fork,elapsed,moonCooldown])'),frozen);run('start();beginObjective({kind:"rings",duration:12});draw(1)');
 els.restart.onclick();assert.equal(run('objective'),null);assert.equal(run('fork'),null);assert.equal(run('activeRoute'),null);assert.equal(run('moonPhase'),'bright');assert.equal(run('ringWins+escortWins+adventureSlot+routeSlot'),0);
 // A complete unattended journey never opens an automatic modal, even with upgrades ready.
 run(`start();invincible=1000;dust=3;let seen=new Set(),peak=0;for(let n=0;n<5500&&state==='playing';n++){update(1/60);if(objective)seen.add(objective.kind);if(fork)seen.add('fork');if(wagerInviteUntil)seen.add('invite');peak=Math.max(peak,items.length)};globalThis.journey={seen:[...seen],peak}`);
 assert.equal(run('state'),'over');assert.equal(run('time'),0);assert.equal(run('adventureSlot'),6);assert.equal(run('routeSlot'),2);assert(run('journey.seen.includes("rings")&&journey.seen.includes("escort")&&journey.seen.includes("cargo")&&journey.seen.includes("sling")&&journey.seen.includes("whale")&&journey.seen.includes("fork")&&journey.seen.includes("invite")'));assert(run('journey.peak<100'));assert(els.upgrade.hidden&&els.wager.hidden);
 console.log('V7 PASS: ring order/rewards/expiry, escort reconnect/delivery, phase hitboxes/attraction, gate grace/default/reward/expiry, opt-in choices, resize/pause/reset, full 90-second run without forced modals');
}

// Desktop choice shortcuts share the button eligibility rules and preserve browser shortcuts.
{
 const key=(k,extra={})=>events.keydown({key:k,repeat:false,target:{tagName:'CANVAS'},preventDefault:noop,...extra});
 run('start()');isolate();key('e');key('r');assert.equal(run('state'),'playing');
 run('dust=3;resumeShield=1.5');key('e');assert.equal(run('state'),'playing');
 run('resumeShield=0');key('e',{repeat:true});assert.equal(run('state'),'playing');
 key('e',{target:{tagName:'INPUT'}});key('e',{target:{tagName:'DIV',isContentEditable:true}});key('e',{isComposing:true});assert.equal(run('state'),'playing');
 key('E');assert.equal(run('state'),'menuIntro');key('r');assert.equal(run('menuIntro.kind'),'upgrade');run('update(.8)');key('1');assert.equal(run('state'),'paused');key('r');assert.equal(run('state'),'paused');
 run('start()');isolate();run('wagerSlot=0;elapsed=18;updateChoiceDock();hud()');
 for(const modifier of ['ctrlKey','metaKey','altKey']){let prevented=false;key('r',{[modifier]:true,preventDefault:()=>{prevented=true}});assert(!prevented);assert.equal(run('state'),'playing')}
 key('R',{target:{tagName:'BUTTON'}});assert.equal(run('state'),'menuIntro');assert.equal(run('menuIntro.kind'),'wager');run('update(.8)');key('2');assert.equal(run('state'),'paused');assert(run('activeWager'));
 console.log('V7.1 PASS: E/R eligibility, uppercase/repeat/menu guards, existing number selection, editable/composition guard and browser modifier shortcuts');
}

// V8: optional delivery decisions and friendly reflected projectiles, without adding input buttons.
{
 width=960;height=510;run('resize();start()');isolate();
 const beginCargo=()=>run('beginObjective({kind:"cargo",duration:14})');
 const crate=i=>run(`ship.x=objective.crates[${i}].x*W;ship.y=objective.crates[${i}].y*H;updateAdventure(0,ship.x,ship.y)`);
 const deliver=()=>run('ship.x=objective.station.x*W;ship.y=objective.station.y*H;updateAdventure(0,ship.x,ship.y)');
 beginCargo();for(let i=0;i<3;i++)crate(i);assert.equal(run('cargoLoad()'),3);assert.equal(run('cargoSpeed()'),.76);assert.equal(run('score'),0);
 run('boostCooldown=4');deliver();assert.equal(run('score'),432);assert.equal(run('cargoDelivered'),3);assert.equal(run('cargoSpeed()'),1);assert.equal(run('objective'),null);assert.equal(run('boostCooldown'),3);run('updateAdventure(.01,ship.x,ship.y)');assert.equal(run('score'),432);
 run('start()');isolate();beginCargo();crate(0);deliver();assert.equal(run('score'),84);assert.equal(run('cargoLoad()'),0);assert(run('objective.crates[0].taken'));crate(0);assert.equal(run('cargoLoad()'),0);crate(1);crate(2);deliver();assert.equal(run('score'),312);assert.equal(run('cargoDelivered'),3);
 run('start()');isolate();beginCargo();crate(0);run('score=90;combo=6;elapsed=15;updateAdventure(.01,ship.x,ship.y)');assert.equal(run('cargoLoad()'),0);assert.equal(run('score'),90);assert.equal(run('hp'),3);assert.equal(run('combo'),6);
 // Load scales keyboard and pad motion, while the mouse remains absolute, without input backlog.
 run('start()');isolate();beginCargo();run('objective.load=3;keys.add("d");update(.1)');assert(Math.abs(run('ship.x-W/2')-height*.9*.1*.76)<1e-8);
 run('start()');isolate();beginCargo();run('objective.load=3;pointer({clientX:W/2+100,clientY:ship.y});update(.01)');assert.equal(run('ship.x'),width/2+100);
 run('start()');isolate();beginCargo();run('objective.load=3');const pad=els.touchPad;
 const e=(x,y)=>({pointerId:80,currentTarget:pad,pointerType:'touch',clientX:x,clientY:y,preventDefault:noop});elementEvents['touchPad:pointerdown'](e(100,600));elementEvents['touchPad:pointermove'](e(110,590));run('update(.01)');assert(Math.abs(run('ship.x-W/2')-16.5*.76)<1e-8);
 // A precise hit reverses incoming direction once, preserving the established perfect reward.
 run('start()');isolate();run('boost();items=[{x:ship.x,y:ship.y,dx:1,dy:0,speedScale:1,r:12,a:0,rock:true}];update(.01)');assert.equal(run('reflectCount'),1);assert.equal(run('reflections.length'),1);assert.equal(run('reflections[0].dx'),-1);assert.equal(run('perfectCount'),1);assert.equal(run('score'),50);assert.equal(run('shards.length'),3);assert.equal(run('hp'),3);
 hit(true);assert.equal(run('reflectCount'),1);assert.equal(run('perfectCount'),1);
 run('start()');isolate();run('boost();update(.2)');hit(true);assert.equal(run('reflectCount'),0);
 // Fast projectiles hit the nearest target despite reverse array order, then disappear.
 run('start()');isolate();run('items=[{x:300,y:200,r:12,rock:true},{x:200,y:200,r:12,rock:true}];reflections=[{x:100,y:200,dx:1,dy:0,r:8,life:2}];updateReflections(.4)');assert.equal(run('items.length'),1);assert.equal(run('items[0].x'),300);assert.equal(run('reflections.length'),0);assert.equal(run('shards.length'),1);assert.equal(run('score'),0);
 assert.equal(run('impactTime(-100,0,100,0,20)'),.4);assert.equal(run('impactTime(-100,30,100,30,20)'),null);
 // Reflections can break three boss shells; warning-stage bosses and the player's ship are never hit.
 run('start()');isolate();run('boss={x:200,y:200,r:40,hp:3,warning:1,lastBoost:-1};reflections=[{x:100,y:200,dx:1,dy:0,r:8,life:2}];updateReflections(.2)');assert.equal(run('boss.hp'),3);
 run('boss.warning=0');for(let i=0;i<3;i++)run('reflections=[{x:100,y:200,dx:1,dy:0,r:8,life:2}];updateReflections(.2)');assert.equal(run('boss.hp'),0);assert.equal(run('score'),600);assert.equal(run('hp'),3);run('updateReflections(.2)');assert.equal(run('score'),600);
 // Pausing freezes cargo and shots; resize/reset cannot retain weight, cargo rewards or projectiles.
 run('start()');isolate();beginCargo();crate(0);run('reflections=[{x:100,y:200,dx:1,dy:0,r:8,life:2}];pause()');const frozen=run('JSON.stringify([objective,reflections,elapsed])');run('update(5)');assert.equal(run('JSON.stringify([objective,reflections,elapsed])'),frozen);
 width=360;height=400;run('resize();draw(1)');assert(run('Number.isFinite(reflections[0].x)'));els.restart.onclick();assert.equal(run('cargoSpeed()'),1);assert.equal(run('reflectCount+cargoDelivered+reflections.length'),0);
 console.log('V8 PASS: full/partial delivery, cargo expiry/cap/reward, loaded keyboard/mouse/touch, perfect reflection one-shot/direction/timing, nearest swept hits, boss shells/reward, pause/resize/reset');
}

// V9: optional orbit/launch, whale corridor protection and telegraphed gap lasers.
{
 width=960;height=510;run('resize();start()');isolate();
 const well=()=>run('beginObjective({kind:"sling",duration:12});ship.x=ship.target=objective.cx*W+Math.min(W,H)*.18;ship.y=ship.targetY=objective.cy*H');
 well();assert(run('canSling()'));run('boostCooldown=4;hud()');assert(!els.padBoost.disabled);
 elementEvents['padBoost:pointerdown']({preventDefault:noop,stopPropagation:noop});assert(run('orbit'));els.padBoost.onclick({detail:1});assert(run('orbit'));assert.equal(run('slingWins'),0);
 const angle=run('orbit.angle');run('update(.1)');assert.notEqual(run('orbit.angle'),angle);const radial=run('[Math.cos(orbit.angle),Math.sin(orbit.angle)]');
 elementEvents['padBoost:pointerdown']({preventDefault:noop,stopPropagation:noop});assert.equal(run('orbit'),null);assert(run('launch'));assert.equal(run('slingWins'),1);assert.equal(run('score'),80);assert(Math.abs(run('launch.vx')*radial[0]+run('launch.vy')*radial[1])<1e-8);
 run('releaseOrbit()');assert.equal(run('score'),80);events.keydown({key:'d',target:{tagName:'CANVAS'},preventDefault:noop,repeat:false});assert.equal(run('launch'),null);
 run('start()');isolate();well();run('boost();pause()');const orbitFreeze=run('JSON.stringify([orbit,ship,elapsed])');run('update(2)');assert.equal(run('JSON.stringify([orbit,ship,elapsed])'),orbitFreeze);run('pause()');for(let i=0;i<30;i++)run('update(.05)');assert.equal(run('orbit'),null);assert.equal(run('slingWins'),1);
 // Five seconds in the whale wake pays once; the corridor protects health/armor and grants exit grace.
 run('start()');isolate();run('beginObjective({kind:"whale",duration:12})');
 run(`for(let i=0;i<52;i++){elapsed+=.1;const u=elapsed/12;ship.x=(objective.mirror?.88-u*.76:.12+u*.76)*W;ship.y=(.53+Math.sin(u*Math.PI*3)*.14)*H;updateAdventure(.1,ship.x,ship.y)}`);
 assert(run('whaleSafe'));assert.equal(run('whaleWins'),1);assert.equal(run('score'),150);run('guard=2;damage()');assert.equal(run('hp'),3);assert.equal(run('guard'),2);assert(run('items.length>0'));
 run('elapsed=12.1;updateAdventure(.01,ship.x,ship.y)');assert.equal(run('objective'),null);assert(!run('whaleSafe'));assert(run('resumeShield>=.8'));assert.equal(run('score'),150);
 // Wake lifetime remains ~2.4 seconds on high-refresh devices; no unbounded trail accumulation.
 run('start()');isolate();run('beginObjective({kind:"whale",duration:12});for(let i=0;i<360;i++){elapsed+=1/120;updateAdventure(1/120,ship.x,ship.y)}');assert(run('objective.trail.length<=90'));assert(run('elapsed-objective.trail[0].at>2.3'));run('draw(1);pause()');const wakeFreeze=run('JSON.stringify([objective,elapsed])');run('update(1)');assert.equal(run('JSON.stringify([objective,elapsed])'),wakeFreeze);
 // Laser warning is harmless, active rays catch fast crossings, and green gaps/boost remain safe.
 run('start()');isolate();run('laser={vertical:false,at:.56,gap:.6,width:.38,warningEnd:2,end:3.2};ship.x=W*.1;ship.y=H*.7;elapsed=1.9;stepLaser(.1,ship.x,H*.4,false)');assert.equal(run('hp'),3);
 run('elapsed=2.2;stepLaser(.1,ship.x,H*.4,false)');assert.equal(run('hp'),2);
 run('hp=3;invincible=0;ship.x=W*.6;stepLaser(.1,ship.x,H*.4,false)');assert.equal(run('hp'),3);
 run('ship.x=W*.1;stepLaser(.1,ship.x,H*.4,true)');assert.equal(run('hp'),3);
 run('laser.vertical=true;ship.x=W*.8;ship.y=H*.6;stepLaser(.1,W*.3,ship.y,false)');assert.equal(run('hp'),3);
 run('ship.y=H*.1;stepLaser(.1,W*.3,ship.y,false)');assert.equal(run('hp'),2);
 run('elapsed=3.3;stepLaser(.1,ship.x,ship.y,false)');assert.equal(run('laser'),null);
 run('start()');isolate();well();run('boost()');width=360;height=400;run('resize();draw(1)');assert(run('Number.isFinite(orbit.radius)'));els.restart.onclick();assert.equal(run('orbit'),null);assert.equal(run('launch'),null);assert.equal(run('laser'),null);assert(!run('whaleSafe'));assert.equal(run('slingWins+whaleWins+laserSlot'),0);
 console.log('V9 PASS: opt-in orbit, tangent/manual/automatic launch, pointer click deduplication, steering takeover, whale protection/reward/expiry/120Hz wake, laser warning/swept hit/gap/boost, pause/resize/reset');
}

// V9.1: fast mouse reversal, borders, boost/weight changes and resume never retain relative offsets.
{
 width=960;height=510;run('resize();start()');isolate();
 const move=(x,y)=>{elementEvents['sky:pointermove']({pointerType:'mouse',clientX:x,clientY:y,currentTarget:els.sky});run('update(1/120)');assert.equal(run('ship.x'),Math.max(24,Math.min(width-24,x)));assert.equal(run('ship.y'),Math.max(28,Math.min(height-28,y)))};
 move(80,90);run('boost()');move(800,420);move(60,50);move(1000,550);move(920,460);move(-100,-80);move(40,45);
 run('beginObjective({kind:"cargo",duration:14});objective.load=3');move(650,250);move(200,200);run('boostTime=0');move(700,100);
 run('pause()');const frozen=run('[ship.x,ship.y].join()');elementEvents['sky:pointermove']({pointerType:'mouse',clientX:300,clientY:300});assert.equal(run('[ship.x,ship.y].join()'),frozen);run('pause()');move(320,250);
 run('objective=null;ship.x=ship.target=100;ship.y=ship.targetY=200;boostTime=0;invincible=resumeShield=0;items=[{x:400,y:200,r:12,v:0,a:0,rock:true}]');move(700,200);assert.equal(run('hp'),2);
 console.log('V9.1 PASS: absolute mouse alignment across fast reversals, clamped borders, boost/cargo/resume; swept collisions retained');
}

// V10: fleet choices, exclusive build paths and game-time-only signature skills.
{
 const freshHull=id=>{run('state="over"');els['ship-'+id].onclick();run('start()');isolate()};
 width=960;height=510;run('resize()');
 for(const id of ['collector','falcon','warden']){
  freshHull(id);assert.equal(run('activeShip'),id);assert.equal(storage['mooncatch-ship'],id);assert(els['ship-'+id].disabled);
  els['ship-'+(id==='collector'?'falcon':'collector')].onclick();assert.equal(run('activeShip'),id);
  run('dust=3;offerUpgrade()');assert.equal(run('offers[0].id'),run('hull().skill'));assert(run('offers.every(p=>!p.owner||p.owner===activeShip)'));
  run('chooseUpgrade(0);pause()');assert.equal(run('powers[hull().skill]'),1);assert(run('resumeShield>=1.5'));
  run('dust=8;offerUpgrade();chooseUpgrade(0);pause()');assert.equal(run('powers[hull().skill]'),2);
  run('dust=15;offerUpgrade()');assert(run('offers.every(p=>p.id!==hull().skill)'));run('draw(1);start()');assert.equal(run('powers[hull().skill]'),0);
 }
 freshHull('collector');assert.equal(run('starAttraction()'),78);assert.equal(run('cargoReward(3)'),432);
 // Dark moon disables base attraction so these pickups can only come from the satellites.
 run('moonPhase="dark";powers.satellite=2;const sat=satellites()[0];items=[{...sat,r:5,v:0,rock:false,a:0}];shards=[{...sat,life:5,age:.2,locked:false}];update(.01)');assert.equal(run('combo'),1);assert.equal(run('dust'),1);assert.equal(run('items.length'),0);assert.equal(run('satellites().length'),3);
 freshHull('falcon');run('boost()');assert.equal(run('boostTime'),1.4);assert.equal(run('boostCooldown'),4.3);assert.equal(run('ringReward(150)'),180);assert.equal(run('cargoReward(3)'),360);
 run('powers.wake=1;moonPhase="dark";ship.x=ship.target=400;ship.y=ship.targetY=250;items=[{x:200,y:258,r:7,v:0,rock:false,a:0}];shards=[{x:220,y:255,life:5,age:.2}];stepFleet(.02,100,250)');assert.equal(run('combo'),1);assert.equal(run('dust'),1);assert.equal(run('skillWake.length'),1);
 run('pause()');const trailFrozen=run('JSON.stringify(skillWake)');run('update(10)');assert.equal(run('JSON.stringify(skillWake)'),trailFrozen);run('pause();boostTime=0;stepFleet(2,ship.x,ship.y)');assert.equal(run('skillWake.length'),0);
 run('powers.wake=2;boostTime=100;for(let i=0;i<300;i++)stepFleet(.01,ship.x-10,ship.y)');assert(run('skillWake.length<=96'));width=360;height=400;run('resize();draw(1)');assert(run('skillWake.every(p=>Number.isFinite(p.x2+p.y2))'));
 freshHull('falcon');run('powers.wake=1;boostTime=1.4;for(let i=0;i<168;i++){elapsed+=1/120;ship.x+=2;stepFleet(1/120,ship.x-2,ship.y)}');assert(run('skillWake.length>30&&skillWake.length<45'));assert(run('skillWake[0].life>.35'));
 freshHull('warden');assert.equal(run('guard'),1);run('boost();powers.split=1;items=[{x:ship.x,y:ship.y,dx:0,dy:1,r:12,rock:true,a:0}];reflectMeteor(items[0])');assert.equal(run('reflections.length'),3);assert.equal(run('perfectCount'),1);assert(run('reflections.every(s=>Math.abs(Math.hypot(s.dx,s.dy)-1)<1e-9)'));
 run('boostCooldown=0;boost();powers.split=2;reflectMeteor({x:ship.x,y:ship.y,dx:0,dy:1,r:12,rock:true})');assert.equal(run('reflections.length'),8);assert.equal(run('perfectWindow'),.26);
 run('boostTime=0;damage()');assert.equal(run('hp'),3);assert.equal(run('guard'),0);run('start()');assert.equal(run('guard'),1);assert.equal(run('skillWake.length'),0);
 freshHull('collector');
 console.log('V10 fleet PASS: selection locking/persistence, exclusive two-tier offers, satellite gold/dust pickup, wake pickup/expiry/pause/cap/resize, three/five-way reflection, hull passives and clean restart');
}

// V10 storm: readable attacks, swept gap collisions, core reflection and exclusive end rewards.
{
 width=960;height=510;run('resize();start()');isolate();
 run('elapsed=70;updateBoss(0,0,ship.x,false);elapsed=72;boss.warning=0;stepStorm(0,ship.x,ship.y,false)');assert.equal(run('storm.event.kind'),'fragments');assert.equal(run('items.length'),0);
 run('elapsed=73.7;stepStorm(.01,ship.x,ship.y,false)');assert.equal(run('items.length'),0);
 run('elapsed=73.81;stepStorm(.01,ship.x,ship.y,false)');assert(run('items.length>=7&&items.length<=9'));assert(run('items.every(o=>angleGap(Math.atan2(o.dy,o.dx),storm.event.gap)>.7)'));
 const emitted=run('items.length');run('stepStorm(.01,ship.x,ship.y,false)');assert.equal(run('items.length'),emitted);
 run('elapsed=76.1;stepStorm(.01,ship.x,ship.y,false)');assert.equal(run('storm.event'),null);assert.equal(run('items.length'),0);
 run('elapsed=78;stepStorm(0,ship.x,ship.y,false)');assert.equal(run('storm.event.kind'),'wave');run('pause()');const stormFrozen=run('JSON.stringify([storm,elapsed])');run('update(4)');assert.equal(run('JSON.stringify([storm,elapsed])'),stormFrozen);run('pause()');
 // Known center/gap/radius: cross the damaging side in one pointer step, then the green side.
 run('storm.event={kind:"wave",x:.5,y:.5,gap:0,fire:0,end:10,fired:true,radius:100};elapsed=(100-32)/(Math.hypot(W,H)*.5);ship.x=W/2-140;ship.y=H/2;invincible=resumeShield=0;stepStorm(0,W/2-60,H/2,false)');assert.equal(run('hp'),2);
 run('hp=3;invincible=0;ship.x=W/2+140;stepStorm(0,W/2+60,H/2,false)');assert.equal(run('hp'),3);
 run('ship.x=W/2-140;stepStorm(0,W/2-60,H/2,true)');assert.equal(run('hp'),3);
 run('resumeShield=1;stepStorm(0,W/2-60,H/2,false)');assert.equal(run('hp'),3);
 run('resumeShield=0;storm.event=null;storm.slot=2;elapsed=84;stepStorm(0,ship.x,ship.y,false)');assert.equal(run('storm.event.kind'),'core');assert.equal(run('items.length'),0);
 run('elapsed=85.81;stepStorm(.01,ship.x,ship.y,false)');assert.equal(run('items.filter(o=>o.core).length'),3);
 run('boost();perfectWindow=0;reflectMeteor(items[0])');assert.equal(run('reflections.length'),1);assert.equal(run('perfectCount'),0);
 run('storm.event=null;hazardClock=0;update(.01)');assert.equal(run('warnings.length'),0);
 run('items=[{rock:true,core:true},{rock:true,storm:true}];boss.hp=1;boss.warning=0;breakBossShell(false)');assert.equal(run('boss.hp'),0);assert.equal(run('storm.event'),null);assert.equal(run('items.length'),0);assert.equal(run('score'),600);
 run('elapsed=90;finish()');assert.equal(run('score'),600);assert(!run('stormRewarded'));run('finish()');assert.equal(run('score'),600);
 run('start();bossStarted=true;boss={hp:3};score=50;elapsed=90;finish()');assert.equal(run('score'),250);assert(run('stormRewarded'));run('finish()');assert.equal(run('score'),250);
 run('start();bossStarted=true;boss={hp:3};score=50;hp=0;finish()');assert.equal(run('score'),50);
 run('start()');assert.equal(run('storm'),null);assert(!run('stormRewarded'));
 console.log('V10 storm PASS: warning/one-shot spawning/gaps, swept wave damage and immunity, pause, core reflection, ordinary hazard suppression, defeat cleanup and one-time exclusive survival reward');
}

// V10 routes: reachable previews, connected rings, whale/gate overlap and no extra modals.
{
 for(const [w,h] of [[360,400],[960,510]]){
  width=w;height=h;run('resize();start()');isolate();
  run('beginObjective({kind:"sling",duration:12});ship.x=ship.target=W*.5+Math.min(W,H)*.18;ship.y=ship.targetY=H*.56;boost();drawNavigation();releaseOrbit()');
  assert.equal(run('objective.kind'),'rings');assert(run('objective.linked'));assert.equal(run('objective.points.length'),3);assert.equal(run('objective.deadline-elapsed'),8);
  assert(run('objective.points.every(p=>p.x*W>=35&&p.x*W<=W-35&&p.y*H>=40&&p.y*H<=H-40)'));
  run('launch=null;for(const p of [...objective.points]){ship.x=p.x*W;ship.y=p.y*H;updateAdventure(0,ship.x,ship.y)}');assert.equal(run('ringWins'),1);assert.equal(run('objective'),null);
  // Ordered swept contacts let fast movement collect a whole straight chain in one frame.
  run('objective={kind:"rings",linked:true,index:0,deadline:10,points:[{x:.3,y:.5},{x:.5,y:.5},{x:.7,y:.5}]};ship.x=W*.9;ship.y=H*.5;updateAdventure(0,W*.1,H*.5)');assert.equal(run('objective'),null);
  run('objective={kind:"rings",linked:true,index:0,deadline:10,points:[{x:.3,y:.5},{x:.5,y:.5},{x:.7,y:.5}]};ship.x=W*.1;ship.y=H*.5;updateAdventure(0,W*.9,H*.5)');assert.equal(run('objective.index'),1);
  run('objective=null;adventureSlot=4;elapsed=60;drawNavigation();elapsed=62;updateAdventure(0,ship.x,ship.y)');assert.equal(run('objective.mirror'),run('routeMirror'));
  run('elapsed=65;laserSlot=2;stepLaser(0,ship.x,ship.y,false)');assert(run('laser.vertical'));assert.equal(run('laser.at'),.5);
  run('{elapsed=67;const u=(elapsed-objective.born)/objective.duration;ship.x=(objective.mirror?.88-u*.76:.12+u*.76)*W;ship.y=(.53+Math.sin(u*Math.PI*3)*.14)*H;updateAdventure(.01,ship.x,ship.y);stepLaser(.01,ship.x,ship.y,false)}');assert(run('whaleSafe'));assert.equal(run('hp'),3);run('draw(1)');
 }
 for(const id of ['collector','falcon','warden']){
  run('state="over"');els['ship-'+id].onclick();run('start();invincible=1000');
  run(`globalThis.observed={kinds:[],peak:0};for(let i=0;i<5500&&state==='playing';i++){update(1/60);if(storm?.event&&!observed.kinds.includes(storm.event.kind))observed.kinds.push(storm.event.kind);observed.peak=Math.max(observed.peak,items.length);if(i%60===0)draw(i/60)}`);
  assert.equal(run('state'),'over');assert.equal(run('observed.kinds.join()'),'fragments,wave,core');assert(run('observed.peak<100'));assert(els.upgrade.hidden&&els.wager.hidden);assert(run('stormRewarded'));
 }
 run('state="over"');els['ship-collector'].onclick();run('start()');
 console.log('V10 routes PASS: narrow/desktop reachable rings, ordered swept pickups, whale preview identity/gate protection, and three complete 90-second runs without forced modals');
}

// V11: three independently selectable mobile drivers, no stale held input after menus or mode switches.
{
 width=360;height=400;run('resize();start()');isolate();
 const pe=(id,x,y,surface)=>({pointerId:id,clientX:x,clientY:y,pointerType:'touch',currentTarget:surface,preventDefault:noop,stopPropagation:noop});
 el('stickRing').bounds={left:30,top:500,width:92,height:92};els.dpad.bounds={left:0,top:500,width:150,height:140};
 els['mode-stick'].onclick();assert.equal(run('controlMode'),'stick');assert.equal(storage['mooncatch-controls'],'stick');assert(els.touchPad.hidden&&!els.joystick.hidden&&els.dpad.hidden);
 const begin=run('[ship.x,ship.y].join()');elementEvents['joystick:pointerdown'](pe(91,76,546,els.joystick));run('update(.02)');assert.equal(run('[ship.x,ship.y].join()'),begin);
 elementEvents['joystick:pointermove'](pe(91,96.16,546,els.joystick));assert(Math.abs(run('stickVector.x')-.5)<1e-8);const x=run('ship.x');run('update(.1)');assert(Math.abs(run('ship.x')-x-360*.9*.1*.5)<1e-8);
 elementEvents['joystick:pointermove'](pe(91,112,582,els.joystick));assert(Math.abs(run('Math.hypot(stickVector.x,stickVector.y)')-1)<1e-8);
 elementEvents['joystick:pointercancel'](pe(91,112,582,els.joystick));const stopped=run('[ship.x,ship.y].join()');run('update(.1)');assert.equal(run('[ship.x,ship.y].join()'),stopped);assert.equal(run('stickPointer'),null);assert.equal(els.joystick.captures.size,0);
 elementEvents['joystick:pointerdown'](pe(92,112,546,els.joystick));els['mode-dpad'].onclick();assert.equal(run('stickPointer'),null);assert.equal(run('controlMode'),'dpad');assert.equal(run('directionPointers.size'),0);
 elementEvents['joystick:pointermove'](pe(92,200,546,els.joystick));assert.equal(run('stickVector.x'),0);
 // The old canvas drag surface cannot move a ship while an alternative driver is selected.
 const target=run('[ship.target,ship.targetY].join()');elementEvents['sky:pointerdown'](pe(2,20,20,els.sky));elementEvents['sky:pointermove'](pe(2,160,160,els.sky));assert.equal(run('[ship.target,ship.targetY].join()'),target);
 run('ship.x=ship.target=180;ship.y=ship.targetY=200;boostTime=0');elementEvents['dir-ur:pointerdown'](pe(93,125,510,els['dir-ur']));run('update(.1)');assert(Math.abs(run('Math.hypot(ship.x-180,ship.y-200)')-32.4)<1e-8);
 elementEvents['dir-ur:pointermove'](pe(93,20,620,els['dir-ur']));assert.equal(run('virtualDirection().x'),-1);assert.equal(run('virtualDirection().y'),1);
 elementEvents['dir-ur:lostpointercapture'](pe(93,20,620,els['dir-ur']));assert.equal(run('directionPointers.size'),0);
 elementEvents['dir-l:pointerdown'](pe(94,20,570,els['dir-l']));elementEvents['dir-r:pointerdown'](pe(95,125,570,els['dir-r']));assert.equal(run('virtualDirection().x'),0);elementEvents['dir-l:pointerup'](pe(94,20,570,els['dir-l']));assert.equal(run('virtualDirection().x'),1);
 run('boostCooldown=0;ship.x=ship.target=100');elementEvents['padBoost:pointerdown']({preventDefault:noop,stopPropagation:noop});const before=run('ship.x');run('update(.1)');assert(Math.abs(run('ship.x')-before-64.8)<1e-8);
 els.pause.onclick();assert.equal(run('state'),'paused');assert.equal(run('directionPointers.size'),0);assert(!els.pause.disabled);assert.equal(els.pause.textContent,'继续');els.pause.onclick();assert.equal(run('state'),'playing');
 const idle=run('[ship.x,ship.y].join()');elementEvents['dir-r:pointermove'](pe(95,150,570,els['dir-r']));run('update(.05)');assert.equal(run('[ship.x,ship.y].join()'),idle);
 elementEvents['dir-u:keydown']({key:'Enter',repeat:false,preventDefault:noop,stopPropagation:noop});assert.equal(run('virtualDirection().y'),-1);elementEvents['dir-u:keyup']({key:'Enter',preventDefault:noop});assert.equal(run('virtualDirection().y'),0);
 els['mode-drag'].onclick();assert(!els.touchPad.hidden&&els.joystick.hidden&&els.dpad.hidden);assert.equal(storage['mooncatch-controls'],'drag');run('boostTime=0');const startX=run('ship.x');elementEvents['touchPad:pointerdown'](pe(96,50,570,els.touchPad));elementEvents['touchPad:pointermove'](pe(96,60,570,els.touchPad));run('update(.01)');assert.equal(run('ship.x'),Math.min(width-24,startX+16.5));
 console.log('V11 controls PASS: persisted selection, proportional 360-degree stick, normalized eight-way keys, hold/slide/multi-touch, boost, stale capture rejection, pause/release and original drag');
}

// Rules/settings are on-demand, freeze every timer, and preserve the menu the player came from.
{
 run('start()');isolate();els.helpOpen.onclick();assert(run('panelOpen'));assert.equal(run('state'),'paused');assert(els.playContent.inert);assert(!els.gameRules.hidden&&els.controlSettings.hidden);assert(els.pause.disabled);
 const frozen=run('JSON.stringify([elapsed,ship,boostCooldown,objective])');run('update(4)');assert.equal(run('JSON.stringify([elapsed,ship,boostCooldown,objective])'),frozen);
 els.panelClose.onclick();assert(!run('panelOpen'));assert(!els.playContent.inert);assert.equal(run('state'),'playing');assert(run('resumeShield>=1.5'));
 els.pause.onclick();els.controlsOpen.onclick();assert(!els.controlSettings.hidden&&els.gameRules.hidden);els['mode-stick'].onclick();els.panelClose.onclick();assert.equal(run('state'),'paused');els.pause.onclick();
 run('resumeShield=0;dust=3;offerUpgrade(true)');assert.equal(run('state'),'menuIntro');els.helpOpen.onclick();run('update(5)');assert.equal(run('state'),'menuIntro');els.panelClose.onclick();run('update(.81)');assert.equal(run('state'),'upgrade');
 const offers=run('offers.map(p=>p.id).join()');els.helpOpen.onclick();events.keydown({key:'1',target:{tagName:'BUTTON'}});assert.equal(run('offers.map(p=>p.id).join()'),offers);events.keydown({key:'Escape',target:{tagName:'BUTTON'},preventDefault:noop});assert(!run('panelOpen'));assert.equal(run('state'),'upgrade');
 els.controlsOpen.onclick();els.restart.onclick();assert.equal(run('state'),'playing');assert(!run('panelOpen'));assert(!els.playContent.inert);assert.equal(run('elapsed'),0);assert.equal(run('controlMode'),'stick');assert.equal(run('stickPointer'),null);
 els.helpOpen.onclick();els.gamePanel.querySelectorAll=()=>[els.panelClose,els.restart];sandbox.document.activeElement=els.panelClose;events.keydown({key:'Tab',shiftKey:true,target:{tagName:'BUTTON'},preventDefault:noop});assert.equal(sandbox.document.activeElement,els.restart);events.keydown({key:'Tab',target:{tagName:'BUTTON'},preventDefault:noop});assert.equal(sandbox.document.activeElement,els.panelClose);els.panelClose.onclick();run('selectControlMode("drag")');
 console.log('V11 panels PASS: rules/settings access, input isolation, focus loop, frozen intro/upgrade/gameplay, safe explicit return, paused-state preservation and restart');
}

// V11.1: field-event HUD changes may resize the canvas but must never release a held driver.
{
 width=360;height=400;run('resize();start()');isolate();run('selectControlMode("stick")');
 const pe=(id,x,y,surface)=>({pointerId:id,clientX:x,clientY:y,pointerType:'touch',currentTarget:surface,preventDefault:noop,stopPropagation:noop});
 elementEvents['joystick:pointerdown'](pe(101,112,546,els.joystick));assert.equal(run('stickPointer'),101);
 const vector=run('JSON.stringify(stickVector)');
 for(const event of ['beginObjective({kind:"sling",duration:12})','fork={deadline:100,armed:100}','chooseRoute("rich")','fork={deadline:100,armed:100};chooseRoute("calm")','bonusCredits=1']){
  run(event+';hud();ship.x=ship.target=100');height-=6;resizeCallback();
  assert.equal(run('stickPointer'),101);assert(els.joystick.captures.has(101));assert.equal(run('JSON.stringify(stickVector)'),vector);assert.equal(run('inputMode'),'virtual');
  const x=run('ship.x');run('update(.04)');assert(run('ship.x')>x);
 }
 resizeCallback();assert.equal(run('stickPointer'),101);sandbox.devicePixelRatio=2;resizeCallback();assert.equal(run('stickPointer'),101);assert.equal(els.sky.width,720);sandbox.devicePixelRatio=1;
 run('selectControlMode("dpad");ship.x=ship.target=100');elementEvents['dir-r:pointerdown'](pe(102,120,570,els['dir-r']));height+=15;resizeCallback();assert(els['dir-r'].captures.has(102));assert.equal(run('directionPointers.size'),1);run('update(.04)');assert(run('ship.x')>100);
 run('clearInput();keys.add("d");ship.x=ship.target=100');height+=5;resizeCallback();assert(run('keys.has("d")'));run('update(.04)');assert(run('ship.x')>100);
 run('selectControlMode("drag")');elementEvents['touchPad:pointerdown'](pe(103,60,550,els.touchPad));
 els.sky.bounds={width,height:height-5,left:12,top:170};resizeCallback();assert.equal(run('movePointer'),103);const y=run('ship.targetY');elementEvents['touchPad:pointermove'](pe(103,60,550,els.touchPad));assert.equal(run('ship.targetY'),y);
 elementEvents['touchPad:pointermove'](pe(103,60,560,els.touchPad));assert(Math.abs(run('ship.targetY')-Math.min(run('H')-28,y+16.5))<1e-8);
 run('pause()');assert.equal(run('movePointer'),null);assert(!els.touchPad.captures.has(103));assert.equal(run('touches.size'),0);
 delete els.sky.bounds;run('resize();start()');
 console.log('V11.1 PASS: event-driven/no-op/DPR canvas resize preserves stationary joystick, dpad and keys; layout shifts do not inject drag deltas; pause still releases input');
}

(async()=>{
 run('start()');isolate();
 // Native fullscreen, system exit, and unsupported/rejected API all share safe pause and cleanup.
 el('playShell').requestFullscreen=async()=>{sandbox.document.fullscreenElement=els.playShell;docEvents.fullscreenchange()};
 sandbox.document.exitFullscreen=async()=>{sandbox.document.fullscreenElement=null;docEvents.fullscreenchange()};
 await els.fullscreen.onclick();assert(run('focusMode'));assert.equal(run('state'),'paused');assert(els.playShell.classList.contains('immersive'));assert(sandbox.document.body.classList.contains('game-focused'));
 els.pause.onclick();assert(run('resumeShield>=1.5'));sandbox.document.fullscreenElement=null;docEvents.fullscreenchange();assert(!run('focusMode'));assert.equal(run('state'),'paused');assert(!sandbox.document.body.classList.contains('game-focused'));
 delete els.playShell.requestFullscreen;await els.fullscreen.onclick();assert(run('focusMode'));assert(!run('nativeScreen'));await els.fullscreen.onclick();assert(!run('focusMode'));assert.equal(els.fullscreen.attributes['aria-pressed'],'false');
 el('playShell').requestFullscreen=async()=>{throw Error('unsupported')};await els.fullscreen.onclick();assert(run('focusMode'));assert(!run('fullscreenBusy'));events.keydown({key:'Escape',target:{tagName:'CANVAS'},preventDefault:noop});assert(!run('focusMode'));assert(!sandbox.document.body.classList.contains('game-focused'));
 delete els.playShell.requestFullscreen;run('start()');assert.equal(run('state'),'playing');
 console.log('V11 fullscreen PASS: native enter/system exit, safe pause/resume, CSS fallback on unsupported/rejected API, Escape and body-scroll restoration');
})().catch(e=>{console.error(e);process.exitCode=1});
