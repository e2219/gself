(()=>{'use strict';if(!window.Moon3D)return;
const gl=document.createElement('canvas');gl.id='sky3d';gl.setAttribute('aria-hidden','true');gl.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';canvas.before(gl);canvas.style.position='relative';canvas.style.background='transparent';
let view;try{view=Moon3D.createFlight(gl)}catch(e){gl.remove();console.error('3D renderer unavailable',e);return}
let width=0,height=0,frameCount=0;const lineList=[],ringList=[],beamList=[],labels=[];
const line=(a,color='#dfaa80',width=2,dashed=false)=>lineList.push({x1:a[0],y1:a[1],x2:a[2],y2:a[3],color,width,dashed});
const ring=(x,y,r,color='#edbf81',width=2,start=0,end=Math.PI*2,dashed=false)=>ringList.push({x,y,r,color,width,start,end,dashed});
const label=(x,y,text,color='#d4e5e5')=>labels.push({x,y,text,color});
function beam(a,fire,end,color='#f38c83',charge=1.8){const active=elapsed>=fire;beamList.push({x1:a[0],y1:a[1],x2:a[2],y2:a[3],phase:active?'active':'charge',progress:Math.max(0,Math.min(1,active?(elapsed-fire)/Math.max(.01,end-fire):1-(fire-elapsed)/charge)),remaining:Math.max(0,end-elapsed),color});}
function field(e){const active=elapsed>=e.fire,c=active?'#e88680':'#f1c57e';if(e.kind==='cross')for(const a of crossSegments(e))beam(a,e.fire,e.end,'#f38c83',1.6);else for(const p of e.points||[])ring(p.x*W,p.y*H,Math.min(W,H)*.105,c,active?4:1.5,0,Math.PI*2,!active)}
function snapshot(){lineList.length=ringList.length=beamList.length=labels.length=0;
 for(const f of hazardFields)field(f);
 if(laser)for(const a of laserSegments(laser))beam(a,laser.warningEnd,laser.end);
 if(worldEvent&&activeWorld==='aurora'){const g=auroraGeometry(worldEvent,elapsed),y=elapsed<worldEvent.at+2?H*.24:g.y;for(const a of [[0,y,g.x-g.half,y],[g.x+g.half,y,W,y]])beam(a,worldEvent.at+2,worldEvent.at+7,'#bba2f2',2)}
 const e=storm?.event;if(e&&boss?.hp>0){const warning=elapsed<e.fire,c=warning?'#edc785':'#e998a6';if(e.kind==='lattice')field({...e,kind:'cross',x:e.crossX,y:e.crossY});else if(['iris','polarity'].includes(e.kind)){const g=irisGeometry(e);ring(g.x,g.y,g.r,e.kind==='polarity'?(e.polarity==='dark'?'#b8a1f2':'#9ae5c5'):c,warning?2:5,g.gap+g.half,g.gap+Math.PI*2-g.half,warning);if(e.kind==='polarity')label(g.x,g.y-g.r-14,e.polarity==='dark'?'☾ 暗月':'☀ 明月')}else if(e.kind==='wave'){ring(e.x*W,e.y*H,warning?48:e.radius,c,warning?2:5,e.gap+(e.half??.72),e.gap+Math.PI*2-(e.half??.72),warning)}else if(warning)for(const a of stormAngles(e))line([e.x*W+Math.cos(a)*38,e.y*H+Math.sin(a)*38,e.x*W+Math.cos(a)*Math.hypot(W,H),e.y*H+Math.sin(a)*Math.hypot(W,H)],c,2,true);
 if(activeWorld==='warp'&&['rift','lattice','core'].includes(e.kind)&&!e.used){const g=finaleGate(e);for(const p of [g,g.exit])ring(p.x*W,p.y*H,25,'#b8a4ed',3,0,Math.PI*2,warning);label(g.x*W,g.y*H+42,'加速折跃')}
 }
 for(const p of environment.pulses){const warning=elapsed<p.fire,r=warning?Math.min(W,H)*.25:p.radius;ring(p.x*W,p.y*H,r,warning?'#e6c386':'#e78b80',warning?2:4,p.gap+.7,p.gap+Math.PI*2-.7,warning);ring(p.x*W,p.y*H,r,'#9bdfb7',2,p.gap-.65,p.gap+.65)}
 const eg=environment.gate;if(eg&&!eg.open)line([eg.points[0].x*W,eg.points[0].y*H,eg.points[1].x*W,eg.points[1].y*H],elapsed<eg.armed?'#e2ba78':'#e77985',3,elapsed<eg.armed);
 if(environment.tow)line([ship.x,ship.y,environment.tow.x*W,environment.tow.y*H],'#96d9bc',1.5);
 if(objective?.kind==='mining')for(const m of objective.mines)if(!m.dead){const phase=minePhase(m);ring(m.x,m.y,mineRadius(),phase==='active'?'#f2929d':phase==='warning'?'#eed293':'#77909e',phase==='active'?4:1.5,0,Math.PI*2,phase==='warning');label(m.x,m.y+mineRadius()+12,phase==='active'?'脉冲':phase==='warning'?'蓄能':'休眠')}
 for(const o of items){if(o.boomerang&&!o.dead&&o.worldAge>=.7&&o.worldAge<2.1)line([o.x,o.y,o.x-o.launchDx*Math.hypot(W,H),o.y-o.launchDy*Math.hypot(W,H)],'#d77f9d',1.5,true);if(o.splitter&&!o.dead)for(const d of splitDirections(o))line([o.x,o.y,o.x+d.dx*65,o.y+d.dy*65],'#d9b07c',1,true)}
 if(fork)sectorPairs[forkStage()].forEach((id,i)=>label((i?.75:.25)*W,H*.48+48,sectors[id].name));
 if(objective?.kind==='rings')objective.points.forEach((p,i)=>{if(i>=objective.index)label(p.x*W,p.y*H+42,i===objective.index?'下一航标':String(i+1))});
 if(objective?.kind==='cargo')label(objective.station.x*W,objective.station.y*H+46,'月港 · 交付货箱');
 if(meadow)label(W*.5,H*.7+45,'种星月港 · 带回三颗星种');
 if(researchTrip){if(researchTrip.choice===null&&researchTrip.chapter<2)for(let i=0;i<2;i++)label(W*(i?.72:.28),H*.44+46,researchTrip.chapter===0?(i?'回收档案':'救援研究员'):(i?'残骸运输':'黑洞采能'));if(researchTrip.chapter===2)label(W*.82,H*.43+45,'撤离月港')}
 if(grazeFlash>0)label(ship.x,ship.y-38,'擦肩回充','#a6efdc');
 return {W,H,ship,flight,activeShip,items,particles,shards,echoes,rings,boostTime,invincible,resumeShield,boss,objective,station,worldEvent,activeWorld,elapsed,phase,powers,whaleSafe,environment,researchTrip,meadow,bounty,reflections,skillWake,expedition,fork,moonPhase,
 satellites:satellites(),warningVectors:warnings.map(warningVector),warpGates:activeWorld==='warp'&&worldEvent&&!worldEvent.used?warpGates(worldEvent):[],warpBeacons:activeWorld==='warp'&&worldEvent?.used?warpBeacons(worldEvent):[],warpRocks:activeWorld==='warp'&&worldEvent?.route==='risk'?warpRocks(worldEvent):[],supplyPoints:expedition.chain&&!supplyBusy()?expedition.chain.points.slice(expedition.chain.index).map((p,i)=>({...supplyPoint(p),active:i===0})):[],visualLines:lineList,visualRings:ringList,visualBeams:beamList};
}
const oldDraw=draw;draw=function(t){if(window.MooncatchSuite&&MooncatchSuite.mode!=='classic'||window.MooncatchIsHome?.())return;view.setQuality({dpr:Math.min(pixelDensity(),renderMode==='clear'?2:1.5),shadows:effectiveTier()<2});if(width!==W||height!==H){width=W;height=H;view.resize(W,H)}view.render(snapshot(),window.__moonScreenshotPaused?elapsed:t);ctx.clearRect(0,0,W,H);ctx.save();ctx.textAlign='center';ctx.font='11px system-ui';ctx.lineWidth=3;ctx.strokeStyle='#0b1829';for(const p of labels){ctx.fillStyle=p.color;ctx.strokeText(p.text,p.x,p.y);ctx.fillText(p.text,p.x,p.y)}ctx.restore();drawOverload();frameCount++;};
window.MoonFlight3D={view,snapshot,get frames(){return frameCount},legacyDraw:oldDraw};
if(new URLSearchParams(location.search).get('qa')==='1')window.__THREE_GAME_TEST_HOOKS__={
 setPausedForScreenshot(value){window.__moonScreenshotPaused=!!value;clearInput()},
 setState(name){
  const worldsByState={'active-play':'classic','aurora-play':'aurora','warp-play':'warp','ion-play':'ion','station-play':'station','late-play':'classic','stress-play':'classic','fail':'classic','relax-play':'classic','adventure-play':'classic','laser-charge':'classic','laser-active':'classic','laser-fade':'classic'};
  if(!(name in worldsByState))throw new Error('Unknown flight QA state: '+name);
  MooncatchSuite.select('classic');window.MoonGuide?.close();window.__moonScreenshotPaused=false;state='ready';selectRun(name==='late-play'?'endless':name==='relax-play'?'relax':name==='adventure-play'?'adventure':'timed');selectWorld(worldsByState[name]);start(true);
  if(name==='late-play')legIndex=8;
  const seconds=name==='late-play'?66:name==='adventure-play'?54:18;
  // Advance real systems under a QA-only protection window; no production rules change.
  for(let i=0;i<seconds*20;i++){invincible=2;update(.05)}invincible=0;
  if(name.startsWith('laser-')){objective=null;elapsed=19.95;laser=null;laserSlot=0;const steps=name==='laser-charge'?20:name==='laser-active'?43:59;for(let i=0;i<steps;i++){invincible=2;update(.05)}invincible=0;}
  if(name==='stress-play')for(let i=0;i<100;i++){spawnItem((i%10+.5)/10,i%3!==0);items.at(-1).y=H*(.15+Math.floor(i/10)*.065)}
  if(name==='fail'){hp=0;finish()}hud();draw(elapsed);return {state:name};
 }
};

window.__THREE_GAME_DIAGNOSTICS__={get renderer(){const d=view.diagnostics();return {render:{calls:d.calls,triangles:d.triangles},memory:{geometries:d.geometries,textures:d.textures}}},get state(){return {mode:activeRun,world:activeWorld,state,score,hp,elapsed,player:{x:ship.x,y:ship.y},itemCount:items.length,frames:frameCount,...view.diagnostics()}},physics:{engine:'existing swept 2D collision projected to 3D play plane',timestep:'clamped 50ms maximum'}};
})();
