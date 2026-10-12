const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const els={},events={},elementEvents={},storage={},noop=()=>{};
const ctx=new Proxy({createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
let width=960,height=510;
function el(id){return els[id]??={style:{},textContent:'',innerHTML:'',hidden:false,disabled:false,setAttribute:noop,focus:noop,addEventListener:(name,f)=>{elementEvents[id+':'+name]=f},setPointerCapture:noop,getContext:()=>ctx,getBoundingClientRect:()=>({width,height,left:0})}}
const sandbox={document:{getElementById:el,querySelector:()=>({classList:{toggle:noop}}),addEventListener:noop},window:{addEventListener:(n,f)=>events[n]=f},localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v},ResizeObserver:class{observe(){}},devicePixelRatio:1,requestAnimationFrame:noop,Math,console};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dist/game.js','utf8'),sandbox);
const run=x=>vm.runInContext(x,sandbox);
const isolate=()=>run('spawn=hazardClock=100;items=[];pending=[];warnings=[];shards=[];dust=0;perfectReady=false;wagerSlot=wagerSchedule.length');
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
isolate();run('warnWave()');assert.equal(run('warnings.length'),2);assert.equal(run('items.length'),0);for(let i=0;i<27;i++)run('update(.05)');assert.equal(run('warnings.length'),0);assert(run('items.filter(o=>o.rock).length')>0);
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
// Mouse boost changes sensitivity without forcing motion or snapping on expiry.
run('start()');isolate();run('pointer({clientX:100});update(.01);boost();pointer({clientX:120});update(.01)');assert.equal(run('ship.x'),140);
run('boostTime=0;pointer({clientX:130});update(.01)');assert.equal(run('ship.x'),150);
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
run('score=123;skipWager()');assert.equal(run('state'),'playing');assert.equal(run('score'),123);assert.equal(run('wagerSlot'),1);run('maybeOfferWager()');assert.equal(run('state'),'playing');
run('elapsed=46;maybeOfferWager()');assert.equal(run('state'),'wager');run('skipWager();maybeOfferWager()');assert.equal(run('state'),'playing');assert.equal(run('wagerSlot'),2);
function accept(id){run('state="wager";wagerOffers=[wagerTypes.find(w=>w.id==="'+id+'")];chooseWager(0)')}
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
run('start()');isolate();accept('stars');run('activeWager.progress=7;powers.echo=1;ship.x=ship.target=700;echoes=[{x:200,y:shipY(),life:2}];items=[{x:200,y:shipY(),v:0,a:0,r:9,rock:false}];update(.01)');assert.equal(run('wagersWon'),1);assert.equal(run('state'),'upgrade');assert.equal(run('upgradeSource'),'wager');assert(els.wager.hidden);
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
assert(run('warnings.every(w=>w.remaining>=.75)'));
run('warnings.forEach(spawnMeteor)');assert(run('items.every(o=>o.dx*(W/2-o.x)+o.dy*(H/2-o.y)>0)'));
const direction=run('JSON.stringify(items.map(o=>[o.dx,o.dy]))');run('warnings=[];ship.x=ship.target=24;ship.y=ship.targetY=28;update(.01)');assert.equal(run('JSON.stringify(items.map(o=>[o.dx,o.dy]))'),direction);
for(let t=1;t<=90;t++)assert(run(`difficulty(${t}).speed>difficulty(${t-1}).speed && difficulty(${t}).interval<difficulty(${t-1}).interval && difficulty(${t}).count>=difficulty(${t-1}).count`));
assert(run('difficulty(90).speed/difficulty(0).speed>3'));assert.equal(run('difficulty(90).count'),3);
run('start()');isolate();run('ship.x=ship.target=24;ship.y=ship.targetY=28;items=[{x:500,y:250,dx:1,dy:0,speedScale:1,r:12,rock:true,a:0}];update(.01)');const earlySpeed=run('items[0].x-500');run('items[0].x=500;elapsed=85;bossStarted=true;update(.01)');assert(run('items[0].x-500')>earlySpeed*3);
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
