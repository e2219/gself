/* Shared-board simultaneous puzzles. Both actors move from one pre-turn state. */
(function(root){'use strict';
const DIR={U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]},at=(p,w)=>Array.isArray(p)?p[1]*w+p[0]:p;
function compile(l){const w=l.map[0].length,idx=p=>at(p,w),trails=(l.trails||[]).map(idx);return {...l,w,h:l.map.length,floor:l.map.join(''),starts:l.starts.map(idx),goals:l.goals.map(idx),boxes:(l.boxes||[]).map(idx),docks:(l.docks||[]).map(idx),trails,trailIndex:new Map(trails.map((p,i)=>[p,i])),trailAll:2**trails.length-1,plates:(l.plates||[]).map(p=>({...p,pos:idx(p.at)})),gates:(l.gates||[]).map(p=>({...p,pos:idx(p.at)}))};}
function initial(l){let ink=0;for(const p of l.starts)if(l.trailIndex.has(p))ink|=1<<l.trailIndex.get(p);return {p:[...l.starts],boxes:[...l.boxes].sort((a,b)=>a-b),ink,moves:0};}
const copy=s=>({p:[...s.p],boxes:[...s.boxes],ink:s.ink,moves:s.moves});
function openGate(l,s,g){return l.plates.filter(p=>p.id===g.id).some(p=>s.p.includes(p.pos)||s.boxes.includes(p.pos));}
function pass(l,s,n){return n>=0&&n<l.floor.length&&l.floor[n]!=='#'&&!(l.trailIndex.has(n)&&(s.ink&(1<<l.trailIndex.get(n))))&&!l.gates.some(g=>g.pos===n&&!openGate(l,s,g));}
function turn(l,s,d){if(!DIR[d])return null;const [dx,dy]=DIR[d],proposals=s.p.map((p,i)=>{const sign=i?-1:1,x=p%l.w+dx*sign,y=Math.floor(p/l.w)+dy*sign,n=y*l.w+x;if(x<0||x>=l.w||y<0||y>=l.h||!pass(l,s,n)||s.p.includes(n))return null;const box=s.boxes.indexOf(n);if(box<0)return {n,box:-1};const xx=x+dx*sign,yy=y+dy*sign,t=yy*l.w+xx;if(xx<0||xx>=l.w||yy<0||yy>=l.h||!pass(l,s,t)||s.boxes.includes(t)||s.p.includes(t))return null;return {n,box,t};});
const [a,b]=proposals;if(a&&b&&(a.n===b.n||(a.box>=0&&b.box>=0&&(a.box===b.box||a.t===b.t))||(a.box>=0&&a.t===b.n)||(b.box>=0&&b.t===a.n)))return null;
if(!a&&!b)return null;const n=copy(s);proposals.forEach((p,i)=>{if(!p)return;n.p[i]=p.n;if(p.box>=0)n.boxes[p.box]=p.t;if(l.trailIndex.has(p.n))n.ink|=1<<l.trailIndex.get(p.n)});n.boxes.sort((a,b)=>a-b);n.moves++;return n;}
const won=(l,s)=>s.p.every((p,i)=>p===l.goals[i])&&l.docks.every(p=>s.boxes.includes(p))&&s.ink===l.trailAll;
const key=s=>s.p.join(',')+'|'+s.boxes.join(',')+'|'+s.ink;
class Game{constructor(l){this.level=compile(l);this.reset()}reset(){this.state=initial(this.level);this.history=[];this.notice=''}step(d){if(this.won)return false;const n=turn(this.level,this.state,d);if(!n){this.notice='通路被挡或两人相撞；这一步不计步。';return false}this.history.push(copy(this.state));this.state=n;this.notice='';return true}undo(){if(!this.history.length)return false;this.state=this.history.pop();this.notice='两位旅人与机关已同步撤销。';return true}get won(){return won(this.level,this.state)}}
function solve(level,limit=200000){const l=compile(level),s=initial(l),q=[s],prev=[-1],actions=[''],seen=new Set([key(s)]);for(let h=0;h<q.length;h++){if(won(l,q[h])){let path='',p=h;while(prev[p]>=0){path=actions[p]+path;p=prev[p]}return {path,minimum:path.length,visited:q.length}}if(q.length>=limit)return null;for(const d of ['U','R','D','L']){const n=turn(l,q[h],d);if(!n)continue;const k=key(n);if(seen.has(k))continue;seen.add(k);q.push(n);prev.push(h);actions.push(d)}}return null}
const api={DIR,at,compile,initial,copy,turn,won,key,Game,solve,openGate};root.EchoSync=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
