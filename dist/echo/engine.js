/* Mooncatch: deterministic, simultaneous, turn-based puzzle rules. */
(function(root){
 'use strict';
 const DIR={U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]};
 const at=(p,w)=>Array.isArray(p)?p[1]*w+p[0]:p;
 function compile(level){
  const boards=level.boards.map(b=>{
   const w=b.map[0].length,h=b.map.length,idx=p=>at(p,w),floor=b.map.join('');
   const trails=(b.trails||[]).map(idx),cells=(b.mines?.cells||[]).map(idx),mines=(b.mines?.bombs||[]).map(idx);
   const clues=(b.mines?.clues||[]).map(p=>{const n=idx(p),x=n%w,y=Math.floor(n/w);return {pos:n,count:mines.filter(m=>Math.abs(m%w-x)<=1&&Math.abs(Math.floor(m/w)-y)<=1).length};});
   return {...b,w,h,floor,start:idx(b.start),goal:idx(b.goal),boxes:(b.boxes||[]).map(idx).sort((a,b)=>a-b),docks:(b.docks||[]).map(idx),trails,trailIndex:new Map(trails.map((v,i)=>[v,i])),trailAll:2**trails.length-1,cells,mines,clues,gate:(b.gates||[]).map(g=>({...g,pos:idx(g.at)}))};
  });
  return {...level,boards};
 }
 function initial(l){return {p:l.boards.map(b=>b.start),boxes:l.boards.map(b=>[...b.boxes]),ink:l.boards.map(b=>b.trailIndex.has(b.start)?2**b.trailIndex.get(b.start):0),flags:[[],[]],safe:l.boards.map(b=>!b.cells.length),moves:0};}
 function copy(s){return {p:[...s.p],boxes:s.boxes.map(a=>[...a]),ink:[...s.ink],flags:s.flags.map(a=>[...a]),safe:[...s.safe],moves:s.moves};}
 function onPlate(l,s,actor,point){const pos=at(point,l.boards[actor].w);return s.p[actor]===pos||s.boxes[actor].includes(pos);}
 function openGate(l,s,g){
  if(g.safe!==undefined)return s.safe[g.safe];
  if(g.any)return g.any.some(p=>onPlate(l,s,p.actor,p.at));
  return onPlate(l,s,g.actor,g.plate);
 }
 function passable(l,s,i,n){
  const b=l.boards[i];if(n<0||n>=b.floor.length||b.floor[n]==='#')return false;
  if(b.cells.includes(n)&&(!s.safe[i]||b.mines.includes(n)))return false;
  if(b.trailIndex.has(n)&&(s.ink[i]&(1<<b.trailIndex.get(n)))&&s.p[i]!==n)return false;
  const gate=b.gate.find(g=>g.pos===n);return !gate||openGate(l,s,gate);
 }
 function delta(l,dir,i){let [x,y]=DIR[dir];if(i===1){if(l.transform==='mirrorX')x=-x;if(l.transform==='mirrorY')y=-y;if(l.transform==='rotate')[x,y]=[-y,x];}return [x,y];}
 function turn(l,s,dir){
  if(!DIR[dir])return null;const next=copy(s);let changed=false;
  for(let i=0;i<2;i++){
   const b=l.boards[i],[dx,dy]=delta(l,dir,i),p=s.p[i],x=p%b.w+dx,y=Math.floor(p/b.w)+dy;
   if(x<0||x>=b.w||y<0||y>=b.h)continue;const n=y*b.w+x;
   if(!passable(l,s,i,n))continue;const bi=s.boxes[i].indexOf(n);
   if(bi>=0){const xx=x+dx,yy=y+dy,t=yy*b.w+xx;if(xx<0||xx>=b.w||yy<0||yy>=b.h||!passable(l,s,i,t)||s.boxes[i].includes(t))continue;next.boxes[i][bi]=t;next.boxes[i].sort((a,b)=>a-b);}
   next.p[i]=n;if(b.trailIndex.has(n))next.ink[i]|=1<<b.trailIndex.get(n);changed=true;
  }
  if(!changed)return null;next.moves++;return next;
 }
 function won(l,s){return l.boards.every((b,i)=>s.p[i]===b.goal&&s.safe[i]&&b.docks.every(p=>s.boxes[i].includes(p))&&s.ink[i]===b.trailAll);}
 function key(s){return s.p.join(',')+'|'+s.boxes.map(a=>a.join(',')).join(';')+'|'+s.ink.join(',');}
 class Game{
  constructor(level){this.level=compile(level);this.reset();}
  reset(){this.state=initial(this.level);this.history=[];this.notice='';}
  step(dir){if(won(this.level,this.state))return false;const n=turn(this.level,this.state,dir);if(!n){this.notice='两侧都被挡住。这一步不消耗回合。';return false;}this.history.push(copy(this.state));this.state=n;this.notice='';return true;}
  flag(actor,pos){const b=this.level.boards[actor];if(this.state.safe[actor]||!b.cells.includes(pos))return false;this.history.push(copy(this.state));const a=this.state.flags[actor],i=a.indexOf(pos);if(i<0)a.push(pos);else a.splice(i,1);this.notice='按数字推断雷位，再确认排雷。';return true;}
  check(){
   let found=false;for(let i=0;i<2;i++){const b=this.level.boards[i];if(this.state.safe[i])continue;found=true;const flags=this.state.flags[i];if(flags.length!==b.mines.length||!b.mines.every(p=>flags.includes(p))){this.notice='标记尚未与全部数字吻合；数字统计周围八格。';return false;}}
   if(found){this.history.push(copy(this.state));this.state.safe=[true,true];this.notice='排雷确认：安全格已开放，雷位仍不可通行。';}return found;
  }
  undo(){if(!this.history.length)return false;this.state=this.history.pop();this.notice='已同步撤销两侧状态。';return true;}
  get won(){return won(this.level,this.state);}
 }
 function solve(level,limit=350000){
  const l=compile(level),s=initial(l);s.safe=[true,true];s.flags=l.boards.map(b=>[...b.mines]);
  const q=[s],prev=[-1],actions=[''],seen=new Set([key(s)]);
  for(let h=0;h<q.length;h++){
   if(won(l,q[h])){let path='',p=h;while(prev[p]>=0){path=actions[p]+path;p=prev[p];}return {path,visited:q.length,minimum:path.length};}
   if(q.length>=limit)return null;
   for(const d of ['U','R','D','L']){const n=turn(l,q[h],d);if(!n)continue;const k=key(n);if(seen.has(k))continue;seen.add(k);q.push(n);prev.push(h);actions.push(d);}
  }return null;
 }
 function mineSolutions(level,actor){const l=compile(level),b=l.boards[actor],sol=[];if(b.cells.length>16)throw Error('Mine clue search too large');
  for(let mask=0;mask<2**b.cells.length;mask++){const chosen=b.cells.filter((_,i)=>mask&(1<<i));if(chosen.length!==b.mines.length)continue;if(b.clues.every(c=>chosen.filter(n=>Math.abs(n%b.w-c.pos%b.w)<=1&&Math.abs(Math.floor(n/b.w)-Math.floor(c.pos/b.w))<=1).length===c.count))sol.push(chosen);}return sol;
 }
 const api={DIR,compile,initial,copy,turn,won,key,Game,solve,mineSolutions,openGate,at};root.EchoSync=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
