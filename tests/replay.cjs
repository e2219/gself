const assert=require('node:assert/strict'),{Puzzle,STEP,LEVELS}=require('../dist/echo/replay');
const at=(a,x,y)=>a?.x===x&&a?.y===y,tick=(g,n=1)=>{for(let i=0;i<n;i++)g.tick()},until=(g,fn)=>{for(let i=0;i<1600;i++){if(fn())return;g.tick()}throw Error('Replay timed out '+g.index+' '+JSON.stringify(g.player))},go=(g,x,y)=>{g.navigate(x,y);until(g,()=>at(g.player,x,y))},mark=(g,x,y)=>{go(g,x,y);assert(g.guard());tick(g)},guardAt=(g,x,y)=>until(g,()=>g.guardWaiting&&at(g.ghost,x,y)),end=(g)=>until(g,()=>g.cursor===g.trace.length-1);
function run(index){const g=new Puzzle(index);g.record();
 if(index===0){go(g,5,3);g.replay();end(g);const pos={...g.ghost};tick(g,30);assert.deepEqual(g.ghost,pos);go(g,10,7);assert(g.latched);go(g,15,5)}
 if(index===2){for(const [x,y]of [[4,3],[8,3]]){go(g,x,y);g.wait();tick(g,12)}go(g,12,3);g.replay();for(const [x,y]of [[6,7],[10,7],[15,7]])go(g,x,y)}
 if(index===3){go(g,9,3);g.replay();tick(g,80);assert(g.echoBlocked);go(g,3,3);end(g);go(g,9,7);assert(g.latches.calibrated);go(g,14,5)}
 if(index===4){mark(g,8,3);go(g,13,3);g.replay();guardAt(g,8,3);assert(g.interact());go(g,8,7);assert(g.interact());assert(g.socketOn('m'));g.guard();end(g);assert(g.interact());go(g,14,7);assert(g.interact());go(g,15,5)}
 if(index===6){mark(g,4,3);mark(g,10,3);go(g,4,3);g.replay();guardAt(g,4,3);go(g,8,7);g.guard();guardAt(g,10,3);go(g,14,7);assert(g.interact());go(g,8,7);g.guard();end(g);go(g,2,8);assert(g.interact());go(g,2,6)}
 assert.equal(g.mode,'won');const before=JSON.stringify(g);tick(g,30);assert.equal(JSON.stringify(g),before);return g;
}
for(const i of [0,2,3,4,6])run(i);
const lone=new Puzzle(0);lone.record();go(lone,5,3);go(lone,10,7);assert(!lone.latched);assert(!lone.walkable(13,5));
const g=new Puzzle(6);g.record();mark(g,4,3);go(g,10,3);g.replay();guardAt(g,4,3);const cur=g.cursor;go(g,8,7);tick(g,30);assert.equal(g.cursor,cur);g.guard();end(g);go(g,14,7);g.interact();go(g,8,7);assert.equal(g.pathTo(2,8).length,0,'Missing return route strands body');g.paused=true;const frozen=JSON.stringify(g);tick(g,50);assert.equal(JSON.stringify(g),frozen);assert(!g.interact());assert(!g.guard());g.paused=false;g.restart();assert.equal(g.releasedMarks.size,0);assert(g.guardMarks.size);assert(!g.carry);g.record();assert.equal(g.guardMarks.size,0);
assert.notDeepEqual(LEVELS[3].map,LEVELS[4].map,'Staggered power rooms have distinct geometry');
const turns=new Puzzle(0);turns.record();assert(turns.tick([1,0]));assert.equal(turns.trace.length,2);turns.wait();assert.equal(turns.trace.length,3);assert.deepEqual(turns.trace[1],turns.trace[2]);turns.replay();assert(turns.tick([1,0]));assert.equal(turns.cursor,1);turns.wait();assert.equal(turns.cursor,2);assert.deepEqual(turns.ghost,turns.trace[1]);
const wall=new Puzzle(0);wall.record();wall.tick([-1,0]);const blocked=JSON.stringify(wall);assert.equal(wall.tick([-1,0]),false);assert.equal(JSON.stringify(wall),blocked,'Blocked movement records no step');
console.log('Replay PASS: five complete recorded solutions; terminal hold, explicit recorded wait turns, role gates, blocking/hand-off, reusable core, A-B-A return necessity, pause, retry and rerecord');
module.exports={run,go,tick,until,mark,guardAt,end};
