(function(root){'use strict';
const STEP = 1; // One explicit player turn; never wall-clock time.
const grid = (w=17,h=11) => Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>x===0||y===0||x===w-1||y===h-1?'#':'.'));
function first(){const m=grid();for(let y=1;y<10;y++)m[y][13]='#';m[5][13]='.';return m;}
function second(){const m=grid();for(let y=1;y<10;y++)m[y][10]='#';m[5][10]='.';return m;}
function third(){const m=grid();for(let x=1;x<16;x++)m[5][x]='#';m[5][2]='.';for(let y of [1,9])for(let x=1;x<16;x++)m[y][x]='#';m[7][7]='#';m[8][7]='#';return m;}
const verticalGate=(id,x,y,rule,label,controls=[])=>({id,cells:[{x,y}],rule,label,controls});
function chambers(){const m=grid();for(const x of [6,11])for(let y=1;y<10;y++)m[y][x]=y===5?'.':'#';return m;}
function returnHall(shutter=false){const m=grid();for(let x=1;x<16;x++)m[5][x]='#';m[5][2]='.';for(const y of [1,9])for(let x=1;x<16;x++)m[y][x]='#';if(shutter)for(let y=2;y<=4;y++)m[y][8]='.';return m;}
const laneGate=(id,x,ys,rule,label,controls=[])=>({id,cells:ys.map(y=>({x,y})),rule,label,controls});
const plate=(id,x,y,role,name)=>({id,x,y,role,name});
const LEVELS=[
 {id:0,title:'双月之门',sub:'两处月台，一个约定',concept:'分身协作',desc:'门上的两弯月牙，需要你与月影同时唤醒。',objective:'同时点亮两座月台，然后抵达归航门。',map:first(),start:{x:2,y:5},plates:[{id:'a',x:5,y:3,name:'月台 A'},{id:'b',x:10,y:7,name:'月台 B'}],gates:[{id:'seal',cells:[{x:13,y:5}]}],exit:{x:15,y:5},hints:['月影会留在航迹终点。它可以替你一直守住一座月台。','先录制到 A 的路线并结束，再亲自走到 B。双台亮起后，门会保持开启。'],message:'两道月光，终于在同一刻抵达。'},
 {id:1,title:'月核接力',sub:'把守候交给过去',concept:'职责交换',desc:'月核维持着舱门，却也必须被送到门的另一边。',objective:'让月影撑住舱门，带月核到右侧祭坛，再归航。',map:second(),start:{x:2,y:5},plates:[{id:'a',x:5,y:3,name:'撑门月台'}],gates:[{id:'seal',cells:[{x:10,y:5}]}],core:{x:5,y:6},target:{x:13,y:5},exit:{x:15,y:5},hints:['月核留在底座上，或月台被占据，都能给舱门供能。','录制到月台的路线。回放后靠近月核按 E 取走，送到右侧祭坛按 E 安放。'],message:'过去的你守住门，现在的你带来光。'},
 {id:2,title:'接力长廊',sub:'为未来安排一次等待',concept:'顺序与停留',desc:'上方三座月台，依次控制下方的三道门。',objective:'录制依次踏上 A、B、C 的航迹，本体穿过下方长廊。',map:third(),start:{x:2,y:7},plates:[{id:'a',x:4,y:3,name:'月台 A'},{id:'b',x:8,y:3,name:'月台 B'},{id:'c',x:12,y:3,name:'月台 C'}],gates:[5,9,13].map((x,i)=>({id:['a','b','c'][i],cells:[6,7,8].map(y=>({x,y}))})),exit:{x:15,y:7},hints:['在上方月台录制，回放时走下方。离台后，门还会保留 10 步余光。','录制时在 A、B 各按「等待一步」留下数步停留，最后停在 C。下方第二段要从上侧绕过断墙。'],message:'你留下的每一次等待，都成为了后来的路。'}
,
 {id:3,advanced:true,title:'逆向供能',sub:'先帮助过去，再抵达未来',concept:'互为前提 · ★★',desc:'内门的电源在门外，接替电源却在门内。两个自己必须交换守门的责任。',objective:'点亮校准封印，再穿过内外两道门归航。',map:chambers(),start:{x:2,y:7},
 plates:[plate('b',3,3,'body','实台 B'),plate('a',9,3,'echo','影台 A'),plate('c',9,7,'body','实台 C')],
 gates:[verticalGate('entry',6,5,{any:[{plate:'b'},{plate:'a'}]},'B 或 A',['b','a']),verticalGate('seal',11,5,{latch:'calibrated'},'校准封印',['a','c'])],
 latchRules:[{id:'calibrated',rule:{all:[{plate:'a'},{plate:'c'}]},name:'A 与 C 同时校准'}],exit:{x:14,y:5},
 rules:['紫色影台只认月影，青色实台只认本体。','录制时虚门可通行；回放时门会挡住月影，航迹在门前暂停。','入口由 B 或 A 供能；内门需要 A 与 C 同时亮起一次。'],
 hints:['你不必和月影一起穿过第一道门。谁能先去接替门内的电源？','本体守住 B，让月影进入内室。月影到 A 后，入口就不再依赖 B。','录制终点选 A。回放时先去 B，等影台 A 亮起，再进入 C 完成校准。'],message:'你先替过去开门，过去才替你留下出口。'},
 {id:4,advanced:true,title:'一核两用',sub:'任何一次取回，都需要有人接替',concept:'能源周转 · ★★★',desc:'唯一的月核要经过两座供能座，最后送往祭坛。早一步取走，通路就会断电。',objective:'把月核从 S 依次周转到 M 和祭坛，让月影接替两段供能。',map:chambers(),start:{x:2,y:7},
 plates:[plate('a',8,3,'echo','影台 A'),plate('b',13,3,'echo','影台 B')],
 gates:[verticalGate('entry',6,5,{any:[{socket:'s'},{plate:'a'},{delivered:true}]},'S 或 A',['a']),verticalGate('inner',11,5,{any:[{socket:'m'},{plate:'b'},{delivered:true}]},'M 或 B',['b'])],
 core:{x:3,y:7},sockets:[{id:'s',x:3,y:7,name:'供能座 S'},{id:'m',x:8,y:7,name:'供能座 M'}],target:{x:14,y:7},exit:{x:15,y:5},
 rules:['月核可以用 E 取回、放入供能座；全场只有一枚。','第一道门由 S 或影台 A 供能；第二道门由 M 或影台 B 供能。','录制时在关键位置按 F 标记守候；回放时按 F 让月影继续。'],
 hints:['想把月核带过一扇门，必须先找到另一种维持这扇门的方法。','月影需要先守 A，让你把月核送到 M；等第二道门通电，它才能去 B 接班。','录制 A → B，在 A 按 F 留守候。回放：等月影到 A，取 S 的核放到 M；按 F 放行月影，到 B 后再取回月核送祭坛。'],message:'只有一枚光核，也能照亮整段旅程。'},
 {id:5,advanced:true,title:'余辉方程',sub:'有些光，必须亮起两次才会熄灭',concept:'奇偶推理 · ★★★★',desc:'四枚影印会翻转不同灯组。穿过一个影印并不一定有利，返回也会留下新的改变。',objective:'使灯阵变为「○ ● ○ ○」，然后抵达归航门。',map:first(),start:{x:2,y:7},
 plates:[plate('k',3,7,'body','译码台 K'),{...plate('a',5,3,'echo','A · 翻①②'),toggle:[0,1]},{...plate('b',8,3,'echo','B · 翻②③'),toggle:[1,2]},{...plate('c',11,3,'echo','C · 翻③④'),toggle:[2,3]},{...plate('d',8,7,'echo','D · 翻①③④'),toggle:[0,2,3]}],
 gates:[verticalGate('equation',13,5,{lamps:true},'灯阵吻合',['a','b','c','d'])],lampTarget:[false,true,false,false],powerPlate:'k',exit:{x:15,y:5},
 rules:['本体站在 K 时，月影每次踏入影印，翻转它对应的灯。','离开 K 会锁存当前灯阵；原地停留不会重复翻转。','灯的变化按进入次数计算：同一影印触发两次会相互抵消。'],
 hints:['从四盏灯分别倒推：哪些影印需要触发奇数次，哪些需要偶数次？','要只亮②，A、C、D 应各触发奇数次，B 应触发偶数次。航迹不能无意穿过 B。','录制 A → 上侧绕行避开 B → C → D。回放时本体始终在 K，灯阵吻合后离开 K，再去归航门。'],message:'真正的答案，藏在你选择熄灭的光里。'},
 {id:6,advanced:true,title:'借道归还',sub:'你需要的，不止一条去路',concept:'逆向规划 · ★★★★',desc:'月核在长廊尽头，祭坛却在出发处。为去程安排的月影，未必能为归程开门。',objective:'取回远端月核，把它送回起点附近的祭坛。',map:returnHall(),start:{x:2,y:7},
 plates:[plate('a',4,3,'echo','影台 A'),plate('b',10,3,'echo','影台 B')],
 gates:[laneGate('outer',6,[6,7,8],{plate:'a'},'A',['a']),laneGate('inner',11,[6,7,8],{plate:'b'},'B',['b'])],
 core:{x:14,y:7},target:{x:2,y:8},exit:{x:2,y:6},
 rules:['两扇门只在对应影台被占据时开启，没有余光延迟。','紫色影台只认月影。本体必须携带月核穿过两道门返回。','守候标记 F 不限等待时长；本体准备好后再放行月影。'],
 hints:['从“带着月核回到起点”倒推：最后一段航迹应停在哪里？','先过 A 门，再借 B 门取核并退回中间。之后还需要一次 A。','录制 A → B → A，在前两次停靠各按 F。回放：过外门后放行；取核并退到两门之间后再放行；最后回祭坛安放。'],message:'走到尽头之后，你仍为自己记得归路。'},
 {id:7,advanced:true,title:'因果回廊',sub:'每一次启程，都需要另一个你留下',concept:'双向依赖 · ★★★★★',desc:'月影的归路也被一扇门截断。带回月核之前，你必须再次成为过去的电源。',objective:'完成双向接力，把深处的月核带回祭坛。',map:returnHall(true),start:{x:2,y:7},
 plates:[plate('a',4,3,'echo','影台 A'),plate('b',10,3,'echo','影台 B'),plate('k',8,7,'body','实台 K')],
 gates:[laneGate('outer',6,[6,7,8],{plate:'a'},'A',['a']),laneGate('inner',11,[6,7,8],{plate:'b'},'B',['b']),laneGate('echoPass',8,[2,3,4],{plate:'k'},'K · 影门',['k'])],
 core:{x:14,y:7},target:{x:2,y:8},exit:{x:2,y:6},
 rules:['上方影门只在本体站在 K 时开启，月影无法穿过关闭的门。','下方 A / B 门只认对应影台。本体和月影必须轮流守门。','录制阶段虚门开放。回放中受阻的月影会等到门开启，再继续原航迹。'],
 hints:['既要给本体安排返回，也要给月影安排返回。K 在计划里需要出现几次？','月影去 B 和返回 A 都要经过影门。本体去取核之前、带核回来之后，都必须站上 K。','录制 A → B → A，前两处按 F 守候。回放先过 A 门站 K，放行到 B；取核退回 K，再放行到 A，最后把核送回祭坛。'],message:'过去与现在，终于互相成全。'}
];
const same=(a,b)=>!!a&&!!b&&a.x===b.x&&a.y===b.y;
class Puzzle {
 constructor(index=0){this.load(index);}
 load(index){this.index=Number.isInteger(index)&&LEVELS[index]?index:0;this.level=LEVELS[this.index];this.trace=[];this.guardMarks=new Set();this.mode='ready';this.paused=false;this.resetWorld();}
 resetWorld(){
  this.player={...this.level.start};this.ghost=null;this.route=[];this.time=0;this.cursor=0;
  this.waitTicks=0;this.latched=false;this.latches={};this.carry=false;this.delivered=false;
  this.core=this.level.core?{...this.level.core}:null;this.gateTimers={};this.plateOn={};
  this.lamps=[false,false,false,false];this.previousEchoPads=new Set();
  this.releasedMarks=new Set();this.guardWaiting=false;this.echoBlocked=null;this.moves=0;this.notice='';
  this.updateMechanisms(0);
 }
 get recordLimit(){return this.level.advanced?750:250;}
 record(){this.resetWorld();this.trace=[{...this.player}];this.guardMarks=new Set();this.mode='recording';this.paused=false;this.updateMechanisms(0);}
 replay(){if(this.trace.length<2)return false;this.resetWorld();this.mode='playing';this.paused=false;this.ghost={...this.trace[0]};this.updateMechanisms(0);return true;}
 restart(){if(this.trace.length>1)return this.replay();this.mode='ready';this.resetWorld();return true;}
 guard(){
  if(this.paused||!this.level.advanced)return false;
  if(this.mode==='recording'){
   const i=this.trace.length-1;let start=i;while(start>0&&same(this.trace[start-1],this.player))start--;
   const existing=[...this.guardMarks].find(n=>n>=start);this.route=[];this.waitTicks=0;
   if(existing!==undefined){this.guardMarks.delete(existing);this.notice='已移除这个位置的守候标记。';}
   else{this.guardMarks.add(i);this.notice='已标记守候点 · 回放至此将等待你的 F 指令。';}return true;
  }
  if(this.mode==='playing'&&this.guardWaiting){this.releasedMarks.add(this.cursor);this.guardWaiting=false;this.notice='月影继续前行。';return true;}return false;
 }
 socketOn(id){const s=this.level.sockets?.find(s=>s.id===id);return same(this.core,s);}
 matches(rule){
  if(!rule)return false;
  if(rule.any)return rule.any.some(r=>this.matches(r));
  if(rule.all)return rule.all.every(r=>this.matches(r));
  if(rule.plate)return !!this.plateOn[rule.plate];
  if(rule.socket)return this.socketOn(rule.socket);
  if(rule.latch)return !!this.latches[rule.latch];
  if(rule.delivered)return this.delivered;
  if(rule.lamps)return !!this.level.lampTarget&&this.level.lampTarget.every((v,i)=>this.lamps[i]===v);
  return false;
 }
 gateOpen(id){
  if(this.level.advanced){if(this.mode==='recording')return true;return this.matches(this.level.gates.find(g=>g.id===id)?.rule);}
  if(this.index===0)return this.latched;
  if(this.index===1)return !!this.core||this.plateOn.a||this.delivered;
  return (this.gateTimers[id]||0)>0;
 }
 gateAt(x,y){return this.level.gates.find(g=>g.cells.some(c=>c.x===x&&c.y===y));}
 walkable(x,y){if(this.level.map[y]?.[x]!=='.')return false;const g=this.gateAt(x,y);return !g||this.gateOpen(g.id)||same(this.player,{x,y});}
 pathTo(x,y,allowClosed=false){
  const traversable=(x,y)=>this.walkable(x,y)||(allowClosed&&this.level.map[y]?.[x]==='.');
  if(!traversable(x,y))return [];
  const start=this.player,key=p=>p.x+','+p.y,q=[start],seen=new Set([key(start)]),prev=new Map();let end;
  for(let i=0;i<q.length;i++){
   const p=q[i];if(p.x===x&&p.y===y){end=p;break;}
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const n={x:p.x+dx,y:p.y+dy},k=key(n);
    if(!seen.has(k)&&traversable(n.x,n.y)){seen.add(k);prev.set(k,p);q.push(n);}
   }
  }
  if(!end)return [];const path=[];while(!same(end,start)){path.unshift(end);end=prev.get(key(end));}return path;
 }
 navigate(x,y){
  if(this.paused||this.mode==='won')return;this.waitTicks=0;
  // Prefer a currently open route; retain a planned closed-door route only when necessary.
  this.route=this.pathTo(x,y)||[];if(!this.route.length)this.route=this.pathTo(x,y,true);
  if(!this.route.length&&!same(this.player,{x,y}))this.notice='这里暂时无法抵达。先观察门与月台的连线。';
 }
 move(dx,dy){if(this.walkable(this.player.x+dx,this.player.y+dy)){this.player={x:this.player.x+dx,y:this.player.y+dy};this.moves++;return true;}return false;}
 wait(){this.route=[];return this.tick();}
 near(p){return !!p&&Math.abs(p.x-this.player.x)+Math.abs(p.y-this.player.y)<=1;}
 interaction(){
  if(this.mode!=='playing'||this.paused)return null;
  if(this.core&&this.near(this.core))return {kind:'pickup',label:'拾取月核'};
  if(this.carry&&this.near(this.level.target))return {kind:'deliver',label:'安放月核'};
  if(this.carry){const socket=this.level.sockets?.find(s=>this.near(s));if(socket)return {kind:'socket',socket,label:'放入 '+socket.id.toUpperCase()};}
  return null;
 }
 interact(){
  const action=this.interaction();if(!action)return false;
  if(action.kind==='pickup'){this.carry=true;this.core=null;this.notice='月核已取出 · 确认下一道门仍有电源。';}
  if(action.kind==='socket'){this.core={x:action.socket.x,y:action.socket.y};this.carry=false;this.notice=action.socket.name+' 已供能 · 月核仍可取回。';}
  if(action.kind==='deliver'){this.carry=false;this.delivered=true;this.notice='祭坛已点亮 · 前往归航门。';}
  this.updateMechanisms(0);return true;
 }
 exitReady(){
  if(this.level.core)return this.delivered;
  if(this.level.lampTarget)return this.matches({lamps:true});
  if(this.level.latchRules)return this.level.latchRules.every(r=>this.latches[r.id]);
  return this.index!==0||this.latched;
 }
 updateMechanisms(dt){
  for(const p of this.level.plates)this.plateOn[p.id]=(p.role!=='echo'&&same(this.player,p))||(p.role!=='body'&&same(this.ghost,p));
  if(this.index===0&&this.plateOn.a&&this.plateOn.b)this.latched=true;
  if(this.index===2)for(const p of this.level.plates)this.gateTimers[p.id]=this.plateOn[p.id]?10:Math.max(0,(this.gateTimers[p.id]||0)-dt);
  if(this.mode==='playing'){
   for(const latch of this.level.latchRules||[])if(this.matches(latch.rule))this.latches[latch.id]=true;
   const now=new Set();
   for(const p of this.level.plates){
    if(p.toggle&&same(this.ghost,p)){
     now.add(p.id);
     if(!this.previousEchoPads.has(p.id)&&this.plateOn[this.level.powerPlate])for(const i of p.toggle)this.lamps[i]=!this.lamps[i];
    }
   }
   this.previousEchoPads=now;
   if(same(this.player,this.level.exit)&&this.exitReady()){this.mode='won';this.route=[];}
  }
 }
 stepEcho(){
  this.echoBlocked=null;
  if(this.guardMarks.has(this.cursor)&&!this.releasedMarks.has(this.cursor)&&this.cursor<this.trace.length-1){this.guardWaiting=true;return;}
  this.guardWaiting=false;
  const nextIndex=Math.min(this.cursor+1,this.trace.length-1),next=this.trace[nextIndex];
  if(this.level.advanced&&!same(this.ghost,next)){
   const gate=this.gateAt(next.x,next.y);
   if(gate&&!this.gateOpen(gate.id)){this.echoBlocked=gate;return;}
  }
  this.cursor=nextIndex;this.ghost={...next};
  if(this.guardMarks.has(this.cursor)&&!this.releasedMarks.has(this.cursor)&&this.cursor<this.trace.length-1)this.guardWaiting=true;
 }
 tick(direction){
  if(this.paused||!['recording','playing'].includes(this.mode))return false;
  // Invalid directional input consumes no turn. Explicit waits do consume a turn.
  if(direction&&!this.walkable(this.player.x+direction[0],this.player.y+direction[1]))return false;
  this.time++;this.notice='';
  if(direction){this.route=[];this.move(...direction);}
  else if(this.route.length){
   const p=this.route[0];if(this.walkable(p.x,p.y)){this.player=this.route.shift();this.moves++;}
   else this.notice='通路未开 · 此步原地等待月影供能。';
  }else this.moves++;
  this.updateMechanisms(0);
  if(this.mode==='playing')this.stepEcho();
  if(this.mode==='recording'){
   this.trace.push({...this.player});
   if(this.trace.length>=this.recordLimit){this.replay();this.notice='航迹已录满，准备回响；每次行动推进一步。';}
  }
  this.updateMechanisms(1);return true;
 }
}

// Stagger the core-transfer doors: distinct rooms and routes from the calibration puzzle.
LEVELS[4].map[5][6]='#';LEVELS[4].map[4][6]='.';LEVELS[4].gates[0].cells[0].y=4;
LEVELS[4].map[5][11]='#';LEVELS[4].map[6][11]='.';LEVELS[4].gates[1].cells[0].y=6;
const api={Puzzle,STEP,LEVELS};root.EchoReplay=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
