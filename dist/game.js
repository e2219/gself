'use strict';
const elements=new Map(),$=id=>{if(!elements.has(id))elements.set(id,document.getElementById(id));return elements.get(id)},canvas=$('sky'),ctx=canvas.getContext('2d');
const phases=[
  {name:'巡航起步',subtitle:'全场自由移动 · 注意四边红色预警',flight:3.1,interval:3.2,hazards:8,multiplier:1},
  {name:'流星雨',subtitle:'交叉来袭 · 速度与频率持续上升',flight:2.5,interval:2.8,hazards:6,multiplier:1},
  {name:'终幕星雨',subtitle:'高压星雨 · 所有星光得分 ×2',flight:2.1,interval:2.4,hazards:4.8,multiplier:2}
];
const COOLDOWN=5,BOOST_TIME=1.2,BOOST_SPEED=2;
const fleet=[
 {id:'collector',name:'拾光者',skill:'satellite',color:'#a6efdc',trait:'吸星范围 +20% · 货运奖励 +20%',detail:'双生卫星：绕船拾取星光与星屑。'},
 {id:'falcon',name:'游隼',skill:'wake',color:'#e0c0ff',trait:'加速持续 1.4s · 冷却 4.3s · 穿环奖励 +20%',detail:'引力尾迹：加速路径短暂吸引并收集星光与星屑。'},
 {id:'warden',name:'守望者',skill:'split',color:'#ffcf99',trait:'自带 1 层护甲 · 精准反射窗口 0.26s',detail:'反射分裂：精准反弹变为三束，进阶为五束。'}
];
let selectedShip='collector',activeShip='collector',skillWake=[],fleetSignature='';
try{const saved=localStorage.getItem('mooncatch-ship');if(fleet.some(f=>f.id===saved))selectedShip=activeShip=saved}catch{}
const hull=()=>fleet.find(f=>f.id===activeShip);
const boostLimit=()=>activeShip==='falcon'?4.3:COOLDOWN;
const boostDuration=()=>activeShip==='falcon'?1.4:BOOST_TIME;
const cargoReward=n=>Math.round(cargoValue(n)*routeReward()*(activeShip==='collector'?1.2:1));
const ringReward=n=>Math.round(n*(activeShip==='falcon'?1.2:1));
const availablePowers=()=>powersList.filter(p=>!p.owner||p.owner===activeShip);
function selectShip(id){
 if(!['ready','over'].includes(state)||!fleet.some(f=>f.id===id))return;
 selectedShip=activeShip=id;try{localStorage.setItem('mooncatch-ship',id)}catch{}hudSignature='';hud();
}
function fleetHud(){
 const signature=state+'|'+selectedShip;if(signature===fleetSignature)return;fleetSignature=signature;
 for(const f of fleet){const b=$('ship-'+f.id);b.disabled=!['ready','over'].includes(state);b.setAttribute('aria-pressed',String(selectedShip===f.id));}
 $('fleetHint').textContent=state==='ready'||state==='over'?'出发前选择星舰 · 每局技能重置':'本局：'+hull().name+' · 返航后可换舰，重新开始沿用当前星舰';
}
let W=960,H=510,state='ready',score=0,combo=0,hp=3,time=90,best=0,elapsed=0,spawn=0,invincible=0,last=0;
let phase=0,wave=0,hazardClock=5,boostTime=0,boostCooldown=0,announcementTime=0;
let items=[],particles=[],pending=[],warnings=[],keys=new Set(),sound=false,audio;
let ship={x:480,y:350,target:480,targetY:350,direction:1};
let hazardWave=0;
let menuIntro=null,resumeShield=0,resumeSafetyPending=false;
const newFlight=()=>({angle:-Math.PI/2,bank:0,throttle:0,trail:[]});
let flight=newFlight();
let moonPhase='bright',moonCooldown=0,objective=null,adventureSlot=0,fork=null,routeSlot=0,activeRoute=null,adventureResult='',ringWins=0,escortWins=0;
let wagerInviteUntil=0;
let reflections=[],reflectCount=0,cargoDelivered=0;
let storm=null,stormRewarded=false,routeMirror=false;
let orbit=null,launch=null,whaleSafe=false,slingWins=0,whaleWins=0,laser=null,laserSlot=0;
const laserSchedule=[20,43,65];
const cargoLoad=()=>objective?.kind==='cargo'?objective.load:0;
const cargoSpeed=()=>1-cargoLoad()*.08;
const cargoValue=n=>n*70+n*(n-1)*25;
const adventureSchedule=[{at:6,kind:'rings',duration:10},{at:18,kind:'cargo',duration:12},{at:33,kind:'sling',duration:12},{at:47,kind:'escort',duration:12},{at:62,kind:'whale',duration:12},{at:76,kind:'cargo',duration:12}];
const routeSchedule=[24,54];
const sectors={
 port:{name:'货运港',kind:'cargo',note:'交齐三箱补护甲',color:'#a6efdc'},
 relic:{name:'引力遗迹',kind:'sling',note:'弹射连环 · 星光 ×1.4',color:'#d3b6ff'},
 whale:{name:'星鲸迁徙带',kind:'whale',note:'尾流护航穿激光',color:'#9cdeff'},
 mine:{name:'陨石矿场',kind:'mining',note:'开采矿核 · 小心脉冲',color:'#ffd199'}
};
const sectorPairs=[['port','relic'],['whale','mine']];
let routePlan=[null,null],mapSignature='',oreCount=0,minesCleared=0;
const forkStage=()=>fork?.stage??(elapsed>=54?1:0);
function scheduledAdventure(spec,index){
 if(!spec)return null;
 const chapter=index===2?0:index===4?1:-1;
 if(chapter<0)return spec;
 const sector=routePlan[chapter]||sectorPairs[chapter][0];
 return {...spec,kind:sectors[sector].kind,sector,port:sector==='port'};
}
function mapHud(){
 if(activeWorld!=='classic'){worldMapHud();return}
 const stages=[elapsed<33?'planned':elapsed<45?'active':'passed',elapsed<62?'planned':elapsed<74?'active':'passed'];
 const signature=[...routePlan,...stages,objective?.sector,!!fork,state].join('|');if(signature===mapSignature)return;mapSignature=signature;
 for(const id of Object.keys(sectors))$('map-'+id).textContent=sectors[id].name;
 sectorPairs.forEach((pair,i)=>pair.forEach(id=>{const selected=routePlan[i]===id,status=selected?(objective?.sector===id?'active':stages[i]):routePlan[i]?'skipped':'pending';$('map-'+id).setAttribute('data-state',status);$('map-'+id).setAttribute('aria-current',status==='active'?'step':'false')}));
 $('routeMap').setAttribute('aria-label','本局星图：起航 → '+(routePlan[0]?sectors[routePlan[0]].name:'货运港或引力遗迹')+' → '+(routePlan[1]?sectors[routePlan[1]].name:'星鲸迁徙带或陨石矿场')+' → 星空风暴');
}


const worlds=[
 {id:'classic',name:'拾光星海',color:'#1c3046',hint:'分岔选路 · 货运、遗迹、星鲸与矿场'},
 {id:'aurora',name:'极光航道',color:'#123e41',hint:'跟随绿色缺口穿越光幕 · 加速也可穿幕'},
 {id:'warp',name:'折跃回廊',color:'#342650',hint:'加速进入蓝门 → 紫门跃出 → 按顺序收集信标'}
];
let selectedWorld='classic',activeWorld='classic',worldEvent=null,worldSlot=0,worldWins=0,worldJumps=0,worldSignature='';
try{const saved=localStorage.getItem('mooncatch-world');if(worlds.some(w=>w.id===saved))selectedWorld=activeWorld=saved}catch{}
const worldInfo=()=>worlds.find(w=>w.id===activeWorld);
const bestKey=()=>activeWorld==='classic'?'mooncatch-best-v6':'mooncatch-best-'+activeWorld+'-v13';
function loadWorldBest(){try{best=Number(localStorage.getItem(bestKey()))||0}catch{best=0}$('best').textContent=String(best).padStart(3,'0')}
function selectWorld(id){
 if(!['ready','over'].includes(state)||!worlds.some(w=>w.id===id))return;
 selectedWorld=activeWorld=id;worldEvent=null;worldSlot=worldWins=worldJumps=0;mapSignature='';
 try{localStorage.setItem('mooncatch-world',id)}catch{}loadWorldBest();hud();
}
function worldHud(){
 const sig=[state,activeWorld,worldSlot,worldWins,worldJumps,worldEvent?.index,worldEvent?.used,Math.ceil(elapsed)].join('|');if(sig===worldSignature)return;worldSignature=sig;
 for(const w of worlds){const b=$('world-'+w.id);b.disabled=!['ready','over'].includes(state);b.setAttribute('aria-pressed',String(selectedWorld===w.id))}
 $('worldHint').textContent=worldInfo().hint+(['ready','over'].includes(state)?' · 出发前可切换':' · 本局地图已锁定');
}
function worldMapHud(){
 const current=elapsed>=70?3:activeWorld==='aurora'?(worldEvent?1:0):(worldEvent?.used?2:0);
 const signature=activeWorld+'|'+current;if(mapSignature===signature)return;mapSignature=signature;
 const labels=activeWorld==='aurora'?['寻找缺口','穿越光幕','追踪极光','风暴返航']:['加速入门','折跃保护','依次寻标','风暴返航'];
 ['port','relic','whale','mine'].forEach((id,i)=>{const e=$('map-'+id);e.textContent=labels[i];e.setAttribute('data-state',i===current?'active':'planned');e.setAttribute('aria-current',i===current?'step':'false')});
 $('routeMap').setAttribute('aria-label',worldInfo().name+'：'+labels.join(' → '));
}
const auroraTimes=[10,20,32,42,54,62],warpTimes=[8,24,40,56];
function auroraGeometry(e,at){
 const travel=Math.max(0,Math.min(1,(at-e.at-2)/5));
 return {x:W*(.5+Math.sin((at-e.at)*.55+e.seed)*.19),y:-30+travel*(H+60),half:Math.max(48,W*.18)};
}
function stepWorld(dt,oldX,oldY){
 if(activeWorld==='classic')return false;
 if(elapsed>=70){worldEvent=null;return false}
 const schedule=activeWorld==='aurora'?auroraTimes:warpTimes;
 if(!worldEvent&&worldSlot<schedule.length&&elapsed>=schedule[worldSlot]){
  const at=schedule[worldSlot++];
  if(elapsed<at+(activeWorld==='aurora'?7:12))worldEvent=activeWorld==='aurora'?{at,seed:worldSlot*1.7,cleared:false}:{at,used:false,index:0,mirror:worldSlot%2===0};
 }
 const e=worldEvent;if(!e)return false;
 if(activeWorld==='aurora'){
  if(elapsed>=e.at+7){worldEvent=null;return false}
  if(elapsed<e.at+2)return false;
  const before=auroraGeometry(e,Math.max(e.at+2,elapsed-dt)),now=auroraGeometry(e,elapsed);
  // Relative swept intersection with the moving curtain, not just its final location.
  const a=oldY-before.y,b=ship.y-now.y,r=shipRadius()+7;
  if(Math.min(a,b)<=r&&Math.max(a,b)>=-r){
   const u=Math.abs(a-b)>1e-8?Math.max(0,Math.min(1,a/(a-b))):1;
   const x=oldX+(ship.x-oldX)*u,gap=before.x+(now.x-before.x)*u;
   const safe=Math.abs(x-gap)<=now.half-shipRadius();
   if(!safe&&boostTime<=0)damage();
   if((safe||boostTime>0)&&!e.cleared){e.cleared=true;worldWins++;score+=120;collectDust();adventureResult='光幕穿越 · +120 分、1 星屑'}
  }
  return false;
 }
 if(elapsed>=e.at+12){worldEvent=null;adventureResult='折跃窗口关闭 · 已获奖励保留';return false}
 const flip=x=>e.mirror?1-x:x,entry={x:W*flip(.22),y:H*.4},exit={x:W*flip(.78),y:H*.64};
 if(!e.used&&elapsed>=e.at+1.5&&boostTime>0&&segmentDistance(entry.x,entry.y,oldX,oldY,ship.x,ship.y)<28){
  e.used=true;worldJumps++;score+=40;ship.x=ship.target=clamp(exit.x);ship.y=ship.targetY=clampY(exit.y);resumeShield=Math.max(resumeShield,1.5);flight.trail=[];
  burst(ship.x,ship.y,'#d3b6ff');adventureResult='折跃完成 · +40 分，保护 1.5 秒';return true;
 }
 if(e.used){
  const points=warpBeacons(e),p=points[e.index];
  if(p&&segmentDistance(p.x*W,p.y*H,oldX,oldY,ship.x,ship.y)<24){
   e.index++;score+=60;collectDust();boostCooldown=Math.max(0,boostCooldown-.5);burst(p.x*W,p.y*H,'#d3b6ff');
   if(e.index===3){worldWins++;score+=120;worldEvent=null;adventureResult='信标链点亮 · 额外 +120 分'}
  }
 }
 return false;
}
function warpBeacons(e){return [{x:.7,y:.43},{x:.48,y:.3},{x:.28,y:.67}].map(p=>({...p,x:e.mirror?1-p.x:p.x}))}
function worldCaption(){
 if(elapsed>=70)return worldInfo().name+' · 抵达终局风暴';
 const e=worldEvent;
 if(activeWorld==='aurora')return e?(elapsed<e.at+2?'极光蓄能 · 跟随绿色缺口，或加速穿幕':`光幕穿越 ${worldWins}/6 · 绿色缺口安全`):`极光航道 · 已穿越 ${worldWins}/6 道光幕`;
 return e?(!e.used?'蓝门 → 紫门 · 加速入门折跃 · '+Math.max(0,Math.ceil(e.at+12-elapsed))+'s':`信标 ${e.index}/3 · 按编号拾取 · ${Math.max(0,Math.ceil(e.at+12-elapsed))}s`):`折跃回廊 · 已点亮 ${worldWins}/4 组信标`;
}
function drawWorld(t){
 if(activeWorld==='classic')return;
 ctx.save();ctx.textAlign='center';ctx.font='11px sans-serif';
 if(activeWorld==='aurora'){
  for(let k=0;k<3;k++){ctx.strokeStyle=['#7effd21b','#7ccaff18','#c49bff1a'][k];ctx.lineWidth=14;ctx.beginPath();for(let i=0;i<=30;i++){const x=W*i/30,y=H*(.2+k*.2)+Math.sin(i*.25+t*.25+k)*H*.09;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke()}
  const e=worldEvent;if(e){const g=auroraGeometry(e,elapsed),warning=elapsed<e.at+2,y=warning?H*.24:g.y;
   ctx.strokeStyle=warning?'#ffe1a3':'#f3a5cb';ctx.lineWidth=warning?2:12;ctx.setLineDash(warning?[7,7]:[]);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(g.x-g.half,y);ctx.moveTo(g.x+g.half,y);ctx.lineTo(W,y);ctx.stroke();ctx.setLineDash([]);
   ctx.fillStyle='#8ff5c329';ctx.fillRect(g.x-g.half,Math.max(0,y-30),g.half*2,60);ctx.fillStyle='#b6ffdc';ctx.fillText(warning?'即将扫过 · 绿色缺口安全':'安全通道',g.x,Math.max(100,y-20));
  }
 }else{
  ctx.strokeStyle='#c1a2fa18';ctx.lineWidth=2;for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse(W*.5,H*.5,W*(.12+i*.11),H*(.1+i*.1),-.4,0,Math.PI*2);ctx.stroke()}
  const e=worldEvent;if(e){
   const flip=x=>e.mirror?1-x:x;
   if(!e.used){ctx.globalAlpha=elapsed<e.at+1.5?.4:1;for(const [x,y,color,label] of [[flip(.22),.4,'#91dcff','加速入门'],[flip(.78),.64,'#d3b6ff','折跃出口']]){ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x*W,y*H,24,33,Math.sin(t)*.1,0,Math.PI*2);ctx.stroke();ctx.fillText(label,x*W,y*H+49)}
   }else{ctx.strokeStyle='#d9c1ff35';ctx.setLineDash([4,7]);ctx.beginPath();ctx.moveTo(ship.x,ship.y);for(const p of warpBeacons(e).slice(e.index))ctx.lineTo(p.x*W,p.y*H);ctx.stroke();ctx.setLineDash([]);warpBeacons(e).forEach((p,i)=>{if(i<e.index)return;ctx.globalAlpha=i===e.index?1:.25;ctx.strokeStyle='#d9c1ff';ctx.fillStyle='#e5d4ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x*W,p.y*H,22,0,Math.PI*2);ctx.stroke();ctx.fillText(String(i+1),p.x*W,p.y*H+4)});}
  }
 }
 ctx.restore();
}

const shipRadius=()=>moonPhase==='dark'?10:16;
const pickupRadius=()=>moonPhase==='dark'?16:24;
const starAttraction=()=>(activeShip==='collector'?1.2:1)*(moonPhase==='bright'?(powers.magnet===2?185:powers.magnet?130:65):(powers.magnet===2?110:powers.magnet?75:0));
const routeReward=()=>activeRoute?.id==='rich'?1.4:1;
function canSling(){if(objective?.kind!=='sling'||orbit)return false;return Math.abs(Math.hypot(ship.x-objective.cx*W,ship.y-objective.cy*H)-Math.min(W,H)*.18)<24}
function enterOrbit(){
 if(!canSling())return;
 const o=objective,x=ship.x-o.cx*W,y=ship.y-o.cy*H;
 orbit={cx:o.cx,cy:o.cy,radius:Math.hypot(x,y),angle:Math.atan2(y,x),direction:x*Math.sin(flight.angle)-y*Math.cos(flight.angle)<0?-1:1,time:0};
 if(activeWager?.id==='quiet')resolveWager(false);
 ship.target=ship.x;ship.targetY=ship.y;tone(350,.16);
}
function releaseOrbit(){
 if(!orbit)return;
 const tangent=orbit.angle+orbit.direction*Math.PI/2,speed=Math.min(W,H)*1.6;
 launch={vx:Math.cos(tangent)*speed,vy:Math.sin(tangent)*speed,left:.32};orbit=null;objective={kind:'rings',linked:true,sector:objective?.sector,deadline:elapsed+8,index:0,points:slingRingRoute(tangent)};slingWins++;score+=80;
 resumeShield=Math.max(resumeShield,.65);boostCooldown=Math.max(0,boostCooldown-1);ship.target=ship.x;ship.targetY=ship.y;
 adventureResult='引力弹射 · +80 分，沿虚线连穿星环';tone(1100,.13);
}
function stepSpecialMovement(dt){
 if(orbit){orbit.time+=dt;orbit.angle+=dt*2.6*orbit.direction;ship.x=clamp(orbit.cx*W+Math.cos(orbit.angle)*orbit.radius);ship.y=clampY(orbit.cy*H+Math.sin(orbit.angle)*orbit.radius);ship.target=ship.x;ship.targetY=ship.y;if(orbit.time>=1.3)releaseOrbit();return true}
 if(launch){const t=Math.min(dt,launch.left);ship.x=clamp(ship.x+launch.vx*t);ship.y=clampY(ship.y+launch.vy*t);ship.target=ship.x;ship.targetY=ship.y;launch.left-=dt;if(launch.left<=0)launch=null;return true}
 return false;
}
function laserSegments(g){
 const lo=g.gap-g.width/2,hi=g.gap+g.width/2;
 return g.vertical?[[W*g.at,0,W*g.at,H*lo],[W*g.at,H*hi,W*g.at,H]]:[[0,H*g.at,W*lo,H*g.at],[W*hi,H*g.at,W,H*g.at]];
}
function segmentHit(ax,ay,bx,by,cx,cy,dx,dy,r){
 const ux=bx-ax,uy=by-ay,vx=dx-cx,vy=dy-cy,det=ux*vy-uy*vx;
 if(Math.abs(det)>1e-9){const t=((cx-ax)*vy-(cy-ay)*vx)/det,u=((cx-ax)*uy-(cy-ay)*ux)/det;if(t>=0&&t<=1&&u>=0&&u<=1)return true}
 return Math.min(segmentDistance(ax,ay,cx,cy,dx,dy),segmentDistance(bx,by,cx,cy,dx,dy),segmentDistance(cx,cy,ax,ay,bx,by),segmentDistance(dx,dy,ax,ay,bx,by))<=r;
}
function stepLaser(dt,oldX,oldY,protectedByBoost){
 if(!laser&&laserSlot<laserSchedule.length&&elapsed>=laserSchedule[laserSlot]){
  const at=laserSchedule[laserSlot++];if(elapsed<at+3&&objective?.kind!=='mining'&&!(at===65&&routePlan[1]==='mine')){
   const withWhale=objective?.kind==='whale';
   laser={vertical:withWhale||laserSlot%2===0,at:withWhale?.5:.56,gap:withWhale?.39:.3+Math.random()*.4,width:.38,warningEnd:elapsed+1.8,end:elapsed+3};
  }
 }
 if(!laser)return;
 if(elapsed>=laser.end){laser=null;return}
 if(elapsed<laser.warningEnd||protectedByBoost)return;
 if(elapsed-dt<laser.warningEnd){oldX=ship.x;oldY=ship.y}
 if(laserSegments(laser).some(s=>segmentHit(oldX,oldY,ship.x,ship.y,...s,shipRadius()+4)))damage();
}
function drawSpecialSpace(t){
 ctx.save();ctx.textAlign='center';ctx.font='11px sans-serif';
 if(objective?.kind==='sling'){
  const o=objective,x=o.cx*W,y=o.cy*H,r=Math.min(W,H)*.18;ctx.strokeStyle='#c8a4ff';ctx.lineWidth=2;ctx.setLineDash([5,7]);ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#4e3c6c';ctx.beginPath();ctx.arc(x,y,18,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ddc5ff';ctx.fillText('引力',x,y+4);
  if(orbit){const a=orbit.angle+orbit.direction*Math.PI/2;ctx.strokeStyle='#e9d8ff';ctx.beginPath();ctx.moveTo(ship.x,ship.y);ctx.lineTo(ship.x+Math.cos(a)*70,ship.y+Math.sin(a)*70);ctx.stroke()}
 }
 if(objective?.kind==='whale'){
  const o=objective;ctx.strokeStyle='#99e9ff30';ctx.lineWidth=Math.max(48,Math.min(W,H)*.17);ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();o.trail.forEach((p,i)=>i?ctx.lineTo(p.x*W,p.y*H):ctx.moveTo(p.x*W,p.y*H));ctx.stroke();
  ctx.translate(o.x*W,o.y*H);ctx.scale(o.mirror?-1:1,1);ctx.fillStyle='#7db9d5';ctx.beginPath();ctx.ellipse(0,0,33,16,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(-25,0);ctx.lineTo(-46,-17);ctx.lineTo(-40,0);ctx.lineTo(-46,17);ctx.closePath();ctx.fill();ctx.fillStyle='#c6ebf1';ctx.beginPath();ctx.ellipse(6,6,21,7,0,0,Math.PI);ctx.fill();ctx.fillStyle='#122e48';ctx.beginPath();ctx.arc(20,-3,2,0,7);ctx.fill();
 }
 ctx.restore();
 if(laser){ctx.save();const active=elapsed>=laser.warningEnd;ctx.strokeStyle=active?'#ff9188':'#ffbba16a';ctx.lineWidth=active?7:2;ctx.setLineDash(active?[]:[7,8]);for(const s of laserSegments(laser)){ctx.beginPath();ctx.moveTo(s[0],s[1]);ctx.lineTo(s[2],s[3]);ctx.stroke()}ctx.setLineDash([]);ctx.strokeStyle='#a6efdc';ctx.lineWidth=2;const g=laser,lo=g.gap-g.width/2,hi=g.gap+g.width/2;ctx.beginPath();if(g.vertical){ctx.moveTo(W*g.at,H*lo);ctx.lineTo(W*g.at,H*hi)}else{ctx.moveTo(W*lo,H*g.at);ctx.lineTo(W*hi,H*g.at)}ctx.stroke();ctx.restore()}
 if(orbit||whaleSafe){ctx.save();ctx.strokeStyle=orbit?'#d0a7ff':'#9feaff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(ship.x,ship.y,27,0,7);ctx.stroke();ctx.restore()}
}

function canUpgrade(){return (bonusCredits>0||(upgradeCount<upgradeAt.length&&dust>=upgradeAt[upgradeCount]))&&availablePowers().filter(p=>(powers[p.id]||0)<2).length>=2}
function resetAdventure(){routePlan=[null,null];mapSignature='';oreCount=minesCleared=0;storm=null;stormRewarded=false;routeMirror=Math.random()<.5;orbit=launch=laser=null;whaleSafe=false;slingWins=whaleWins=laserSlot=0;reflections=[];reflectCount=cargoDelivered=0;adventureSignature='';moonPhase='bright';moonCooldown=0;objective=fork=activeRoute=null;adventureSlot=routeSlot=ringWins=escortWins=0;adventureResult='追逐星环、护送月灵 · 都可自由略过';wagerInviteUntil=0}
function switchMoon(refocus=true){if(state!=='playing'||panelOpen||moonCooldown>0)return;moonPhase=moonPhase==='bright'?'dark':'bright';moonCooldown=.35;tone(moonPhase==='bright'?780:420,.08);hud();if(refocus)focusGame()}

const upgradeAt=[3,8,15,24];
const powersList=[
 {id:'satellite',owner:'collector',name:'双生卫星',description:['两颗卫星绕船运行，代收星光与星屑。','升级为三颗卫星，轨道扩大，拾取范围更广。']},
 {id:'wake',owner:'falcon',name:'引力尾迹',description:['加速留下 1.8 秒引力尾迹，吸引并收集附近星光与星屑。','尾迹持续 3.2 秒，吸引范围扩大。']},
 {id:'split',owner:'warden',name:'反射分裂',description:['精准反射产生三束扇形弹体，可碎星、破壳。','反射升级为五束，覆盖更宽的扇面。']},
 {id:'magnet',name:'磁力月舟',description:['明月吸星范围 130，暗月 75；同时增强星屑吸引。','明月吸星范围扩大到 185，暗月 110；星屑吸引更远。']},
 {id:'echo',name:'加速分身',description:['加速出发点留下分身，代接星光与星屑 2 秒。','分身持续 4 秒，守住错过的星光。']},
 {id:'chain',name:'碎星连爆',description:['击碎陨石时，连锁击碎 85 像素内的陨石。','连爆范围扩大到 125 像素。']},
 {id:'capacitor',name:'星能回充',description:['每颗青色星屑使加速冷却缩短 0.25 秒。','每颗星屑缩短 0.45 秒冷却。']},
 {id:'aegis',name:'月辉护甲',description:['获得 1 层额外护甲，抵挡伤害并保住连击。','再获得 2 层护甲，抵挡伤害并保住连击。']},
 {id:'streak',name:'连击保险',description:['每次加速可容错漏接 2 颗星光，保住连击。','每次加速可容错漏接 4 颗星光。']}
];
const synergyList=[
 {id:'gravity',needs:['magnet','echo'],name:'引力双生',description:'分身也能吸引周围星光与星屑。'},
 {id:'nova',needs:['aegis','chain'],name:'破盾星环',description:'护甲挡伤时，击碎附近普通陨石并产生星屑。'},
 {id:'flow',needs:['capacitor','streak'],name:'星流续航',description:'每接 5 颗星光，缩短加速冷却并补充 1 次连击容错。'}
];
const wagerSchedule=[18,46];
const wagerTypes=[
 {id:'quiet',name:'静默航行',description:'接下来 10 秒不开启加速。遇险仍可加速，但挑战会失败。'},
 {id:'safe',name:'完好航行',description:'接下来 10 秒不损失基础护盾。额外护甲挡伤不算失败。'},
 {id:'stars',name:'追光挑战',description:'10 秒内接住 8 颗金色星光，分身拾取也计入。'}
];
let wagerSlot=0,wagerOffers=[],activeWager=null,wagersWon=0,wagersFailed=0,wagerResult='',bonusCredits=0,bonusUpgradeCount=0,upgradeSource='dust',flowProgress=0;
const hasSynergy=id=>synergyList.find(s=>s.id===id).needs.every(p=>powers[p]>0);
function synergyHint(id){
 const recipe=synergyList.find(s=>s.needs.includes(id));
 if(!recipe)return hull().name+'专属 · '+hull().detail;
 const other=recipe.needs.find(p=>p!==id),otherName=powersList.find(p=>p.id===other).name;
 return powers[other]>0?`合成「${recipe.name}」：${recipe.description}`:`搭配${otherName} → ${recipe.name}`;
}
const emptyPowers=()=>Object.fromEntries(powersList.map(p=>[p.id,0]));
let inputMode='keyboard',mouseX=null,mouseY=null,hudSignature='',guard=0,grace=0,boostSerial=0,perfectWindow=0,perfectReady=false,perfectCount=0,slowTime=0,boss=null,bossStarted=false;
let dust=0,upgradeCount=0,powers=emptyPowers(),offers=[],shards=[],echoes=[],rings=[];
let touches=new Map(),movePointer=null,lastTouchX=0,lastTouchY=0,leftHand=false;
let controlMode='drag',directionPointers=new Map(),stickPointer=null,stickOrigin=null,stickVector={x:0,y:0};
let panelOpen=false,panelResume=false,panelTrigger=null,focusMode=false,nativeScreen=false,fullscreenBusy=false,controlHudSignature='';
const directions={ul:[-1,-1],u:[0,-1],ur:[1,-1],l:[-1,0],r:[1,0],dl:[-1,1],d:[0,1],dr:[1,1]};
try{const saved=localStorage.getItem('mooncatch-controls');if(['drag','stick','dpad'].includes(saved))controlMode=saved}catch{}
try{leftHand=localStorage.getItem('mooncatch-left-hand')==='true'}catch{}
function focusGame(){canvas.focus({preventScroll:true})}
function clearInput(){
 clearVirtualInput();
 const held=[...touches];touches.clear();movePointer=null;lastTouchX=lastTouchY=0;
 keys.clear();ship.target=ship.x;ship.targetY=ship.y;inputMode='keyboard';mouseX=mouseY=null;flight.throttle=0;flight.trail=[];
 $('touchPad').setAttribute('data-active','false');
 // Release before menus take focus; stale moves from a held finger cannot steer after resume.
 for(const [id,p] of held){try{p.surface?.releasePointerCapture?.(id)}catch{}}
}
function applyHand(){document.querySelector('.game').classList.toggle('controls-left',leftHand);$('touchControls').classList.toggle('controls-left',leftHand);$('hand').textContent='加速键：'+(leftHand?'左侧':'右侧')+' ⇄';$('hand').setAttribute('aria-pressed',String(leftHand))}

try{best=Number(localStorage.getItem(bestKey()))||0}catch{}
$('best').textContent=String(best).padStart(3,'0');
const stars=Array.from({length:75},()=>({x:Math.random(),y:Math.random(),r:Math.random()*1.4+.3,p:Math.random()*6}));
const shipY=()=>ship.y;
const clamp=x=>Math.max(24,Math.min(W-24,x));
const clampY=y=>Math.max(28,Math.min(H-28,y));
const moveKeys=['arrowleft','arrowright','arrowup','arrowdown','a','d','w','s'];
function difficulty(t=elapsed){
 const p=Math.max(0,Math.min(1,t/90));
 const speedScale=activeRoute?.id==='calm'?.9:activeRoute?.id==='rich'?1.05:1;
 const intervalScale=activeRoute?.id==='calm'?1.25:activeRoute?.id==='rich'?.9:1;
 return {speed:Math.min(W,H)*(.24+.32*p)*speedScale,interval:(2.1-p)*intervalScale,warning:1.65-.4*p,count:1+(p>=2/3?1:0),level:1+Math.min(5,Math.floor(p*6))};
}
function segmentDistance(px,py,ax,ay,bx,by){
 const dx=bx-ax,dy=by-ay,d=dx*dx+dy*dy;
 const t=d?Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/d)):0;
 return Math.hypot(px-ax-t*dx,py-ay-t*dy);
}
function touchesPath(o,oldX,oldY,radius){
 return segmentDistance(0,0,oldX-(o.prevX??o.x),oldY-(o.prevY??o.y),ship.x-o.x,ship.y-o.y)<=radius;
}
function eventPoint(e){const rect=canvas.getBoundingClientRect();return {x:e.clientX-rect.left,y:e.clientY===undefined?ship.y:e.clientY-(rect.top||0)}}

function resize(){
 const b=canvas.getBoundingClientRect(),ow=W,oh=H,d=Math.min(devicePixelRatio||1,2);
 if(b.width<=0||b.height<=0)return;
 const pixelsX=Math.round(b.width*d),pixelsY=Math.round(b.height*d);
 if(b.width===W&&b.height===H&&canvas.width===pixelsX&&canvas.height===pixelsY)return;
 W=b.width;H=b.height;canvas.width=pixelsX;canvas.height=pixelsY;ctx.setTransform(d,0,0,d,0,0);
 ship.x=clamp(ship.x*W/ow);ship.target=clamp(ship.target*W/ow);ship.y=clampY(ship.y*H/oh);ship.targetY=clampY(ship.targetY*H/oh);
 for(const o of items){o.x*=W/ow;o.y*=H/oh;if(Number.isFinite(o.v))o.v*=H/oh}
 for(const s of shards){s.x*=W/ow;s.y*=H/oh}
 for(const e of echoes){e.x*=W/ow;e.y*=H/oh}
 for(const r of rings){r.x*=W/ow;r.y*=H/oh}
 for(const r of reflections){r.x*=W/ow;r.y*=H/oh}
 for(const p of skillWake){p.x*=W/ow;p.y*=H/oh;p.x2*=W/ow;p.y2*=H/oh}
 if(boss){boss.x*=W/ow;boss.y*=H/oh}
 if(storm?.event)storm.event.radius*=Math.hypot(W,H)/Math.hypot(ow,oh);
 if(orbit){const cx=orbit.cx*W,cy=orbit.cy*H;orbit.radius=Math.hypot(ship.x-cx,ship.y-cy);orbit.angle=Math.atan2(ship.y-cy,ship.x-cx)}
 if(launch){launch.vx*=W/ow;launch.vy*=H/oh}
 if(objective?.kind==='escort'){objective.x*=W/ow;objective.y*=H/oh}
 if(objective?.kind==='mining')for(const o of [...objective.ores,...objective.mines]){o.x*=W/ow;o.y*=H/oh}
 // Event text and browser chrome can resize the arena while a finger stays down.
 // Preserve driver state and pointer capture; only explicit pause/menu transitions release them.
 for(const p of flight.trail){p.x*=W/ow;p.y*=H/oh;p.x2*=W/ow;p.y2*=H/oh}
}
new ResizeObserver(resize).observe(canvas);
function tone(f=600,d=.09){if(!sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(f,audio.currentTime);g.gain.setValueAtTime(.045,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+d)}catch{}}
function hud(){
 const controlSignature=state+'|'+panelOpen;
 if(controlSignature!==controlHudSignature){
  controlHudSignature=controlSignature;
  $('pause').disabled=panelOpen||!['playing','paused'].includes(state);$('pause').textContent=state==='paused'?'继续':'暂停';
  $('touchControls').setAttribute('aria-disabled',String(state!=='playing'||panelOpen));
  for(const id of Object.keys(directions))$('dir-'+id).disabled=state!=='playing'||panelOpen;
 }
 fleetHud();worldHud();mapHud();adventureHud();
 const signature=[score,Math.ceil(time),hp,guard,combo,phase,state,Math.ceil(boostCooldown*10),boostTime>0,dust,upgradeCount,...powersList.map(p=>powers[p.id]||0),announcementTime>0,boss?.hp,boss?.warning>0,storm?.event?.kind,storm?.event&&elapsed<storm.event.fire,activeWager?.id,Math.ceil(activeWager?.remaining||0),activeWager?.progress,wagerResult,bonusCredits,bonusUpgradeCount,difficulty().level,Math.ceil(resumeShield*10),!!orbit,canSling()].join('|');
 if(signature===hudSignature)return;hudSignature=signature;
 $('skillTip').textContent=`${hull().name} · 加速 ${boostDuration()} 秒 / 冷却 ${boostLimit()} 秒 · ${hull().trait}`;
 for(const id of ['boost','padBoost'])$(id).setAttribute('aria-label',`加速：${boostDuration()} 秒护盾与双倍移速，鼠标保持跟随`);
 $('score').textContent=String(score).padStart(3,'0');$('time').innerHTML=Math.ceil(time)+'<span>s</span>';
 $('health').textContent='● '.repeat(hp)+'○ '.repeat(3-hp)+(guard?` +◇${guard}`:'');$('health').setAttribute('aria-label',hp+'点护盾，'+guard+'层护甲');
 $('combo').textContent=combo>=5?`${combo} 连击 · 星光 ×${Math.min(3,1+Math.floor(combo/5))*phases[phase].multiplier}`:'';
 $('pressure').textContent=resumeShield>0?`恢复保护 ${resumeShield.toFixed(1)}s · 可安全调整位置`:`威胁 Lv.${difficulty().level} · 四面来袭`;
 $('boost').disabled=state!=='playing'||(boostCooldown>0&&!orbit&&!canSling());
 $('padBoost').disabled=$('boost').disabled;
 $('padBoost').setAttribute('data-active',String(boostTime>0));
 $('touchPad').setAttribute('aria-disabled',String(state!=='playing'));
 $('padHint').textContent=state==='playing'?'任意落指 · 滑动驾驶 · 抬手停':state==='ready'?'出发后，在这里滑动驾驶':state==='over'?'本次航行已结束 · 等待再出发':'游戏已暂停 · 继续后重新落指';
 $('boost').setAttribute('data-active',String(boostTime>0));
 $('boostLabel').textContent=orbit?'弹射':canSling()?'入轨':boostTime>0?'加速中':boostCooldown>0?`${boostCooldown.toFixed(1)}s`:'加速';
 $('padBoostLabel').textContent=$('boostLabel').textContent;
 $('padCharge').style.transform=`scaleX(${1-boostCooldown/boostLimit()})`;
 $('dustMeter').textContent=upgradeCount<upgradeAt.length?`✧ 星屑 ${dust} / ${upgradeAt[upgradeCount]}`:`✧ 星屑 ${dust} · 星座已满`;
 $('powers').textContent=powersList.filter(p=>powers[p.id]).map(p=>`${p.name} ${powers[p.id]===2?'Ⅱ':'Ⅰ'}`).join(' · ')||'击碎陨石，点亮你的星座';
 const activeSynergies=synergyList.filter(s=>s.needs.every(p=>powers[p]>0));
 $('synergyBar').textContent=activeSynergies.length?'✧ 已合成：'+activeSynergies.map(s=>s.name).join(' · '):'技能两两搭配，可自动激活星座合成';
 $('wagerStatus').textContent=activeWager?`赌约 · ${activeWager.name} · ${Math.ceil(activeWager.remaining)}s${activeWager.id==='stars'?` · 星光 ${activeWager.progress}/8`:''}`:wagerResult||'赌约到来时可主动查看，忽略即可继续飞行';
 $('wagerStatus').setAttribute('data-active',String(!!activeWager));
 $('charge').style.transform=`scaleX(${1-boostCooldown/boostLimit()})`;
 for(let i=0;i<3;i++)$('phase'+i).className=i===phase?'active':i<phase?'done':'';
 $('announcement').style.opacity=announcementTime>0&&state!=='menuIntro'?'1':'0';
 $('bossStatus').hidden=!boss||boss.hp<=0;
 if(boss&&boss.hp>0)$('bossStatus').textContent=stormCaption();

}
function announce(text){$('announcement').textContent=text;announcementTime=2.4}
function setPhase(n){phase=n;announce(`${phases[n].name}${n===2?' · 得分 ×2':''}`);$('status').textContent=phases[n].subtitle;tone(440+n*170,.2)}
function start(){
 if(panelOpen)closePanel(false);
 activeShip=selectedShip;skillWake=[];activeWorld=selectedWorld;worldEvent=null;worldSlot=worldWins=worldJumps=0;loadWorldBest();
 resetAdventure();menuIntro=null;resumeShield=0;resumeSafetyPending=false;$('menuCue').hidden=true;
 state='playing';score=combo=elapsed=spawn=invincible=boostTime=boostCooldown=wave=0;hp=3;time=90;hazardClock=4;hazardWave=0;
 items=[];particles=[];pending=[];warnings=[];shards=[];echoes=[];rings=[];offers=[];dust=upgradeCount=0;powers=emptyPowers();guard=grace=boostSerial=perfectWindow=perfectCount=slowTime=0;perfectReady=false;boss=null;bossStarted=false;hudSignature='';$('upgrade').hidden=true;$('wager').hidden=true;wagerSlot=wagersWon=wagersFailed=bonusCredits=bonusUpgradeCount=flowProgress=0;wagerOffers=[];activeWager=null;wagerResult='';upgradeSource='dust';clearInput();ship={x:W/2,y:H*.68,target:W/2,targetY:H*.68,direction:1};flight=newFlight();
 if(activeWorld!=='classic'){adventureSlot=adventureSchedule.length;routeSlot=routeSchedule.length;laserSlot=laserSchedule.length;adventureResult=worldInfo().hint}
 if(activeShip==='warden')guard=1;
 $('overlay').hidden=true;$('pause').disabled=false;$('pause').innerHTML='暂停 <kbd>P</kbd>';setPhase(0);hud();focusGame();
}
function show(title,message,button){$('title').textContent=title;$('message').textContent=message;$('start').textContent=button;$('overlay').hidden=false;$('start').focus({preventScroll:true})}
function pause(){
 if(state==='playing'){state='paused';clearInput();$('tag').textContent='TAKE A LITTLE BREATH';show('让宇宙等一会儿。','已暂停。加速充能和预警也会等你回来。','继续旅程 →');$('pause').textContent='继续';$('status').textContent='已暂停'}
 else if(state==='paused'){clearInput();if(resumeSafetyPending){resumeShield=Math.max(resumeShield,1.5);resumeSafetyPending=false}state='playing';$('overlay').hidden=true;$('pause').innerHTML='暂停 <kbd>P</kbd>';$('status').textContent=phases[phase].subtitle;focusGame()}
 hud();
}
function finish(){
 if(state==='over')return;
 if(hp>0&&elapsed>=90&&bossStarted&&boss?.hp>0&&!stormRewarded){score+=200;stormRewarded=true}
 state='over';wagerInviteUntil=0;clearInput();activeWager=null;$('wager').hidden=true;const record=score>best;if(record){best=score;try{localStorage.setItem(bestKey(),String(best))}catch{}$('best').textContent=String(best).padStart(3,'0')}
 $('pause').disabled=true;$('tag').textContent=record?'A NEW PERSONAL RECORD':'EVERY LITTLE LIGHT COUNTS';
 show(hp?'满载星光，返航。':'月舟需要休息了。',`本次 ${score} 分${stormRewarded?" · 风暴生还 +200":""} · 抵达「${phases[phase].name}」${record?' · 新纪录！':' · 本版最佳 '+best+' 分。'}`,'再出发一次 →');
 const itinerary=activeWorld==='classic'?`航线：${routePlan.filter(Boolean).map(id=>sectors[id].name).join(' → ')||'起航星海'} · 矿核 ${oreCount}/3 · 排雷 ${minesCleared} · 弹射 ${slingWins} 次 · 追鲸 ${whaleWins} 次 · 交货 ${cargoDelivered} 件`:`${worldInfo().name} · ${activeWorld==='aurora'?`穿越光幕 ${worldWins}/6`:`信标链 ${worldWins}/4 · 折跃 ${worldJumps} 次`}`;
 $('hint').textContent=`${itinerary} · 反射 ${reflectCount} 次 · 收集 ${dust} 颗星屑 · 强化 ${upgradeCount+bonusUpgradeCount} 次 · 赌约 ${wagersWon} 胜${boss?.hp===0?' · 巨陨已击破':''}`;$('status').textContent=hp?'90 秒旅程完成':'护盾耗尽 · 再试一次';hud();tone(hp?660:180,.25);
}
function boost(){
 if(state!=='playing')return;
 if(orbit){releaseOrbit();hud();return}
 if(canSling()){enterOrbit();hud();return}
 if(boostCooldown>0)return;
 if(activeWager?.id==='quiet')resolveWager(false);
 if(powers.echo)echoes.push({x:ship.x,y:ship.y,angle:flight.angle,life:powers.echo===2?4:2});
 boostSerial++;perfectWindow=activeShip==='warden'?.26:.18;perfectReady=true;if(powers.streak)grace=powers.streak===2?4:2;
 boostTime=boostDuration();boostCooldown=boostLimit();burst(ship.x,shipY(),'#a6d9c9');tone(850,.16);hud();
}
for(const w of worlds)$('world-'+w.id).onclick=()=>selectWorld(w.id);
for(const f of fleet)$('ship-'+f.id).onclick=()=>selectShip(f.id);
$('start').onclick=()=>state==='paused'?pause():start();$('pause').onclick=pause;$('restart').onclick=start;$('boost').onclick=()=>{boost()};
for(const id of ['boost','padBoost']){
 $(id).onclick=e=>{if(!e||e.detail===0)boost()};
 $(id).addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();boost()});
}
$('helpOpen').onclick=()=>openPanel('rules');$('controlsOpen').onclick=()=>openPanel('controls');$('panelClose').onclick=()=>closePanel();$('fullscreen').onclick=toggleFullscreen;
for(const mode of ['drag','stick','dpad'])$('mode-'+mode).onclick=()=>selectControlMode(mode);
$('hand').onclick=()=>{clearInput();leftHand=!leftHand;applyHand();try{localStorage.setItem('mooncatch-left-hand',String(leftHand))}catch{}};
// A second touch may not synthesize a click while the driving finger stays down.
// Act on contact without moving focus; keep keyboard activation and suppress the later pointer click.
for(const id of ['moonToggle','padMoon']){
 $(id).addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();switchMoon(false)});
 $(id).onclick=e=>{if(!e||e.detail===0)switchMoon()};
}
$('upgradeReady').onclick=()=>{if(state==='playing'&&canUpgrade())offerUpgrade(true)};
$('wagerReady').onclick=()=>{if(state==='playing'&&wagerInviteUntil>elapsed)maybeOfferWager(true)};
$('choice0').onclick=()=>chooseUpgrade(0);$('choice1').onclick=()=>chooseUpgrade(1);
$('wager0').onclick=()=>chooseWager(0);$('wager1').onclick=()=>chooseWager(1);$('wagerSkip').onclick=skipWager;
$('sound').onclick=()=>{sound=!sound;$('sound').textContent='音效：'+(sound?'开':'关');$('sound').setAttribute('aria-pressed',String(sound));tone();if(state==='playing')focusGame()};
window.addEventListener('keydown',e=>{
 if(e.ctrlKey||e.metaKey||e.altKey||e.isComposing||e.target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
 const k=e.key.toLowerCase();
 if(panelOpen){
  if(k==='escape'){e.preventDefault();closePanel()}
  else if(k==='tab'){
   const buttons=[...$('gamePanel').querySelectorAll('button:not([disabled]),summary')].filter(b=>!b.closest('[hidden]'));
   const first=buttons[0],last=buttons[buttons.length-1];
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
  }
  return;
 }
 if(k==='escape'&&focusMode&&!document.fullscreenElement){e.preventDefault();toggleFullscreen();return}
 if(state==='wager'){if(!e.repeat){if(k==='1'||k==='2'){e.preventDefault();chooseWager(Number(k)-1)}else if(k==='escape'){e.preventDefault();skipWager()}}return}
 if(state==='upgrade'){if((k==='1'||k==='2')&&!e.repeat){e.preventDefault();chooseUpgrade(Number(k)-1)}return}
 if(state==='playing'&&(k==='e'||k==='r')){e.preventDefault();if(!e.repeat)$(k==='e'?'upgradeReady':'wagerReady').onclick();return}
 if(k==='q'){e.preventDefault();if(!e.repeat)switchMoon();return}
 if(k==='p'){e.preventDefault();if(!e.repeat)pause();return}
 if(e.target.tagName==='BUTTON'||e.target.tagName==='A')return;
 if(moveKeys.includes(k)||k===' '){e.preventDefault();if(k===' '){if(!e.repeat)boost()}else{launch=null;inputMode='keyboard';mouseX=mouseY=null;keys.add(k)}}
});
window.addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys.delete(k);if(moveKeys.includes(k)){ship.target=ship.x;ship.targetY=ship.y}});
window.addEventListener('blur',()=>{clearInput();if(state==='playing')pause()});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause()});
function pointer(e){
 if(state!=='playing'||panelOpen)return;
 clearVirtualInput();
 launch=null;
 // Mouse coordinates are absolute. Boost/cargo gain belongs only to relative touch input.
 const p=eventPoint(e);
 ship.target=clamp(p.x);ship.targetY=clampY(p.y);
 mouseX=p.x;mouseY=p.y;inputMode='pointer';
}
function touchDown(e){
 if(state!=='playing'||panelOpen)return;
 const surface=e.currentTarget||canvas,isPad=surface===$('touchPad');
 if((isPad||e.pointerType==='touch')&&controlMode!=='drag')return;
 if(e.pointerType!=='touch'&&!isPad){pointer(e);canvas.setPointerCapture(e.pointerId);return}
 e.preventDefault();const p={x:e.clientX,y:e.clientY??0,surface};touches.set(e.pointerId,p);surface.setPointerCapture(e.pointerId);
 if(isPad)$('touchPad').setAttribute('data-active','true');
 if(movePointer===null){inputMode='pointer';mouseX=mouseY=null;movePointer=e.pointerId;lastTouchX=p.x;lastTouchY=p.y;ship.target=ship.x;ship.targetY=ship.y}
 else boost();
}
function touchMove(e){
 if(state!=='playing'||panelOpen)return;
 const surface=e.currentTarget||canvas,isPad=surface===$('touchPad');
 if((isPad||e.pointerType==='touch')&&controlMode!=='drag')return;
 if(e.pointerType!=='touch'&&!isPad){if(e.pointerType==='mouse'||e.buttons)pointer(e);return}
 if(!touches.has(e.pointerId))return;
 e.preventDefault();const p={x:e.clientX,y:e.clientY??0,surface};touches.set(e.pointerId,p);if(e.pointerId!==movePointer)return;
 inputMode='pointer';mouseX=mouseY=null;launch=null;
 const dx=p.x-lastTouchX,dy=p.y-lastTouchY,gain=(boostTime>0?BOOST_SPEED:1)*(isPad?1.65:1)*cargoSpeed();lastTouchX=p.x;lastTouchY=p.y;
 ship.target=clamp(ship.target+dx*gain);ship.targetY=clampY(ship.targetY+dy*gain);
}
function touchEnd(e){
 touches.delete(e.pointerId);
 $('touchPad').setAttribute('data-active',String([...touches.values()].some(p=>p.surface===$('touchPad'))));
 if(movePointer===e.pointerId){const next=touches.entries().next();movePointer=next.done?null:next.value[0];if(!next.done){lastTouchX=next.value[1].x;lastTouchY=next.value[1].y}}
}
for(const surface of [canvas,$('touchPad')]){
 surface.addEventListener('pointerdown',touchDown);
 surface.addEventListener('pointermove',touchMove);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])surface.addEventListener(type,touchEnd);
}
function beginMenuIntro(kind){
 menuIntro={kind,remaining:.8};state='menuIntro';clearInput();
 $('menuCue').textContent=kind==='upgrade'?'星座即将点亮 · 准备选择':'星空赌约即将开启';
 $('menuCue').hidden=false;$('pause').disabled=true;hud();
}
function offerUpgrade(defer=false){
 if(state!=='playing')return;
 const bonus=bonusCredits>0;
 if(!bonus&&(upgradeCount>=upgradeAt.length||dust<upgradeAt[upgradeCount]))return;
 const candidates=availablePowers().filter(p=>(powers[p.id]||0)<2);
 if(candidates.length<2)return;
 if(defer){if(resumeShield<=0)beginMenuIntro('upgrade');return}
 state='upgrade';upgradeSource=bonus?'wager':'dust';clearInput();
 for(let i=candidates.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]]}
 const signaturePower=candidates.find(p=>p.id===hull().skill);
 offers=signaturePower?[signaturePower,...candidates.filter(p=>p!==signaturePower).slice(0,1)]:candidates.slice(0,2);
 $('upgradeHint').textContent=bonus?'赌约奖励 · 额外强化，不占星屑升级次数':`第 ${upgradeCount+1} / ${upgradeAt.length} 次星屑强化 · 时间已暂停`;
 offers.forEach((p,i)=>{$('choice'+i).innerHTML=`<em>${i+1} · ${powers[p.id]?'进阶强化':'获得能力'}</em><strong>${p.name} ${powers[p.id]?'Ⅱ':'Ⅰ'}</strong><span>${p.description[powers[p.id]||0]}</span><small class="synergy-hint">${synergyHint(p.id)}</small>`});
 $('upgrade').hidden=false;$('pause').disabled=true;$('choice0').focus({preventScroll:true});hud();
}

function chooseUpgrade(i){
 if(state!=='upgrade'||!offers[i])return;
 const previous=synergyList.filter(s=>s.needs.every(p=>powers[p]>0)).map(s=>s.id);
 const power=offers[i];powers[power.id]=(powers[power.id]||0)+1;
 if(upgradeSource==='wager'){bonusCredits--;bonusUpgradeCount++}else upgradeCount++;
 const unlocked=synergyList.filter(s=>!previous.includes(s.id)&&s.needs.every(p=>powers[p]>0));
 if(power.id==='aegis')guard+=powers.aegis===2?2:1;
 if(power.id==='streak')grace=powers.streak===2?4:2;offers=[];$('upgrade').hidden=true;
 // Resume through an explicit button, avoiding movement when returning from a hidden tab.
 state='paused';resumeSafetyPending=true;$('pause').disabled=false;clearInput();
 show('星座已点亮',`${power.name}已生效。${unlocked.length?"合成「"+unlocked.map(s=>s.name).join("、")+"」！":""}继续后有 1.5 秒无敌保护，可重新落指调整位置。`,'继续旅程 →');
 $('tag').textContent='CONSTELLATION AWAKENED';$('pause').textContent='继续';$('status').textContent='强化已获得 · 等待继续';hud();
}
function maybeOfferWager(defer=false){
 if(state!=='playing'||activeWager||wagerSlot>=wagerSchedule.length)return;
 if(elapsed>65){wagerSlot=wagerSchedule.length;return}
 if(elapsed<wagerSchedule[wagerSlot])return;
 if(defer){if(resumeShield<=0)beginMenuIntro('wager');return}
 wagerInviteUntil=0;wagerSlot++;state='wager';clearInput();
 const pool=[...wagerTypes];for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
 wagerOffers=pool.slice(0,2);
 wagerOffers.forEach((w,i)=>{$('wager'+i).innerHTML=`<em>${i+1} · 10 秒挑战</em><strong>${w.name}</strong><span>${w.description}</span>`});
 $('wager').hidden=false;$('pause').disabled=true;$('wager0').focus({preventScroll:true});hud();
}
function resumeWagerMenu(){
 wagerOffers=[];$('wager').hidden=true;$('pause').disabled=false;clearInput();state='paused';resumeSafetyPending=true;
 $('tag').textContent='READY WHEN YOU ARE';
 show(activeWager?'赌约已接下':'继续自由航行',`${activeWager?activeWager.name+'。':''}准备好再继续，恢复后有 1.5 秒无敌保护。`,'继续旅程 →');
 $('pause').textContent='继续';$('status').textContent='准备好后继续 · 恢复保护 1.5s';hud();
}
function chooseWager(i){
 if(state!=='wager'||!wagerOffers[i])return;
 activeWager={...wagerOffers[i],remaining:10,deadline:elapsed+10,progress:0};wagerResult='';resumeWagerMenu();
}
function skipWager(){if(state!=='wager')return;wagerResult='已跳过赌约 · 自由拾光';resumeWagerMenu()}
function resolveWager(won){
 if(!activeWager)return;
 const name=activeWager.name;activeWager=null;
 if(won){wagersWon++;bonusCredits++;wagerResult=`${name}达成 · 获得额外强化`;announce('赌约达成 · 额外强化！');tone(1100,.18)}
 else{wagersFailed++;wagerResult=`${name}未达成 · 已有奖励保留`;announce('赌约未达成 · 继续旅程')}
}
function tickWager(){
 if(!activeWager)return;
 activeWager.remaining=Math.max(0,activeWager.deadline-elapsed);
 if(activeWager.remaining<=0)resolveWager(activeWager.id!=='stars'||activeWager.progress>=8);
}
function collectStar(o){
 combo++;score+=Math.round(10*Math.min(3,1+Math.floor(combo/5))*phases[phase].multiplier*routeReward());
 burst(o.x,o.y,'#f3d694');tone(520+Math.min(combo,12)*35);
 if(activeWager?.id==='stars'){activeWager.progress++;if(activeWager.progress>=8)resolveWager(true)}
 if(hasSynergy('flow')){flowProgress++;if(flowProgress>=5){flowProgress=0;boostCooldown=Math.max(0,boostCooldown-(powers.capacitor===2?.8:.5));grace=Math.min(powers.streak===2?4:2,grace+1);burst(ship.x,shipY(),'#bca7f5')}}
}
function findAttractor(o,playerRange){
 let nearest=null,distance=Math.hypot(o.x-ship.x,o.y-shipY());
 if(distance<=playerRange)nearest={echo:null};else distance=Infinity;
 if(hasSynergy('gravity'))for(const e of echoes){
  const d=Math.hypot(o.x-e.x,o.y-e.y);
  if(e.life>0&&d<distance&&d<=(powers.magnet===2?130:90)){nearest={echo:e};distance=d}
 }
 return nearest;
}
function attractionY(o){return o.echoTarget&&o.echoTarget.life>0&&echoes.includes(o.echoTarget)?o.echoTarget.y:ship.y}
function attractionX(o){return o.echoTarget&&o.echoTarget.life>0&&echoes.includes(o.echoTarget)?o.echoTarget.x:ship.x}
function shieldNova(){
 const radius=powers.chain===2?150:110;rings.push({x:ship.x,y:shipY(),radius,life:.4});
 for(const rock of items)if(rock.rock&&!rock.dead&&Math.hypot(rock.x-ship.x,rock.y-shipY())<=radius)shatter(rock);
}
function shatter(rock,allowPerfect=true){
 if(rock.dead)return;
 const perfect=allowPerfect&&claimPerfect(rock.x,rock.y);
 if(perfect)for(let i=0;i<2;i++)shards.push({x:rock.x+(i?12:-12),y:rock.y-20,life:5,age:0,locked:false});
 const queue=[rock];let count=0;
 while(queue.length&&count<24){
  const r=queue.shift();if(r.dead)continue;r.dead=true;count++;
  shards.push({x:r.x,y:r.y-14,life:5,age:0,locked:false});burst(r.x,r.y,'#a6d9c9');
  if(powers.chain){const radius=powers.chain===2?125:85;rings.push({x:r.x,y:r.y,radius,life:.4});
   for(const other of items)if(other.rock&&!other.dead&&Math.hypot(other.x-r.x,other.y-r.y)<radius&&!queue.includes(other))queue.push(other);
  }
 }
 tone(250+count*70,.1);
}
// One precise reflection per boost; the existing perfect-hit reward remains one-shot.
function reflectMeteor(rock){
 if(rock.dead||boostTime<=0||(!rock.core&&(!perfectReady||perfectWindow<=0)))return false;
 let dx=-(rock.dx||0),dy=rock.dy===undefined?-1:-rock.dy;
 const length=Math.hypot(dx,dy)||1;dx/=length;dy/=length;
 shatter(rock);reflectCount++;
 const spread=powers.split===2?[-.48,-.24,0,.24,.48]:powers.split?[-.28,0,.28]:[0];
 for(const a of spread)reflections.push({x:rock.x,y:rock.y,dx:dx*Math.cos(a)-dy*Math.sin(a),dy:dx*Math.sin(a)+dy*Math.cos(a),r:8,life:2});
 reflections=reflections.slice(-16);
 announce('精准反射 · 陨石沿来路反击');return true;
}
// Earliest relative circle contact keeps fast reflected shots from tunnelling or hitting out of order.
function impactTime(ax,ay,bx,by,r){
 const vx=bx-ax,vy=by-ay,c=ax*ax+ay*ay-r*r;if(c<=0)return 0;
 const a=vx*vx+vy*vy;if(!a)return null;
 const b=2*(ax*vx+ay*vy),disc=b*b-4*a*c;if(disc<0)return null;
 const t=(-b-Math.sqrt(disc))/(2*a);return t>=0&&t<=1?t:null;
}
function updateReflections(dt){
 for(const shot of reflections){
  const oldX=shot.x,oldY=shot.y,step=Math.max(400,Math.min(W,H)*1.6)*Math.min(dt,shot.life);
  shot.x+=shot.dx*step;shot.y+=shot.dy*step;shot.life-=dt;
  let target=null,first=Infinity;
  const targets=items.filter(o=>o.rock&&!o.dead);
  if(boss&&boss.hp>0&&boss.warning<=0)targets.push(boss);
  if(objective?.kind==='mining')targets.push(...objective.ores.filter(o=>!o.dead),...objective.mines.filter(o=>!o.dead));
  for(const o of targets){
   const t=impactTime(oldX-(o.prevX??o.x),oldY-(o.prevY??o.y),shot.x-o.x,shot.y-o.y,shot.r+o.r);
   if(t!==null&&t<first){target=o;first=t}
  }
  if(target){if(target===boss)breakBossShell(false);else if(target.ore)breakOre(target);else if(target.mine)disarmMine(target);else shatter(target,false);shot.life=0}
  if(shot.x<-60||shot.x>W+60||shot.y<-60||shot.y>H+60)shot.life=0;
 }
 reflections=reflections.filter(s=>s.life>0);items=items.filter(o=>!o.dead);
}

function collectDust(){dust++;score+=Math.round(25*phases[phase].multiplier*routeReward());if(powers.capacitor)boostCooldown=Math.max(0,boostCooldown-(powers.capacitor===2?.45:.25));tone(980,.07)}
function claimPerfect(x,y){
 if(!perfectReady||perfectWindow<=0||boostTime<=0)return false;
 perfectReady=false;perfectCount++;score+=50*phases[phase].multiplier;slowTime=.35;
 announce('完美碎星 · 额外奖励');rings.push({x,y,radius:100,life:.4});tone(1200,.12);return true;
}
function damage(){
 if(invincible>0||resumeShield>0||orbit||whaleSafe)return;
 if(guard>0){guard--;invincible=1.1;announce('月辉护甲 · 抵挡成功');burst(ship.x,shipY(),'#bca7f5');if(hasSynergy('nova'))shieldNova();return}
 if(activeWager?.id==='safe')resolveWager(false);
 hp--;combo=0;invincible=1.7;burst(ship.x,shipY(),'#f08c79');tone(130,.18);if(hp<=0)finish();
}
function missStar(){if(powers.streak&&grace>0)grace--;else combo=0}
function moveToward(o,x,y,speed,dt){
 const dx=x-o.x,dy=y-o.y,d=Math.hypot(dx,dy),step=Math.min(d,speed*dt);
 if(d>0){o.x+=dx/d*step;o.y+=dy/d*step}
}
function updateBoss(dt,worldDt,oldX,protectedByBoost,oldY=ship.y){
 if(!bossStarted&&elapsed>=70){bossStarted=true;boss={x:W/2,y:H*.32,r:40,hp:3,warning:2,lastBoost:-1};storm={slot:0,event:null};warnings=[];announce('星空风暴将至 · 绿色缺口安全，生还也有奖励')}
 if(!boss||boss.hp<=0)return;
 if(boss.warning>0){boss.warning=Math.max(0,boss.warning-dt);return}
 boss.prevX=boss.x;boss.prevY=boss.y;
 moveToward(boss,W*(.5+Math.sin((elapsed-72)*.55)*.27),H*(.48+Math.sin((elapsed-72)*.72)*.2),Math.min(W,H)*.48,worldDt);
 if(!touchesPath(boss,oldX,oldY,boss.r+shipRadius()))return;
 if(protectedByBoost){
  if(boss.lastBoost===boostSerial)return;
  boss.lastBoost=boostSerial;breakBossShell(true);
 }else damage();
}
function breakBossShell(allowPerfect=false){
 if(!boss||boss.hp<=0||boss.warning>0)return;
 boss.hp--;const perfect=allowPerfect&&claimPerfect(boss.x,boss.y);burst(boss.x,boss.y,'#f3d694');
  if(perfect)for(let i=0;i<2;i++)shards.push({x:boss.x+(i?12:-12),y:boss.y,age:0,life:5,locked:true});
  shards.push({x:boss.x,y:boss.y,age:0,life:5,locked:true});
  announce(boss.hp?`${perfect?'完美破壳':'巨陨破壳'} · 剩余 ${boss.hp} 层`:'月蚀消散 · +600 分');
  if(boss.hp===0){if(storm)storm.event=null;items=items.filter(o=>!o.core&&!o.storm);score+=600;for(let i=0;i<6;i++)shards.push({x:boss.x+(i-2.5)*12,y:boss.y,age:0,life:5,locked:true});rings.push({x:boss.x,y:boss.y,radius:170,life:.4})}
}
function burst(x,y,color){for(let i=0;i<10&&particles.length<220;i++)particles.push({x,y,vx:(Math.random()-.5)*150,vy:(Math.random()-.5)*150,life:.5,color})}
// Queue a readable trail, with enough time between stars to follow it on any screen.
function starWave(){
 const reverse=wave%2,shape=wave%3,n=phase===0?6:8,center=.3+Math.random()*.4;
 for(let i=0;i<n;i++){
  const u=i/(n-1),v=reverse?1-u:u;
  const x=shape===0?.18+v*.64:shape===1?center+Math.sin(v*Math.PI*2)*.2:center+(1-Math.abs(2*v-1))*.35-.17;
  pending.push({delay:i*.25,x:Math.max(.1,Math.min(.9,x)),rock:false});
 }
 wave++;
}
function edgePoint(edge,at){
 if(edge===0)return {x:W*at,y:-28};
 if(edge===1)return {x:W+28,y:H*at};
 if(edge===2)return {x:W*at,y:H+28};
 return {x:-28,y:H*at};
}
function warningVector(w){
 const origin=edgePoint(w.edge,w.at),dx=w.tx*W-origin.x,dy=w.ty*H-origin.y,n=Math.hypot(dx,dy)||1;
 return {...origin,dx:dx/n,dy:dy/n};
}
function warnWave(){
 const d=difficulty(),first=hazardWave++%4;
 for(let j=0;j<d.count;j++){
  // Aimed at the position when warned, never homing after launch.
  const aimed=Math.random()<.4;
  const tx=aimed?ship.x/W+(Math.random()-.5)*.22:.15+Math.random()*.7;
  const ty=aimed?ship.y/H+(Math.random()-.5)*.22:.15+Math.random()*.7;
  warnings.push({edge:(first+j)%4,at:.08+Math.random()*.84,tx:Math.max(.08,Math.min(.92,tx)),ty:Math.max(.08,Math.min(.92,ty)),remaining:d.warning,total:d.warning});
 }
}
function spawnMeteor(w){
 const v=warningVector(w);
 items.push({x:v.x,y:v.y,prevX:v.x,prevY:v.y,r:11+Math.random()*4,dx:v.dx,dy:v.dy,speedScale:.9+Math.random()*.2,rock:true,a:Math.random()*6,age:0});
}
function spawnItem(x,rock){
 // Gold trails retain their vertical drift; hazards use the four-edge launcher.
 items.push({x:clamp(x*W),y:-16,r:rock?12:9,v:(H-55)/phases[phase].flight,rock,a:Math.random()*6,age:0});
}

function update(dt){
 if(panelOpen)return;
 if(state==='menuIntro'){
  menuIntro.remaining-=dt;
  if(menuIntro.remaining<=0){const kind=menuIntro.kind;menuIntro=null;$('menuCue').hidden=true;state='playing';if(kind==='upgrade')offerUpgrade();else maybeOfferWager()}
  return;
 }
 if(state!=='playing')return;
 resumeShield=Math.max(0,resumeShield-dt);moonCooldown=Math.max(0,moonCooldown-dt);
 elapsed+=dt;tickWager();time=Math.max(0,90-elapsed);const next=Math.min(2,Math.floor(elapsed/30));if(next!==phase)setPhase(next);
 announcementTime=Math.max(0,announcementTime-dt);invincible=Math.max(0,invincible-dt);boostCooldown=Math.max(0,boostCooldown-dt);
 const worldDt=dt*(slowTime>0?.4:1);slowTime=Math.max(0,slowTime-dt);
 let oldX=ship.x,oldY=ship.y;
 const keyboardX=Number(keys.has('arrowright')||keys.has('d'))-Number(keys.has('arrowleft')||keys.has('a'));
 const keyboardY=Number(keys.has('arrowdown')||keys.has('s'))-Number(keys.has('arrowup')||keys.has('w'));
 const virtual=inputMode==='virtual'?virtualDirection():{x:0,y:0};
 const dx=keyboardX||keyboardY?keyboardX:virtual.x,dy=keyboardX||keyboardY?keyboardY:virtual.y;
 const length=Math.hypot(dx,dy),moveStep=Math.min(W,H)*.9*(boostTime>0?BOOST_SPEED:1)*cargoSpeed()*dt;
 const special=stepSpecialMovement(dt);
 if(!special){
 if(length){ship.target=clamp(ship.x+dx/length*moveStep*Math.min(1,length));ship.targetY=clampY(ship.y+dy/length*moveStep*Math.min(1,length))}
 if(inputMode==='pointer'&&!length){ship.x=clamp(ship.target);ship.y=clampY(ship.targetY)}
 else{moveToward(ship,ship.target,ship.targetY,moveStep/(dt||1),dt);ship.x=clamp(ship.x);ship.y=clampY(ship.y)}
 }
 if(stepWorld(dt,oldX,oldY)){oldX=ship.x;oldY=ship.y}if(state==='over')return;
 updateFlight(dt,oldX,oldY);updateAdventure(dt,oldX,oldY);if(state==='over')return;stepFleet(dt,oldX,oldY);
 const protectedByBoost=boostTime>0||!!launch;boostTime=Math.max(0,boostTime-dt);
 spawn-=dt;if(spawn<=0){starWave();spawn=phases[phase].interval}
 hazardClock-=dt;if(storm&&boss?.hp>0)hazardClock=Math.max(hazardClock,1.5);if(hazardClock<=0){warnWave();hazardClock=difficulty().interval*(activeWorld==='classic'?1:1.6)*(objective?.kind==='mining'?1.5:laser?1.3:1)}
 for(let i=warnings.length-1;i>=0;i--){const w=warnings[i];w.remaining-=dt;if(w.remaining<=0){spawnMeteor(w);warnings.splice(i,1)}}
 for(let i=pending.length-1;i>=0;i--){const p=pending[i];p.delay-=dt;if(p.delay<=0){spawnItem(p.x,p.rock);pending.splice(i,1)}}
 const y=shipY();
 for(let i=items.length-1;i>=0;i--){
  const o=items[i];if(o.dead)continue;o.prevX=o.x;o.prevY=o.y;o.a+=dt;o.age=(o.age||0)+dt;
  if(!o.rock&&starAttraction()>0&&!o.captured){const target=findAttractor(o,starAttraction());if(target){o.captured=true;o.echoTarget=target.echo}}
  // Captured stars no longer fall: gravity must not balance attraction below the boat.
  if(o.captured)moveToward(o,attractionX(o),attractionY(o),Math.max(500,Math.min(W,H)*1.4),dt);
  else if(o.rock&&o.dx!==undefined){const speed=difficulty().speed*o.speedScale;o.x+=o.dx*speed*worldDt;o.y+=o.dy*speed*worldDt}
  else o.y+=(o.v||0)*worldDt;
  // Relative swept circles catch fast hits from any direction, including diagonal crossings.
  const hit=touchesPath(o,oldX,oldY,o.r+(o.rock?shipRadius():pickupRadius()));
  const echoHit=!o.rock&&echoes.some(e=>segmentDistance(e.x,e.y,o.prevX,o.prevY,o.x,o.y)<o.r+22);
  if(hit||echoHit||(!o.rock&&satelliteHit(o,oldX,oldY,dt))){
   if(o.rock){if(protectedByBoost){if(!reflectMeteor(o))shatter(o)}else{o.dead=true;damage();if(state==='over')return}}
   else{o.dead=true;collectStar(o)}
  }else if((!o.rock&&o.y>H+20)||o.x<-60||o.x>W+60||o.y<-60||o.y>H+60||o.age>18){o.dead=true;if(!o.rock)missStar()}
 }
 items=items.filter(o=>!o.dead);
 for(let i=shards.length-1;i>=0;i--){
  const s=shards[i];s.age+=dt;s.life-=dt;
  const echo=echoes.find(e=>Math.hypot(s.x-e.x,s.y-e.y)<24);
  const range=(powers.magnet===2?175:powers.magnet?140:110)*(moonPhase==='dark'?.7:1);
  if(!s.locked){const target=findAttractor(s,range);if(target){s.locked=true;s.echoTarget=target.echo}}
  if(s.age>.14&&s.locked){moveToward(s,attractionX(s),attractionY(s),Math.max(540,Math.min(W,H)*1.6),dt)}else s.y-=dt*5;
  if(s.age>.14&&(Math.hypot(s.x-ship.x,s.y-y)<=26||echo||satelliteHit(s,oldX,oldY,dt))){collectDust();shards.splice(i,1)}
  else if(s.life<=0)shards.splice(i,1);
 }
 updateBoss(dt,worldDt,oldX,protectedByBoost,oldY);if(state==='over')return;
 updateReflections(dt);stepLaser(dt,oldX,oldY,protectedByBoost);stepStorm(dt,oldX,oldY,protectedByBoost);if(state==='over')return;
 perfectWindow=Math.max(0,perfectWindow-dt);
 for(const e of echoes)e.life-=dt;echoes=echoes.filter(e=>e.life>0);
 for(const r of rings)r.life-=dt;rings=rings.filter(r=>r.life>0);

 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.life<=0)particles.splice(i,1)}
 hud();if(time<=0)finish();else{updateChoiceDock();adventureHud()}
}
// Optional field objectives are timed by game time; no new automatic modal or timer.
function beginObjective(spec){
 const mirrored=spec.kind==='whale'?routeMirror:Math.random()<.5;
 if(spec.kind==='rings')objective={kind:'rings',deadline:elapsed+spec.duration,index:0,points:[{x:.2,y:.48},{x:.4,y:.7},{x:.62,y:.42},{x:.8,y:.64}].map(p=>({x:mirrored?1-p.x:p.x,y:p.y}))};
 else if(spec.kind==='cargo')objective={kind:'cargo',deadline:elapsed+spec.duration,load:0,station:{x:mirrored?.18:.82,y:.76},crates:[{x:.2,y:.42},{x:.44,y:.64},{x:.66,y:.4}].map(p=>({...p,x:mirrored?1-p.x:p.x,taken:false}))};
 else if(spec.kind==='sling')objective={kind:'sling',deadline:elapsed+spec.duration,cx:.5,cy:.56};
 else if(spec.kind==='whale')objective={kind:'whale',deadline:elapsed+spec.duration,born:elapsed,duration:spec.duration,mirror:mirrored,trail:[],follow:0,rewarded:false,drop:0,x:mirrored?.88:.12,y:.5};
 else if(spec.kind==='mining')objective={kind:'mining',deadline:elapsed+spec.duration,born:elapsed,ores:[{x:.24,y:.4},{x:.5,y:.72},{x:.77,y:.42}].map(p=>({x:p.x*W,y:p.y*H,r:14,ore:true,dead:false})),mines:[{x:.4,y:.49,offset:0},{x:.67,y:.65,offset:2}].map(p=>({...p,x:p.x*W,y:p.y*H,r:11,mine:true,dead:false,born:elapsed}))};
 else objective={kind:'escort',deadline:elapsed+spec.duration,x:W*(mirrored?.8:.2),y:H*.65,home:{x:mirrored?.2:.8,y:.4},following:false,met:false};
 if(spec.sector)objective.sector=spec.sector;if(spec.port)objective.port=true;
}
function chooseRoute(id){
 if(!fork||!['calm','rich'].includes(id))return;
 const stage=forkStage(),sector=sectorPairs[stage][id==='rich'?1:0];routePlan[stage]=sector;
 activeRoute={id,sector,until:elapsed+20};fork=null;
 adventureResult=`航线已锁定：${sectors[sector].name} · ${sectors[sector].note}`;
 tone(id==='rich'?880:520,.12);mapHud();
}
function updateAdventure(dt,oldX,oldY){
 const wasSafe=whaleSafe;whaleSafe=false;
 if(activeRoute&&elapsed>=activeRoute.until)activeRoute=null;
 if(!objective&&adventureSlot<adventureSchedule.length&&elapsed>=adventureSchedule[adventureSlot].at){
  const index=adventureSlot++,spec=scheduledAdventure(adventureSchedule[index],index);
  if(elapsed<spec.at+spec.duration){if(spec.sector)routePlan[index===2?0:1]=spec.sector;beginObjective({...spec,duration:spec.at+spec.duration-elapsed})}
 }
 if(!fork&&routeSlot<routeSchedule.length&&elapsed>=routeSchedule[routeSlot]){
  const at=routeSchedule[routeSlot++];if(elapsed<at+7)fork={stage:routeSlot-1,deadline:at+7,armed:elapsed+1,blocked:[false,false]};
 }
 if(fork){
  if(elapsed>=fork.deadline)chooseRoute('calm');
  else for(const [i,id,x] of [[0,'calm',.25],[1,'rich',.75]]){
   const inside=Math.hypot(ship.x-W*x,ship.y-H*.48)<30;
   if(elapsed<fork.armed){if(fork.blocked)fork.blocked[i]=inside;continue}
   // A gate appearing under the ship is not an intentional entry. Leave it before choosing.
   if(fork.blocked?.[i]){if(!inside)fork.blocked[i]=false;continue}
   if(segmentDistance(W*x,H*.48,oldX,oldY,ship.x,ship.y)<30){chooseRoute(id);break}
  }
 }
 const o=objective;if(!o)return;
 if(elapsed>=o.deadline){if(orbit){releaseOrbit();return}if(wasSafe)resumeShield=Math.max(resumeShield,.8);adventureResult=o.kind==='rings'?'星环已远去 · 错过不扣分':o.kind==='cargo'?'货运窗口结束 · 未交货物回收，无扣分':o.kind==='mining'?'矿场关闭 · 已有奖励保留':o.kind==='whale'?'星鲸游向远方 · 感谢同行':o.kind==='sling'?'引力环已消散 · 可自由略过':'月灵自行返航 · 错过不扣分';objective=null;return}
 if(o.kind==='rings'){
  let lastContact=-1;
  while(o.index<o.points.length){
   const p=o.points[o.index],contact=impactTime(oldX-p.x*W,oldY-p.y*H,ship.x-p.x*W,ship.y-p.y*H,27);
   if(contact===null||contact<lastContact)break;
   lastContact=contact;o.index++;score+=ringReward(25);burst(p.x*W,p.y*H,'#e4c9ff');tone(600+o.index*120,.09);
   if(o.index===o.points.length){ringWins++;score+=ringReward(150);for(let i=0;i<3;i++)collectDust();adventureResult=`星环连穿完成 · +${ringReward(150)} 分、3 颗星屑`;objective=null;break}
   if(!o.linked)break;
  }
 }else if(o.kind==='mining'){
  updateMining(dt,oldX,oldY);
 }else if(o.kind==='sling'){
  // Entering the field requires the player's existing boost control.
 }else if(o.kind==='whale'){
  const u=Math.min(1,(elapsed-o.born)/o.duration);o.x=o.mirror?.88-u*.76:.12+u*.76;o.y=.53+Math.sin(u*Math.PI*3)*.14;
  if(!o.trail.length||elapsed-o.trail[o.trail.length-1].at>=1/30)o.trail.push({x:o.x,y:o.y,at:elapsed});o.trail=o.trail.filter(p=>elapsed-p.at<2.4).slice(-90);
  const corridor=Math.max(24,Math.min(W,H)*.085);
  whaleSafe=o.trail.some((p,i)=>{const q=o.trail[Math.max(0,i-1)];return segmentDistance(ship.x,ship.y,p.x*W,p.y*H,q.x*W,q.y*H)<corridor});
  if(whaleSafe){o.follow+=dt;if(o.follow>=5&&!o.rewarded){o.rewarded=true;whaleWins++;score+=150;adventureResult='追鲸同行 · +150 分';tone(950,.14)}}
  o.drop-=dt;if(o.drop<=0){o.drop=.5;items.push({x:o.x*W,y:o.y*H,v:0,r:7,rock:false,a:0,age:0})}
 }else if(o.kind==='cargo'){
  for(const c of o.crates)if(!c.taken&&o.load<3&&segmentDistance(c.x*W,c.y*H,oldX,oldY,ship.x,ship.y)<20){c.taken=true;o.load++;tone(500+o.load*100,.08)}
  if(o.load>0&&segmentDistance(o.station.x*W,o.station.y*H,oldX,oldY,ship.x,ship.y)<30){
   const reward=cargoReward(o.load);cargoDelivered+=o.load;score+=reward;o.load=0;boostCooldown=Math.max(0,boostCooldown-1);burst(o.station.x*W,o.station.y*H,'#ffdca0');adventureResult=`货物已交付 · +${reward} 分，加速充能 1 秒`;
   if(o.crates.every(c=>c.taken)){if(o.port){guard++;adventureResult+=' · 港口补给：护甲 +1'}objective=null;}
  }
 }else{
  const separation=Math.hypot(ship.x-o.x,ship.y-o.y);
  if(!o.following&&segmentDistance(o.x,o.y,oldX,oldY,ship.x,ship.y)<34){o.following=true;o.met=true}
  if(o.following&&separation>Math.min(W,H)*.36)o.following=false;
  if(o.following)moveToward(o,ship.x-Math.cos(flight.angle)*24,ship.y-Math.sin(flight.angle)*24,Math.min(W,H)*.8,dt);
  if(o.following&&Math.hypot(o.x-o.home.x*W,o.y-o.home.y*H)<35){escortWins++;score+=200;bonusCredits++;adventureResult='月灵已归航 · +200 分、1 次强化待领取';burst(o.x,o.y,'#c1eaff');objective=null}
 }
}
function updateChoiceDock(){
 if(wagerInviteUntil&&elapsed>=wagerInviteUntil){wagerInviteUntil=0;wagerSlot++;wagerResult='已略过赌约 · 自由飞行'}
 if(!wagerInviteUntil&&!activeWager&&wagerSlot<wagerSchedule.length&&elapsed>=wagerSchedule[wagerSlot]){
  if(elapsed>65)wagerSlot=wagerSchedule.length;else wagerInviteUntil=elapsed+8;
 }
}
let adventureSignature='';
function adventureHud(){
 const o=objective,ready=canUpgrade(),invite=wagerInviteUntil>elapsed;
 const signature=[activeWorld,worldSlot,worldWins,worldEvent?.used,worldEvent?.index,Math.ceil(elapsed),state,inputMode,mouseX!==null,resumeShield>0,moonPhase,moonCooldown>0,o?.kind,o?.sector,o?.index,oreCount,minesCleared,o?.following,o?.load,Math.floor(o?.follow||0),whaleSafe,!!orbit,Math.ceil(laser?(laser.warningEnd-elapsed)*10:0),!!laser,Math.ceil((o?.deadline||0)-elapsed),fork?.deadline,Math.ceil((fork?.deadline||0)-elapsed),activeRoute?.id,adventureResult,ready,invite,Math.ceil(wagerInviteUntil-elapsed),bonusCredits].join('|');
 if(signature===adventureSignature)return;adventureSignature=signature;
 $('moonToggle').disabled=state!=='playing'||moonCooldown>0;$('moonToggle').setAttribute('aria-pressed',String(moonPhase==='dark'));
 $('moonToggle').textContent=moonPhase==='bright'?'☀ 明月 · 吸星  ⇄':'☾ 暗月 · 小巧  ⇄';
 $('padMoon').disabled=$('moonToggle').disabled;$('padMoon').textContent=moonPhase==='bright'?'☀ 明月':'☾ 暗月';$('padMoon').setAttribute('aria-pressed',String(moonPhase==='dark'));
 $('upgradeReady').hidden=!ready;$('upgradeReady').disabled=state!=='playing'||resumeShield>0;
 $('wagerReady').hidden=!invite;$('wagerReady').disabled=state!=='playing'||resumeShield>0;
 $('wagerReady').textContent=`赌约可选 · R · ${Math.max(0,Math.ceil(wagerInviteUntil-elapsed))}s`;
 $('choiceHint').hidden=ready||invite;
 let text=adventureResult;
 if(o?.kind==='rings')text=`${o.linked?'弹射连环':'星环'} ${o.index}/${o.points.length} · 按亮起顺序穿过 · ${Math.max(0,Math.ceil(o.deadline-elapsed))}s`;
 if(o?.kind==='escort')text=`月灵 · ${o.following?'送往蓝色归航圈':o.met?'月灵掉队了，靠近接回':'靠近蓝色月灵接应'} · ${Math.max(0,Math.ceil(o.deadline-elapsed))}s`;
 if(o?.kind==='cargo')text=`货舱 ${o.load}/3 · ${o.load?(inputMode==='pointer'&&mouseX!==null?'鼠标跟随':'移速 '+Math.round(cargoSpeed()*100)+'%')+' · 交货 +'+cargoReward(o.load)+'分':'靠近金色方箱装货 → 空间站交付'} · ${Math.max(0,Math.ceil(o.deadline-elapsed))}s`;
 if(o?.kind==='sling')text=orbit?'环绕蓄力中 · 再点加速沿切线弹射':'靠近紫色引力环 · 点加速入轨，再点弹射';
 if(o?.kind==='mining')text=`矿核 ${o.ores.filter(c=>c.dead).length}/3 · 加速或反弹开采 · 脉冲 ${elapsed<70?'亮起时避开':'已停机'} · ${Math.max(0,Math.ceil(o.deadline-elapsed))}s`;
 if(o?.kind==='whale')text=`追逐星鲸 · ${whaleSafe?'尾流保护中':'进入蓝色尾流可安全跟随'} · 同行 ${Math.min(5,Math.floor(o.follow))}/5s`;
 $('obstacleStatus').hidden=!laser;$('obstacleStatus').textContent=laser?(elapsed<laser.warningEnd?`激光预警 ${Math.max(0,laser.warningEnd-elapsed).toFixed(1)}s · 走绿色缺口`:'激光开启 · 走绿色缺口 / 加速穿越'):'';
 if(fork){const [left,right]=sectorPairs[forkStage()];text=`左门 ${sectors[left].name} / 右门 ${sectors[right].name} · ${Math.max(0,Math.ceil(fork.deadline-elapsed))}s（默认左路）`;}
 if(activeWorld!=='classic')text=worldCaption();
 $('flightStatus').textContent=text||'追逐星环、护送月灵 · 都可自由略过';
 $('routeStatus').textContent=(activeWorld!=='classic'?worldInfo().name+' · ':'')+(cargoLoad()?`货舱 ${cargoLoad()}/3 · `:'')+(activeRoute?.sector?sectors[activeRoute.sector].name:activeRoute?(activeRoute.id==='calm'?'平静星海':'丰收星域'):'自由航行');
}
function drawAdventure(t){
 ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='11px sans-serif';
 const o=objective;
 if(o?.kind==='rings'){
  for(let i=o.index;i<o.points.length;i++){
   const p=o.points[i],x=p.x*W,y=p.y*H,active=i===o.index;
   ctx.globalAlpha=active?.9:.25;ctx.strokeStyle=active?'#efd2ff':'#c1aaf0';ctx.lineWidth=active?3:1;ctx.beginPath();ctx.arc(x,y,22+(active?Math.sin(t*3)*2:0),0,Math.PI*2);ctx.stroke();ctx.fillStyle='#f5e7ff';ctx.fillText(String(i+1),x,y);
  }
 }
 if(o?.kind==='escort'){
  ctx.globalAlpha=.85;ctx.strokeStyle='#a9daff';ctx.lineWidth=2;ctx.setLineDash([4,5]);ctx.beginPath();ctx.arc(o.home.x*W,o.home.y*H,32,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#c6eaff';ctx.fillText('归航',o.home.x*W,o.home.y*H);
  if(o.following){ctx.globalAlpha=.3;ctx.beginPath();ctx.moveTo(o.x,o.y);ctx.lineTo(ship.x,ship.y);ctx.stroke()}
  ctx.globalAlpha=1;ctx.shadowColor='#b6deff';ctx.shadowBlur=13;ctx.fillStyle='#c6eaff';ctx.beginPath();ctx.arc(o.x,o.y,9,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#16384c';ctx.beginPath();ctx.arc(o.x-3,o.y-1,1.3,0,7);ctx.arc(o.x+3,o.y-1,1.3,0,7);ctx.fill();
 }
 if(o?.kind==='cargo'){
  ctx.globalAlpha=.9;ctx.strokeStyle='#ffdca0';ctx.fillStyle='#ffdca0';ctx.lineWidth=2;
  const x=o.station.x*W,y=o.station.y*H;ctx.beginPath();ctx.arc(x,y,28,0,Math.PI*2);ctx.stroke();ctx.strokeRect(x-19,y-19,38,38);ctx.fillText('交货',x,y);
  for(const c of o.crates)if(!c.taken){const cx=c.x*W,cy=c.y*H;ctx.fillStyle='#705333';ctx.fillRect(cx-9,cy-9,18,18);ctx.strokeRect(cx-9,cy-9,18,18);ctx.beginPath();ctx.moveTo(cx,cy-8);ctx.lineTo(cx,cy+8);ctx.stroke()}
  for(let i=0;i<o.load;i++){ctx.fillStyle='#ffdca0';ctx.fillRect(ship.x-11+i*8,ship.y+22,6,6)}
 }
 if(fork){
  sectorPairs[forkStage()].forEach((id,i)=>{
   const x=i?.75:.25,sector=sectors[id];ctx.globalAlpha=elapsed<fork.armed?.4:.9;ctx.strokeStyle=sector.color;ctx.fillStyle=sector.color;ctx.lineWidth=3;
   ctx.setLineDash([4,6]);ctx.beginPath();ctx.moveTo(W*.5,H*.77);ctx.lineTo(x*W,H*.55);ctx.stroke();ctx.setLineDash([]);
   ctx.beginPath();ctx.ellipse(x*W,H*.48,28,37,0,0,Math.PI*2);ctx.stroke();ctx.fillText(i?'右':'左',x*W,H*.48);ctx.fillText(sector.name,x*W,H*.48-49);ctx.font='9px sans-serif';ctx.fillText(sector.note,x*W,H*.48+51);ctx.font='11px sans-serif';
  });
 }
 ctx.restore();
}

function star(x,y,r,a){ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.beginPath();for(let i=0;i<8;i++){const t=i*Math.PI/4,rr=i%2?r*.35:r;ctx.lineTo(Math.cos(t)*rr,Math.sin(t)*rr)}ctx.closePath();ctx.fill();ctx.restore()}
// Position follows input immediately; only the craft's pose and engine ease into motion.
function updateFlight(dt,oldX,oldY){
 const dx=ship.x-oldX,dy=ship.y-oldY,distance=Math.hypot(dx,dy);
 const moving=distance>.01;
 let turn=0;
 if(moving){
  const desired=Math.atan2(dy,dx);
  turn=Math.atan2(Math.sin(desired-flight.angle),Math.cos(desired-flight.angle));
  flight.angle+=turn*(-Math.expm1(-26*dt));
  flight.angle=Math.atan2(Math.sin(flight.angle),Math.cos(flight.angle));
 }
 flight.bank+=(Math.max(-.22,Math.min(.22,turn*.16))-flight.bank)*(-Math.expm1(-18*dt));
 const power=moving?Math.min(1,distance/Math.max(.001,dt)/(Math.min(W,H)*.9)):0;
 flight.throttle+=(power-flight.throttle)*(-Math.expm1(-(moving?45:15)*dt));
 for(const p of flight.trail)p.life-=dt;
 flight.trail=flight.trail.filter(p=>p.life>0);
 if(moving){
  const life=boostTime>0?.22:.13;
  flight.trail.push({x:oldX,y:oldY,x2:ship.x,y2:ship.y,life,total:life,boost:boostTime>0});
  if(flight.trail.length>32)flight.trail.shift();
 }
}
function drawCraft(x,y,angle,bank,throttle,t,ghost=false){
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(1,1-Math.abs(bank));
 const mint=ghost?'#c1aaf0':moonPhase==='dark'?'#c1aaf0':hull().color;
 if(!ghost&&moonPhase==='dark')ctx.scale(.72,.72);
 // Twin swept fins surround a compact capsule, with the gold moon core at its center.
 if(!ghost&&throttle>.02){
  const flame=(9+throttle*16+(boostTime>0?15:0))*(1+Math.sin(t*36)*.08);
  ctx.fillStyle=boostTime>0?'#b9ffe67a':'#86dac45c';ctx.shadowColor=mint;ctx.shadowBlur=12;
  for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(-11,side*7-3);ctx.quadraticCurveTo(-flame-14,side*7,-11,side*7+3);ctx.fill()}
  ctx.shadowBlur=0;
 }
 if(!ghost){
  ctx.strokeStyle=mint;ctx.lineWidth=2;
  if(activeShip==='warden'){ctx.beginPath();ctx.moveTo(17,-13);ctx.lineTo(-18,-19);ctx.lineTo(-22,0);ctx.lineTo(-18,19);ctx.lineTo(17,13);ctx.stroke()}
  if(activeShip==='falcon'){ctx.beginPath();ctx.moveTo(-23,-10);ctx.lineTo(29,0);ctx.lineTo(-23,10);ctx.stroke()}
 }
 ctx.lineWidth=1.5;ctx.strokeStyle=mint;ctx.fillStyle=ghost?'#bca7f522':'#244d5a';
 for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(8,side*5);ctx.quadraticCurveTo(-2,side*19,-15,side*17);ctx.lineTo(-10,side*7);ctx.closePath();ctx.fill();ctx.stroke()}
 ctx.shadowColor=mint;ctx.shadowBlur=ghost?5:10;ctx.fillStyle=ghost?'#bca7f533':'#a9dfd4';
 ctx.beginPath();ctx.moveTo(21,0);ctx.bezierCurveTo(12,-10,-6,-12,-13,-5);ctx.lineTo(-13,5);ctx.bezierCurveTo(-6,12,12,10,21,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;
 ctx.fillStyle=ghost?'#e6dbff':'#183748';ctx.beginPath();ctx.ellipse(3,0,8,5,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#f3d694';ctx.beginPath();ctx.arc(2,0,3.2,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle=ghost?'#e6dbff':'#edfff8';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(11,-2);ctx.lineTo(15,0);ctx.lineTo(11,2);ctx.stroke();
 ctx.restore();
}
function draw(t){ctx.clearRect(0,0,W,H);const bg=ctx.createRadialGradient(W*.55,H*.25,0,W*.5,H*.5,W*.7);bg.addColorStop(0,activeWorld==='classic'?['#1c3046','#302640','#3b3040'][phase]:worldInfo().color);bg.addColorStop(1,'#0a1524');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
for(const s of stars){ctx.globalAlpha=.25+(Math.sin(t*.6+s.p)+1)*.22;ctx.fillStyle='#dde8ec';ctx.beginPath();ctx.arc(s.x*W,s.y*H,s.r,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
ctx.strokeStyle='#adcbd30c';for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(W*.52,H*1.06,W*(.45+i*.15),H*(.55+i*.15),-.12,Math.PI,Math.PI*2);ctx.stroke()}
ctx.fillStyle='#b8cec617';ctx.beginPath();ctx.arc(W*.83,H*.25,30,0,Math.PI*2);ctx.fill();ctx.fillStyle='#17283c';ctx.beginPath();ctx.arc(W*.83+12,H*.25-7,27,0,Math.PI*2);ctx.fill();
drawWorld(t);drawAdventure(t);drawSpecialSpace(t);drawMining(t);drawFleet();drawStorm();drawNavigation();
for(const r of reflections){ctx.save();ctx.strokeStyle='#9cffe6';ctx.lineWidth=4;ctx.shadowColor='#9cffe6';ctx.shadowBlur=12;ctx.beginPath();ctx.moveTo(r.x-r.dx*24,r.y-r.dy*24);ctx.lineTo(r.x,r.y);ctx.stroke();ctx.fillStyle='#e1fff2';star(r.x,r.y,r.r,t*5);ctx.restore()}
for(const w of warnings){
 const v=warningVector(w),x=Math.max(7,Math.min(W-7,v.x)),y=Math.max(7,Math.min(H-7,v.y));
 ctx.save();ctx.globalAlpha=.2+(Math.sin(t*14)+1)*.1;ctx.strokeStyle='#f08c79';ctx.lineWidth=1;ctx.setLineDash([5,9]);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+v.dx*Math.hypot(W,H),y+v.dy*Math.hypot(W,H));ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;ctx.fillStyle='#ff9f83';ctx.beginPath();ctx.arc(x,y,5+3*(1-w.remaining/w.total),0,Math.PI*2);ctx.fill();ctx.restore();
}
for(const o of items){if(o.rock&&o.dx!==undefined){ctx.strokeStyle='#ed8d7d55';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(o.x,o.y);ctx.lineTo(o.x-o.dx*22,o.y-o.dy*22);ctx.stroke()}ctx.fillStyle=o.core?'#ddb1ff':o.rock?'#ed8d7d':'#f3d694';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=o.rock?8:17;if(o.rock){ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.a);ctx.beginPath();for(let i=0;i<7;i++){const a=i*Math.PI*2/7,r=o.r*(i%2?.8:1);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.closePath();ctx.fill();ctx.fillStyle='#804e54';ctx.beginPath();ctx.arc(2,-2,3,0,7);ctx.fill();ctx.restore()}else star(o.x,o.y,o.r,o.a);ctx.shadowBlur=0}
if(boss&&boss.hp>0){ctx.save();ctx.globalAlpha=boss.warning>0?.3:1;ctx.translate(boss.x,boss.y);ctx.rotate(t*.15);ctx.fillStyle='#6d5367';ctx.strokeStyle='#f3b49c';ctx.lineWidth=3;ctx.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5,r=boss.r*(i%2?.87:1);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#f3d694';star(0,0,13,t);for(let i=0;i<boss.hp;i++){ctx.beginPath();ctx.arc(0,0,20+i*6,0,Math.PI*1.6);ctx.stroke()}ctx.restore()}
for(const s of shards){ctx.globalAlpha=Math.min(1,s.life);ctx.fillStyle='#a6ffe0';ctx.shadowColor='#a6ffe0';ctx.shadowBlur=16;star(s.x,s.y,6,t*2);ctx.shadowBlur=0}ctx.globalAlpha=1;
for(const r of rings){ctx.globalAlpha=r.life/.4;ctx.strokeStyle='#a6d9c9';ctx.lineWidth=2;ctx.beginPath();ctx.arc(r.x,r.y,r.radius*(1-r.life/.4),0,Math.PI*2);ctx.stroke()}ctx.globalAlpha=1;
for(const e of echoes){if(hasSynergy('gravity')){ctx.strokeStyle='#bca7f530';ctx.lineWidth=1;ctx.beginPath();ctx.arc(e.x,e.y,powers.magnet===2?130:90,0,Math.PI*2);ctx.stroke()}ctx.save();ctx.globalAlpha=Math.min(.6,e.life);drawCraft(e.x,e.y,e.angle??-Math.PI/2,0,0,t,true);ctx.restore()}
if(starAttraction()>0){ctx.strokeStyle='#a6d9c918';ctx.lineWidth=1;ctx.beginPath();ctx.arc(ship.x,shipY(),starAttraction(),0,Math.PI*2);ctx.stroke()}
for(const p of particles){ctx.globalAlpha=Math.max(0,p.life*2);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,3,3)}ctx.globalAlpha=1;
ctx.save();ctx.lineCap='round';
for(const p of flight.trail){ctx.globalAlpha=p.life/p.total*(p.boost?.32:.14);ctx.strokeStyle=p.boost?'#b3ffe5':'#a6d9c9';ctx.lineWidth=p.boost?6:3;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x2,p.y2);ctx.stroke()}
ctx.restore();
if(boostTime>0){ctx.save();ctx.translate(ship.x,ship.y);ctx.strokeStyle='#a6d9c9a0';ctx.lineWidth=1.5;ctx.fillStyle='#a6d9c912';ctx.beginPath();ctx.arc(0,0,27+Math.sin(t*16),0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore()}
if(resumeShield>0){ctx.save();ctx.strokeStyle='#acd9ff';ctx.lineWidth=2;ctx.setLineDash([6,4]);ctx.beginPath();ctx.arc(ship.x,ship.y,28,0,Math.PI*2);ctx.stroke();ctx.restore()}
ctx.save();if(invincible>0&&boostTime<=0)ctx.globalAlpha=.55+Math.sin(t*30)*.25;
drawCraft(ship.x,ship.y,flight.angle,flight.bank,flight.throttle,t);ctx.restore()}



function satellites(x=ship.x,y=ship.y,t=elapsed){
 const level=powers.satellite||0;if(!level)return [];
 const n=level===2?3:2,r=level===2?62:44;
 return Array.from({length:n},(_,i)=>{const a=t*2+i*Math.PI*2/n;return {x:x+Math.cos(a)*r,y:y+Math.sin(a)*r}});
}
function satelliteHit(o,oldX,oldY,dt){
 const before=satellites(oldX,oldY,elapsed-dt);
 return satellites().some((p,i)=>segmentDistance(0,0,before[i].x-(o.prevX??o.x),before[i].y-(o.prevY??o.y),p.x-o.x,p.y-o.y)<(o.r||6)+11);
}
function stepFleet(dt,oldX,oldY){
 for(const p of skillWake)p.life-=dt;skillWake=skillWake.filter(p=>p.life>0);
 if(powers.wake&&boostTime>0&&Math.hypot(ship.x-oldX,ship.y-oldY)>1){
  const tail=skillWake[skillWake.length-1];
  if(tail&&elapsed-tail.born<1/30){tail.x2=ship.x;tail.y2=ship.y}
  else skillWake.push({x:oldX,y:oldY,x2:ship.x,y2:ship.y,born:elapsed,life:powers.wake===2?3.2:1.8});
  skillWake=skillWake.slice(-96);
 }
 if(!skillWake.length)return;
 const range=powers.wake===2?90:60;
 for(const o of [...items.filter(o=>!o.rock&&!o.dead),...shards]){
  let nearest=null,best=range;
  for(const p of skillWake){
   const dx=p.x2-p.x,dy=p.y2-p.y,d=dx*dx+dy*dy;
   const u=d?Math.max(0,Math.min(1,((o.x-p.x)*dx+(o.y-p.y)*dy)/d)):0;
   const x=p.x+u*dx,y=p.y+u*dy,distance=Math.hypot(o.x-x,o.y-y);
   if(distance<best){best=distance;nearest={x,y}}
  }
  if(!nearest)continue;moveToward(o,nearest.x,nearest.y,300,dt);
  if(Math.hypot(o.x-nearest.x,o.y-nearest.y)<12){
   if(o.rock===false){o.dead=true;collectStar(o)}else if(o.age>.14){o.collected=true;collectDust()}
  }
 }
 shards=shards.filter(s=>!s.collected);
}
function drawFleet(){
 ctx.save();ctx.strokeStyle='#ccb3ff';ctx.lineCap='round';ctx.lineWidth=8;
 for(const p of skillWake){ctx.globalAlpha=Math.min(.22,p.life*.16);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x2,p.y2);ctx.stroke()}
 ctx.globalAlpha=1;ctx.fillStyle='#bcffe7';
 for(const p of satellites()){ctx.beginPath();ctx.arc(p.x,p.y,6,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#a6efdc50';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(ship.x,ship.y);ctx.lineTo(p.x,p.y);ctx.stroke()}
 ctx.restore();
}


const stormPlan=[{at:72,kind:'fragments'},{at:78,kind:'wave'},{at:84,kind:'core'}];
const angleGap=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
function stormCaption(){
 if(boss.warning>0)return '星空风暴 · 即将开始 · 生还 +200 / 击破 +600';
 const e=storm?.event;
 if(!e)return `风暴间隙 · 核心 ${boss.hp}/3 · 加速接触可破壳`;
 const label={fragments:'碎星环 · 向绿色扇区移动',wave:'冲击波 · 穿绿色缺口 / 加速越过',core:'核心攻击 · 紫色弹可用加速反射'}[e.kind];
 return (elapsed<e.fire?'预警 · ':'')+label;
}
function stepStorm(dt,oldX,oldY,protectedByBoost){
 if(!storm||!boss||boss.hp<=0)return;
 let e=storm.event;
 if(e&&elapsed>=e.end){items=items.filter(o=>!o.storm);storm.event=null;e=null}
 if(!e&&storm.slot<stormPlan.length&&elapsed>=stormPlan[storm.slot].at){
  const spec=stormPlan[storm.slot++];
  if(elapsed<spec.at+4){
   const x=boss.x/W,y=boss.y/H,gap=Math.atan2(ship.y-boss.y,ship.x-boss.x);
   e=storm.event={kind:spec.kind,x,y,gap,fire:elapsed+1.8,end:elapsed+4,fired:false,radius:32};
  }
 }
 if(!e||elapsed<e.fire)return;
 if(!e.fired){
  e.fired=true;
  if(e.kind!=='wave'){
   const angles=e.kind==='core'?[e.gap-.28,e.gap,e.gap+.28]:Array.from({length:10},(_,i)=>i*Math.PI/5).filter(a=>angleGap(a,e.gap)>.7);
   for(const a of angles)items.push({x:e.x*W,y:e.y*H,dx:Math.cos(a),dy:Math.sin(a),speedScale:e.kind==='core'?.8:.65,r:e.kind==='core'?10:9,rock:true,core:e.kind==='core',storm:true,a:0,age:0});
  }
 }
 if(e.kind==='wave'){
  const previous=e.radius;e.radius=32+(elapsed-e.fire)*Math.hypot(W,H)*.5;
  if(protectedByBoost)return;
  // A moving polyline approximates the ring; the radius sweep prevents tunnelling.
  if(elapsed-dt<e.fire){oldX=ship.x;oldY=ship.y}
  const mid=(previous+e.radius)/2,thickness=shipRadius()+4+Math.abs(e.radius-previous)/2;
  for(let i=0;i<48;i++){
   const a=e.gap+.72+i*(Math.PI*2-1.44)/48,b=e.gap+.72+(i+1)*(Math.PI*2-1.44)/48;
   if(segmentHit(oldX,oldY,ship.x,ship.y,e.x*W+Math.cos(a)*mid,e.y*H+Math.sin(a)*mid,e.x*W+Math.cos(b)*mid,e.y*H+Math.sin(b)*mid,thickness)){damage();break}
  }
 }
}
function drawStorm(){
 const e=storm?.event;if(!e||!boss||boss.hp<=0)return;
 const x=e.x*W,y=e.y*H,warning=elapsed<e.fire;
 ctx.save();ctx.translate(x,y);ctx.lineWidth=warning?2:5;ctx.strokeStyle=e.kind==='core'?'#ddb1ff':'#ffa79b';ctx.globalAlpha=warning?.45:.8;ctx.setLineDash(warning?[5,8]:[]);
 if(e.kind==='wave'){
  const r=warning?48:e.radius;ctx.beginPath();ctx.arc(0,0,r,e.gap+.72,e.gap+Math.PI*2-.72);ctx.stroke();ctx.strokeStyle='#a6efdc';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,r,e.gap-.62,e.gap+.62);ctx.stroke();
 }else if(warning){
  const angles=e.kind==='core'?[e.gap-.28,e.gap,e.gap+.28]:Array.from({length:10},(_,i)=>i*Math.PI/5).filter(a=>angleGap(a,e.gap)>.7);
  for(const a of angles){ctx.beginPath();ctx.moveTo(Math.cos(a)*38,Math.sin(a)*38);ctx.lineTo(Math.cos(a)*Math.hypot(W,H),Math.sin(a)*Math.hypot(W,H));ctx.stroke()}
 }
 if(warning&&e.kind!=='core'){ctx.setLineDash([]);ctx.strokeStyle='#a6efdc';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,66,e.gap-.65,e.gap+.65);ctx.stroke()}
 ctx.restore();
}


function slingRingRoute(angle){
 // Bounce the preview at the arena margins so every ring is reachable on narrow screens.
 let x=ship.x,y=ship.y,dx=Math.cos(angle),dy=Math.sin(angle);const points=[],step=Math.min(W,H)*.16;
 for(let i=0;i<3;i++){
  let nx=x+dx*step,ny=y+dy*step;
  if(nx<35||nx>W-35){dx=-dx;nx=Math.max(35,Math.min(W-35,x+dx*step))}
  if(ny<40||ny>H-40){dy=-dy;ny=Math.max(40,Math.min(H-40,y+dy*step))}
  x=nx;y=ny;points.push({x:x/W,y:y/H});
 }
 return points;
}
function drawNavigation(){
 ctx.save();ctx.strokeStyle='#cdb7ff';ctx.fillStyle='#ddd0ff';ctx.lineWidth=1;ctx.setLineDash([3,7]);ctx.globalAlpha=.45;
 const pts=orbit?slingRingRoute(orbit.angle+orbit.direction*Math.PI/2):objective?.linked?objective.points.slice(objective.index):null;
 if(pts){
  ctx.beginPath();ctx.moveTo(ship.x,ship.y);for(const p of pts)ctx.lineTo(p.x*W,p.y*H);ctx.stroke();
  if(orbit)for(const p of pts){ctx.beginPath();ctx.arc(p.x*W,p.y*H,22,0,Math.PI*2);ctx.stroke()}
 }
 const next=scheduledAdventure(adventureSchedule[adventureSlot],adventureSlot);
 if(!objective&&next&&next.at-elapsed>0&&next.at-elapsed<=2.5){
  ctx.textAlign='center';ctx.font='12px sans-serif';ctx.globalAlpha=.75;
  if(next.kind==='whale'){
   ctx.strokeStyle='#99e9ff';ctx.beginPath();for(let i=0;i<=40;i++){const u=i/40,x=(routeMirror?.88-u*.76:.12+u*.76)*W,y=(.53+Math.sin(u*Math.PI*3)*.14)*H;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();ctx.fillText('星鲸航线即将开启 · 尾流可穿越闸门',W/2,H*.78);
  }else if(next.kind==='mining'||next.sector==='port'){
   ctx.fillText(`${sectors[next.sector].name}即将抵达 · ${sectors[next.sector].note}`,W/2,H*.8);
  }else if(next.kind==='sling'){
   ctx.beginPath();ctx.arc(W*.5,H*.56,Math.min(W,H)*.18,0,Math.PI*2);ctx.stroke();ctx.fillText('引力环即将开启 · 弹射后连穿星环',W/2,H*.82);
  }
 }
 ctx.restore();
}


function clearVirtualInput(){
 if(!directionPointers.size&&stickPointer===null)return;
 const held=[...directionPointers.entries()];directionPointers.clear();
 const stick=stickPointer;stickPointer=null;stickOrigin=null;stickVector={x:0,y:0};
 for(const [id,p] of held){try{p.surface?.releasePointerCapture?.(id)}catch{}}
 if(stick!==null){try{$('joystick').releasePointerCapture(stick)}catch{}}
 $('stickKnob').style.transform='translate(0px,0px)';$('joystick').setAttribute('data-active','false');
 for(const id of Object.keys(directions))$('dir-'+id).setAttribute('data-active','false');
}
function virtualDirection(){
 if(controlMode==='stick')return stickVector;
 let x=0,y=0;for(const p of directionPointers.values()){x+=p.x;y+=p.y}
 return {x,y};
}
function claimVirtual(){inputMode='virtual';mouseX=mouseY=null;launch=null;ship.target=ship.x;ship.targetY=ship.y}
function selectControlMode(mode){
 if(!['drag','stick','dpad'].includes(mode))return;
 clearInput();controlMode=mode;try{localStorage.setItem('mooncatch-controls',mode)}catch{}
 applyControlMode();hud();
}
function applyControlMode(){
 $('touchPad').hidden=controlMode!=='drag';$('joystick').hidden=controlMode!=='stick';$('dpad').hidden=controlMode!=='dpad';
 for(const mode of ['drag','stick','dpad'])$('mode-'+mode).setAttribute('aria-pressed',String(controlMode===mode));
 $('controlsOpen').textContent='操作：'+{drag:'拖动',stick:'摇杆',dpad:'方向键'}[controlMode];
}
function syncDirections(){
 for(const [id,[x,y]] of Object.entries(directions))$('dir-'+id).setAttribute('data-active',String([...directionPointers.values()].some(p=>p.x===x&&p.y===y)));
}
function endDirection(e){
 const held=directionPointers.get(e.pointerId);directionPointers.delete(e.pointerId);
 if(held){try{held.surface.releasePointerCapture?.(e.pointerId)}catch{}ship.target=ship.x;ship.targetY=ship.y}
 syncDirections();
}
for(const [id,[x,y]] of Object.entries(directions)){
 const b=$('dir-'+id);
 b.addEventListener('pointerdown',e=>{
  if(state!=='playing'||panelOpen||controlMode!=='dpad')return;
  e.preventDefault();claimVirtual();directionPointers.set(e.pointerId,{x,y,surface:b});b.setPointerCapture(e.pointerId);syncDirections();
 });
 b.addEventListener('pointermove',e=>{
  if(state!=='playing'||panelOpen||!directionPointers.has(e.pointerId))return;
  e.preventDefault();const box=$('dpad').getBoundingClientRect();
  const dx=Math.max(-1,Math.min(1,Math.floor((e.clientX-box.left)/box.width*3)-1));
  const dy=Math.max(-1,Math.min(1,Math.floor((e.clientY-(box.top||0))/box.height*3)-1));
  directionPointers.set(e.pointerId,{x:dx,y:dy,surface:b});claimVirtual();syncDirections();
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,endDirection);
 b.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat&&state==='playing'&&controlMode==='dpad'&&!panelOpen){e.preventDefault();e.stopPropagation();claimVirtual();directionPointers.set('key-'+id,{x,y,surface:b});syncDirections()}});
 b.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();endDirection({pointerId:'key-'+id})}});
}
function moveStick(e){
 if(state!=='playing'||panelOpen||e.pointerId!==stickPointer||!stickOrigin)return;
 e.preventDefault();const x=e.clientX-stickOrigin.x,y=e.clientY-stickOrigin.y,d=Math.hypot(x,y),radius=36;
 const strength=Math.max(0,Math.min(1,(d/radius-.12)/.88));
 stickVector=d?{x:x/d*strength,y:y/d*strength}:{x:0,y:0};
 const scale=d?Math.min(d,radius)/d:0;$('stickKnob').style.transform=`translate(${x*scale}px,${y*scale}px)`;
 claimVirtual();
}
$('joystick').addEventListener('pointerdown',e=>{
 if(state!=='playing'||panelOpen||controlMode!=='stick'||stickPointer!==null)return;
 e.preventDefault();const box=$('stickRing').getBoundingClientRect();stickOrigin={x:box.left+box.width/2,y:(box.top||0)+box.height/2};stickPointer=e.pointerId;
 $('joystick').setPointerCapture(e.pointerId);$('joystick').setAttribute('data-active','true');moveStick(e);
});
$('joystick').addEventListener('pointermove',moveStick);
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('joystick').addEventListener(type,e=>{if(e.pointerId===stickPointer){clearVirtualInput();ship.target=ship.x;ship.targetY=ship.y}});
function openPanel(kind){
 if(!panelOpen){panelTrigger=kind==='rules'?$('helpOpen'):$('controlsOpen');panelResume=state==='playing';if(panelResume)pause();clearInput();panelOpen=true}
 $('playContent').inert=true;$('gamePanel').hidden=false;
 $('gameRules').hidden=kind!=='rules';$('controlSettings').hidden=kind!=='controls';
 $('panelTitle').textContent=kind==='rules'?'航行手册':'驾驶设置';
 $('panelClose').textContent=panelResume?'继续游戏':'返回游戏';$('panelClose').focus({preventScroll:true});hud();
}
function closePanel(resume=true){
 if(!panelOpen)return;
 const shouldResume=resume&&panelResume&&state==='paused';panelOpen=false;panelResume=false;
 $('playContent').inert=false;$('gamePanel').hidden=true;clearInput();panelTrigger?.focus({preventScroll:true});
 if(shouldResume){resumeSafetyPending=true;pause()}else hud();
}
function prepareLayoutChange(){
 clearInput();if(state==='playing'){pause();resumeSafetyPending=true}
}
function setFocused(value){
 focusMode=value;$('playShell').classList.toggle('immersive',value);document.body.classList.toggle('game-focused',value);
 $('fullscreen').textContent=value?'退出全屏':'全屏';$('fullscreen').setAttribute('aria-pressed',String(value));
}
async function toggleFullscreen(){
 if(fullscreenBusy)return;fullscreenBusy=true;prepareLayoutChange();
 try{
  if(focusMode){
   if(document.fullscreenElement&&document.exitFullscreen){await document.exitFullscreen()}
   nativeScreen=false;setFocused(false);
  }else{
   setFocused(true);
   // CSS immersion remains available on browsers that do not support element fullscreen.
   if($('playShell').requestFullscreen){try{await $('playShell').requestFullscreen({navigationUI:'hide'});nativeScreen=document.fullscreenElement===$('playShell')}catch{}}
  }
 }catch{}finally{fullscreenBusy=false;clearInput();hud()}
}
document.addEventListener('fullscreenchange',()=>{
 if(document.fullscreenElement===$('playShell')){nativeScreen=true;setFocused(true)}
 else if(nativeScreen){nativeScreen=false;prepareLayoutChange();setFocused(false)}
});


function minePhase(m,at=elapsed){
 if(m.dead||at>=70||at<m.born+m.offset)return 'idle';
 const t=(at-m.born-m.offset)%4;return t<1.6?'warning':t<2.3?'active':'idle';
}
const mineRadius=()=>Math.max(28,Math.min(42,Math.min(W,H)*.105));
function breakOre(ore){
 const o=objective;if(o?.kind!=='mining'||ore.dead||!o.ores.includes(ore))return;
 ore.dead=true;oreCount++;score+=Math.round(60*routeReward());collectDust();collectDust();boostCooldown=Math.max(0,boostCooldown-1.5);burst(ore.x,ore.y,'#ffd199');
 adventureResult='矿核已开采 · +60 基础分、2 星屑，充能 1.5 秒';
 if(o.ores.every(c=>c.dead)){score+=120;adventureResult='矿场开采完成 · 额外 +120 分';objective=null}
}
function disarmMine(m){
 if(objective?.kind!=='mining'||m.dead||!objective.mines.includes(m))return;
 m.dead=true;minesCleared++;score+=40;burst(m.x,m.y,'#a6efdc');tone(700,.08);
}
function updateMining(dt,oldX,oldY){
 const o=objective;if(o?.kind!=='mining')return;
 const protectedByBoost=boostTime>0||!!launch;
 for(const m of o.mines){
  if(m.dead)continue;
  if(protectedByBoost&&segmentDistance(m.x,m.y,oldX,oldY,ship.x,ship.y)<=m.r+shipRadius()){disarmMine(m);continue}
  if(minePhase(m)!=='active'||protectedByBoost)continue;
  const newlyActive=minePhase(m,elapsed-dt)!=='active';
  if(segmentDistance(m.x,m.y,newlyActive?ship.x:oldX,newlyActive?ship.y:oldY,ship.x,ship.y)<=mineRadius()+shipRadius()){damage();if(state==='over')return}
 }
 if(protectedByBoost)for(const ore of o.ores)if(!ore.dead&&segmentDistance(ore.x,ore.y,oldX,oldY,ship.x,ship.y)<=ore.r+shipRadius())breakOre(ore);
}
function drawMining(t){
 const o=objective;if(o?.kind!=='mining')return;
 ctx.save();ctx.textAlign='center';ctx.font='10px sans-serif';
 for(const ore of o.ores)if(!ore.dead){ctx.fillStyle='#665232';ctx.strokeStyle='#ffd199';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.lineTo(ore.x+Math.cos(a)*16,ore.y+Math.sin(a)*16)}ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#ffe3a4';star(ore.x,ore.y,8,t*.5);ctx.fillText('矿核',ore.x,ore.y+30)}
 for(const m of o.mines)if(!m.dead){
  const state=minePhase(m),radius=mineRadius(),active=state==='active';
  ctx.strokeStyle=active?'#ff8f9f':state==='warning'?'#ffcd8a':'#768a96';ctx.fillStyle=active?'#ff718c38':'#ffcd8a0a';ctx.lineWidth=active?3:1.5;ctx.setLineDash(state==='warning'?[4,5]:[]);
  ctx.beginPath();ctx.arc(m.x,m.y,radius,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle=active?'#ff8f9f':'#a794a4';ctx.beginPath();ctx.arc(m.x,m.y,9,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=active?'#ffb8c1':state==='warning'?'#ffdda8':'#879ba4';ctx.fillText(active?'脉冲':state==='warning'?'蓄能':'休眠',m.x,m.y+radius+12);
 }
 ctx.restore();
}

function frame(ms){const dt=Math.min((ms-last)/1000,.05);last=ms;if(state==='playing'||state==='menuIntro')update(dt);draw(ms/1000);requestAnimationFrame(frame)}resize();applyHand();applyControlMode();hud();requestAnimationFrame(frame);
