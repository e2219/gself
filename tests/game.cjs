const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const els={},events={},storage={},noop=()=>{};
const ctx=new Proxy({createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
let width=960,height=510;
function el(id){return els[id]??={style:{},textContent:'',innerHTML:'',hidden:false,disabled:false,setAttribute:noop,focus:noop,addEventListener:noop,getContext:()=>ctx,getBoundingClientRect:()=>({width,height,left:0})}}
const sandbox={document:{getElementById:el,addEventListener:noop},window:{addEventListener:(n,f)=>events[n]=f},localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v},ResizeObserver:class{observe(){}},devicePixelRatio:1,requestAnimationFrame:noop,Math,console};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dist/game.js','utf8'),sandbox);
const run=x=>vm.runInContext(x,sandbox);
const isolate=()=>run('spawn=hazardClock=100;items=[];pending=[];warnings=[]');
const hit=rock=>run(`items=[{x:ship.x,y:H-62,r:9,v:0,rock:${rock},a:0}];update(.01)`);
run('start()');isolate();for(let i=0;i<10;i++)hit(false);assert.equal(run('score'),170);
run('items=[{x:0,y:H+21,r:9,v:0,rock:false,a:0}];update(.01)');assert.equal(run('combo'),0);
// Dash ignores incoming damage, covers a useful distance, and cannot be spammed.
run('ship.direction=1;dash()');const x=run('ship.x');hit(true);assert.equal(run('hp'),3);assert(run('ship.x')>x);
const cd=run('dashCooldown');run('dash()');assert.equal(run('dashCooldown'),cd);
run('dashTime=0');hit(true);assert.equal(run('hp'),2);hit(true);assert.equal(run('hp'),2);
// A star between the old and new ship position must be caught during a dash.
run('dashCooldown=0;ship.x=ship.target=200;ship.direction=1;dash();items=[{x:250,y:H-62,r:9,v:0,rock:false,a:0}];update(.05)');assert.equal(run('combo'),1);
run('pause()');assert.equal(run('state'),'paused');assert(els.dash.disabled);run('pause()');assert.equal(run('state'),'playing');
run('elapsed=29.99;update(.02)');assert.equal(run('phase'),1);run('elapsed=59.99;update(.02)');assert.equal(run('phase'),2);
run('dashTime=0;combo=0;score=0');hit(false);assert.equal(run('score'),20);
// Warning precedes hazards and always leaves at least one full lane safe.
isolate();run('warnWave()');assert.equal(run('warnings.length'),2);assert.equal(run('items.length'),0);for(let i=0;i<27;i++)run('update(.05)');assert.equal(run('warnings.length'),0);assert(run('items.filter(o=>o.rock).length')>0);
run('start()');isolate();run('starWave()');assert.equal(run('pending.length'),6);assert(run('pending.every(p=>p.x>=.1&&p.x<=.9)'));
// Terminal states and records reset cleanly.
run('score=234;hp=1;invincible=dashTime=0');hit(true);assert.equal(run('state'),'over');assert.equal(storage['mooncatch-best-v2'],'234');
run('start()');assert.equal(run('phase'),0);assert.equal(run('dashCooldown'),0);assert.equal(run('warnings.length'),0);assert.equal(run('score'),0);
run('elapsed=89.99;update(.02)');assert.equal(run('state'),'over');assert.equal(run('time'),0);
width=340;height=330;run('resize();start();starWave();warnWave();draw(1)');assert(run('ship.x>=24&&ship.x<=W-24'));
events.keydown({key:' ',target:{tagName:'CANVAS'},preventDefault:noop,repeat:false});assert(run('dashTime')>0);
events.keydown({key:'p',target:{tagName:'CANVAS'},preventDefault:noop,repeat:false});assert.equal(run('state'),'paused');
console.log('PASS: combo, miss, dash immunity/distance/cooldown/swept collision, damage cooldown, pause, phases, double score, hazard telegraph/safe lanes, patterns, loss/record/restart/time limit, mobile draw and keyboard controls');
