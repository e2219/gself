const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const els={},events={},elementEvents={},storage={},noop=()=>{};
const ctx=new Proxy({createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
let width=960,height=510;
function el(id){return els[id]??={style:{},textContent:'',innerHTML:'',hidden:false,disabled:false,setAttribute:noop,focus:noop,addEventListener:(name,f)=>{elementEvents[id+':'+name]=f},setPointerCapture:noop,getContext:()=>ctx,getBoundingClientRect:()=>({width,height,left:0})}}
const sandbox={document:{getElementById:el,querySelector:()=>({classList:{toggle:noop}}),addEventListener:noop},window:{addEventListener:(n,f)=>events[n]=f},localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v},ResizeObserver:class{observe(){}},devicePixelRatio:1,requestAnimationFrame:noop,Math,console};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dist/game.js','utf8'),sandbox);
const run=x=>vm.runInContext(x,sandbox);
const isolate=()=>run('spawn=hazardClock=100;items=[];pending=[];warnings=[]');
const hit=rock=>run(`items=[{x:ship.x,y:shipY(),r:9,v:0,rock:${rock},a:0}];update(.01)`);
run('start()');isolate();for(let i=0;i<10;i++)hit(false);assert.equal(run('score'),170);
run('items=[{x:0,y:H+21,r:9,v:0,rock:false,a:0}];update(.01)');assert.equal(run('combo'),0);
// Dash ignores incoming damage, covers a useful distance, and cannot be spammed.
run('ship.direction=1;dash()');const x=run('ship.x');hit(true);assert.equal(run('hp'),3);assert(run('ship.x')>x);
const cd=run('dashCooldown');run('dash()');assert.equal(run('dashCooldown'),cd);
run('dashTime=0');hit(true);assert.equal(run('hp'),2);hit(true);assert.equal(run('hp'),2);
// A star between the old and new ship position must be caught during a dash.
run('dashCooldown=0;ship.x=ship.target=200;ship.direction=1;dash();items=[{x:250,y:shipY(),r:9,v:0,rock:false,a:0}];update(.05)');assert.equal(run('combo'),1);
run('pause()');assert.equal(run('state'),'paused');assert(els.dash.disabled);run('pause()');assert.equal(run('state'),'playing');
run('elapsed=29.99;update(.02)');assert.equal(run('phase'),1);run('elapsed=59.99;update(.02)');assert.equal(run('phase'),2);
run('dashTime=0;combo=0;score=0');hit(false);assert.equal(run('score'),20);
// Warning precedes hazards and always leaves at least one full lane safe.
isolate();run('warnWave()');assert.equal(run('warnings.length'),2);assert.equal(run('items.length'),0);for(let i=0;i<27;i++)run('update(.05)');assert.equal(run('warnings.length'),0);assert(run('items.filter(o=>o.rock).length')>0);
run('start()');isolate();run('starWave()');assert.equal(run('pending.length'),6);assert(run('pending.every(p=>p.x>=.1&&p.x<=.9)'));
// Terminal states and records reset cleanly.
run('score=234;hp=1;invincible=dashTime=0');hit(true);assert.equal(run('state'),'over');assert.equal(storage['mooncatch-best-v3'],'234');
run('start()');assert.equal(run('phase'),0);assert.equal(run('dashCooldown'),0);assert.equal(run('warnings.length'),0);assert.equal(run('score'),0);
run('elapsed=89.99;update(.02)');assert.equal(run('state'),'over');assert.equal(run('time'),0);
width=340;height=330;run('resize();start();starWave();warnWave();draw(1)');assert(run('ship.x>=24&&ship.x<=W-24'));
events.keydown({key:' ',target:{tagName:'CANVAS'},preventDefault:noop,repeat:false});assert(run('dashTime')>0);
events.keydown({key:'p',target:{tagName:'CANVAS'},preventDefault:noop,repeat:false});assert.equal(run('state'),'paused');
console.log('V2 regression PASS: combo, miss, dash immunity/distance/cooldown/swept collision, damage cooldown, pause, phases, double score, hazard telegraph/safe lanes, patterns, loss/record/restart/time limit, mobile draw and keyboard controls');

// Mobile: touch-down does not teleport, a second finger dashes without steering.
width=360;height=420;run('resize();start()');isolate();
const touch=(id,x)=>({pointerId:id,clientX:x,pointerType:'touch',preventDefault:noop});
const before=run('ship.target');elementEvents['sky:pointerdown'](touch(1,40));assert.equal(run('ship.target'),before);
elementEvents['sky:pointermove'](touch(1,70));assert.equal(run('ship.target'),before+30);
elementEvents['sky:pointerdown'](touch(2,330));assert(run('dashTime')>0);assert.equal(run('ship.target'),before+30);
elementEvents['sky:pointermove'](touch(2,10));assert.equal(run('ship.target'),before+30);
elementEvents['sky:pointercancel'](touch(1,70));assert.equal(run('movePointer'),2);
elementEvents['sky:pointermove'](touch(2,20));assert.equal(run('ship.target'),before+40);
elementEvents['sky:pointerup'](touch(2,20));assert.equal(run('movePointer'),null);
run('pause()');assert.equal(run('touches.size'),0);run('pause();dashCooldown=0');
elementEvents['dash:pointerdown']({preventDefault:noop,stopPropagation:noop});assert(run('dashTime')>0);
els.hand.onclick();assert.equal(storage['mooncatch-left-hand'],'true');
// Breaking a rock makes a collectible, but non-dash invulnerability does not.
run('start()');isolate();run('dashTime=.3;items=[{x:ship.x,y:shipY(),v:0,a:0,r:12,rock:true}];update(.01)');
assert.equal(run('hp'),3);assert.equal(run('shards.length'),1);assert.equal(run('dust'),0);
for(let i=0;i<30;i++)run('update(.01)');assert.equal(run('dust'),1);assert.equal(run('score'),25);
run('shards=[];dashTime=0;invincible=1');hit(true);assert.equal(run('shards.length'),0);assert.equal(run('hp'),3);
// Upgrade screen freezes all gameplay, offers two valid choices, and resumes explicitly.
run('dust=3;offerUpgrade()');assert.equal(run('state'),'upgrade');assert.equal(run('offers.length'),2);assert.notEqual(run('offers[0].id'),run('offers[1].id'));
const frozen=run('[time,dashCooldown,elapsed].join()');run('update(1)');assert.equal(run('[time,dashCooldown,elapsed].join()'),frozen);
const chosen=run('offers[0].id');run('chooseUpgrade(0)');assert.equal(run('powers["'+chosen+'"]'),1);assert.equal(run('state'),'paused');assert.equal(run('upgradeCount'),1);
run('chooseUpgrade(0)');assert.equal(run('upgradeCount'),1);run('pause()');assert.equal(run('state'),'playing');
run('powers={magnet:2,echo:0,chain:0};dust=8;offerUpgrade()');assert(run('offers.every(p=>p.id!=="magnet")'));
run('chooseUpgrade(1);pause();dust=15;offerUpgrade();chooseUpgrade(0);pause();dust=50;offerUpgrade()');assert.equal(run('upgradeCount'),3);assert.equal(run('state'),'playing');
// Magnet pulls in an otherwise missed star; echo catches without damaging the real ship.
run('start()');isolate();run('powers.magnet=1;items=[{x:ship.x+80,y:shipY()-10,v:0,a:0,r:9,rock:false}]');
const distance=run('items[0].x-ship.x');run('update(.05)');assert(run('items[0].x-ship.x')<distance);
for(let i=0;i<15;i++)run('update(.05)');assert.equal(run('combo'),1);
run('start()');isolate();run('powers.echo=1;ship.x=ship.target=80;dash();dashTime=0;ship.x=ship.target=260;items=[{x:80,y:shipY(),v:0,a:0,r:9,rock:false}];update(.01)');assert.equal(run('combo'),1);assert(run('echoes.length')>0);
run('items=[{x:80,y:shipY(),v:0,a:0,r:12,rock:true}];update(.01)');assert.equal(run('hp'),3);
// Chain reaction is bounded and does not duplicate shard drops.
run('start()');isolate();run('powers.chain=1;items=[{x:50,y:100,rock:true},{x:110,y:100,rock:true},{x:170,y:100,rock:true},{x:300,y:100,rock:true}];shatter(items[0])');
assert.equal(run('shards.length'),3);assert(!run('items[3].dead'));run('shatter(items[0])');assert.equal(run('shards.length'),3);
run('start()');assert.equal(run('dust'),0);assert.equal(run('echoes.length'),0);assert.equal(run('powers.chain'),0);assert.equal(run('upgradeCount'),0);assert(els.upgrade.hidden);
run('powers={magnet:2,echo:2,chain:2};dash();shards=[{x:80,y:80,life:1}];rings=[{x:80,y:80,radius:85,life:.2}];draw(1)');
console.log('V3 PASS: relative touch, two-finger dash, cancel/release handoff, immediate button, handedness, shard collection, upgrade freeze/choice/caps/reset, magnet, echo, bounded chain, mobile draw');
