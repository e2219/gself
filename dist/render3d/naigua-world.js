import {naiguaFrames} from './naigua-frames.js';
// Theme-only art: all positions, targets, phases and collision radii are simulation inputs.
export function createNaiguaWorld(T,scene,camera){
 let ready=false,failed=false,dropped=0,meteorSerial=0,pending=0;const meteorVariants=new WeakMap(),dummy=new T.Object3D(),color=new T.Color(),pools={},maps=[],materials=[],geometries=[],sources=new Map();
 function load(file){if(sources.has(file))return sources.get(file);pending++;const m=new T.TextureLoader().load('audio/naigua/'+file,()=>{pending--;ready=pending===0},undefined,()=>{failed=true;pending--});m.colorSpace=T.SRGBColorSpace;sources.set(file,m);return m}
 for(const [name,frame] of Object.entries(naiguaFrames)){
  const texture=load(frame.source||'world.png'),map=texture.clone();map.source=texture.source;maps.push(map);
  let geometry;
  if(frame.outline){const shape=new T.Shape();frame.outline.forEach(([x,y],i)=>shape[i?'lineTo':'moveTo']((x-frame.x)/frame.w-.5,.5-(y-frame.y)/frame.h));shape.closePath();geometry=new T.ShapeGeometry(shape);const pos=geometry.attributes.position,uv=geometry.attributes.uv;for(let i=0;i<pos.count;i++)uv.setXY(i,(frame.x+(pos.getX(i)+.5)*frame.w)/frame.imageW,1-(frame.y+(.5-pos.getY(i))*frame.h)/frame.imageH);uv.needsUpdate=true}
  else{geometry=new T.PlaneGeometry(1,1);map.repeat.set(frame.w/frame.imageW,frame.h/frame.imageH);map.offset.set(frame.x/frame.imageW,1-(frame.y+frame.h)/frame.imageH)}
  geometries.push(geometry);
  const material=new T.MeshBasicMaterial({map,transparent:true,alphaTest:.28,depthWrite:true,toneMapped:false,side:T.DoubleSide});materials.push(material);
  const mesh=new T.InstancedMesh(geometry,material,name==='star'?768:256);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.userData.aspect=frame.w/frame.h;mesh.userData.limit=name==='star'?768:256;pools[name]=mesh;scene.add(mesh);
 }
 function reset(){dropped=0;for(const p of Object.values(pools))p.count=0;if(ready)for(const m of maps)if(!m.userData.ready){m.needsUpdate=true;m.userData.ready=true}}
 function draw(name,x,y,w,h,place,z=10,angle=0,tint=0xffffff){const p=pools[name];if(!p||!ready)return;if(p.count>=p.userData.limit){dropped++;return}const ratio=p.userData.aspect;if(w/h>ratio)w=h*ratio;else h=w/ratio;place(dummy,x,y,z);dummy.quaternion.copy(camera.quaternion);dummy.rotateZ(-angle);dummy.scale.set(w,h,1);dummy.updateMatrix();p.setMatrixAt(p.count,dummy.matrix);p.setColorAt(p.count,color.set(tint));p.count++}
 function render(s,place,line,ring,t,drawMeteor){
  const W=s.W,H=s.H,sh=s.ship,art=(n,x,y,w,h=w,z=10,a=0,c=0xffffff)=>draw(n,x,y,w,h,place,z,a,c);
  const smallStar=(x,y,r=7)=>art('star',x,y,r*2,r*2);
  const portal=(x,y,active=true,c=0xffdc83)=>{art('portal',x,y,61,61,3,0,active?0xffffff:0x78838f);ring(x,y,25,active?c:0x65717a,active?2:1)};
  const port=(x,y)=>{art('station',x,y,90,66,2);ring(x,y,28,0xffd88c,1.5,0,Math.PI*2,false,15)};
  const pod=(x,y,scale=1)=>art('pod',x,y,26*scale,36*scale);
  const crate=(x,y,scale=1)=>art('crate',x,y,26*scale,26*scale);
  for(const o of s.items||[]){if(o.dead)continue;if(o.rock){
    let n=o.trident?'trident':o.boomerang?'boomerang':o.probe?'probe':o.core?'mine':o.splitter?'fireMeteor':null;
    if(!meteorVariants.has(o))meteorVariants.set(o,(meteorSerial++)%2===0);
    if(n)art(n,o.x,o.y,o.r*2,o.r*2,8,o.trident?Math.atan2(o.dy||0,o.dx||1)+Math.PI/2:0);else if(meteorVariants.get(o))art('fireMeteor',o.x,o.y,o.r*2,o.r*2,8);else drawMeteor(o,place);
    if(o.splitter)ring(o.x,o.y,o.r+2,0xffa178,1,0,Math.PI*2,true,12);
    if(o.core)ring(o.x,o.y,o.r+2,0xc49aff,1.8,0,Math.PI*2,false,12);
   }else smallStar(o.x,o.y,o.r*.9);
  }
  for(const p of s.shards||[])smallStar(p.x,p.y,6);
  for(const p of (s.particles||[]).slice(0,128))if(p.life>0)art('star',p.x,p.y,Math.max(2,Math.min(7,p.life*12)),Math.max(2,Math.min(7,p.life*12)),10,0,0xffce79);
  for(const p of s.flight?.trail||[])line(p.x,p.y,p.x2,p.y2,p.boost?0xffd66b:0x9e936c,p.boost?3:1.2,false,2);
  for(const p of s.skillWake||[])line(p.x,p.y,p.x2,p.y2,0xd6a0dd,3,false,0);
  for(const p of s.reflections||[]){smallStar(p.x,p.y,p.r||5);line(p.x-p.dx*24,p.y-p.dy*24,p.x,p.y,0xffe1a0,2)}
  for(const p of s.satellites||[])art('probe',p.x,p.y,18,18);
  for(const p of s.echoes||[]){art('pod',p.x,p.y,22,30,5,0,0xab96d8);ring(p.x,p.y,20,0xc0a3e7,1)}
  for(const p of s.rings||[])ring(p.x,p.y,p.radius*(1-p.life/.4),0xffcf7a,1.5);
  if(s.boostTime>0){const a=s.flight?.angle??-Math.PI/2;for(let k=1;k<=3;k++)smallStar(sh.x-Math.cos(a)*(20+k*9),sh.y-Math.sin(a)*(20+k*9),4-k*.7)}
  const b=s.boss;if(b?.hp>0){const name={classic:'candle',aurora:'water',warp:'knight',ion:'king'}[s.activeWorld]||'candle',cue=s.bossCue||{},charge=cue.warning?Math.max(0,Math.min(1,cue.charge||0)):0;
   art(name,b.x,b.y,b.r*1.95,b.r*1.95,10);
   // Charge marks stay inside the boss footprint; gameplay warnings remain separate.
   if(cue.warning)ring(b.x,b.y,b.r*.83,charge>.65?0xffba66:0xffe1a3,1+charge*2,0,Math.PI*2,false,14);
   if(name==='candle')for(let k=-1;k<=1;k++)smallStar(b.x+k*b.r*.3,b.y-b.r*.12,b.r*(.035+charge*.045));
   if(name==='water')for(let k=0;k<4;k++){const a=k*Math.PI/2+t*.15;ring(b.x+Math.cos(a)*b.r*.68,b.y+Math.sin(a)*b.r*.68,3+charge*2,0x91e7ef,1)}
   if(name==='knight'){smallStar(b.x,b.y-b.r*.77,7);ring(b.x,b.y,b.r*.82,0xba9be3,2,-Math.PI*.75,-Math.PI*.25,false,14)}
   if(name==='king'){ring(b.x-b.r*.5,b.y,8,0xffe6a5,2,0,Math.PI*2,false,14);ring(b.x+b.r*.5,b.y,8,0xc4abff,2,.6,5.3,false,14)}
   for(let i=0;i<(b.maxHp||3);i++)ring(b.x,b.y,b.r+6,i<b.hp?0xe4bd77:0x4e5660,2,-Math.PI/2+i*2*Math.PI/(b.maxHp||3)+.1,-Math.PI/2+(i+1)*2*Math.PI/(b.maxHp||3)-.1);
  }
  const o=s.objective;
  if(o?.kind==='rings')o.points.forEach((p,i)=>{if(i>=o.index)portal(p.x*W,p.y*H,i===o.index)});
  if(o?.kind==='cargo'){port(o.station.x*W,o.station.y*H);for(const p of o.crates||[])if(!p.taken)crate(p.x*W,p.y*H);for(let i=0;i<o.load;i++)crate(sh.x+(i-(o.load-1)/2)*12,sh.y+26,.4)}
  if(o?.kind==='escort'){pod(o.x,o.y,.8);port(o.home.x*W,o.home.y*H);if(o.following)line(o.x,o.y,sh.x,sh.y,0xade6d8,1,true)}
  if(o?.kind==='sling'){const x=o.cx*W,y=o.cy*H,r=Math.min(W,H)*.32,c=Math.max(14,Math.min(23,Math.min(W,H)*.055));art('laser',x,y,c*2,c*2,3,0,0xa38fb6);ring(x,y,r,0x777080,1,0,Math.PI*2,true);for(let k=0;k<3;k++)ring(x,y,c+7+k*5,0xc5a0dd,1.5,t*.3+k,t*.3+k+Math.PI*1.5)}
  if(o?.kind==='whale'){art('whale',o.x*W,o.y*H,75,48,8,o.mirror?Math.PI:0);for(let i=1;i<(o.trail||[]).length;i++)line(o.trail[i-1].x*W,o.trail[i-1].y*H,o.trail[i].x*W,o.trail[i].y*H,0x827348,5,false,-10)}
  if(o?.kind==='mining'){for(const p of o.ores||[])if(!p.dead){art('fireMeteor',p.x,p.y,32,32);smallStar(p.x,p.y-8,6)}for(const p of o.mines||[])if(!p.dead)art('mine',p.x,p.y,22,22)}
  const env=s.environment||{};for(const p of [...(env.wrecks||[]),...(env.shots||[]),...(env.tow?[env.tow]:[])])crate(p.x*W,p.y*H,1.3);for(const p of env.loot||[])if(!p.taken)smallStar(p.x*W,p.y*H,9);
  if(env.tow)line(sh.x,sh.y,env.tow.x*W,env.tow.y*H,0xcabd8d,1.5);
  if(env.gate){const g=env.gate;for(const p of g.points)art('laser',p.x*W,p.y*H,40,40,8,0,g.open?0xa6e5b0:0xffba97);if(!g.claimed)crate(g.cache.x*W,g.cache.y*H,1.2)}
  if(s.station){const q=s.station;art('station',W*.5,H*.52,145,100,2);for(const p of q.cells||[])if(!p.taken){smallStar(p.x*W,p.y*H,11);ring(p.x*W,p.y*H,13,0x9cebc5,1)}if(q.rescue)pod(q.rescue.x*W,q.rescue.y*H);for(let i=0;i<q.hp;i++)ring(W*.5,H*.52,37,0xa4d6bb,2,i*Math.PI/2+.1,(i+1)*Math.PI/2-.1,false,15)}
  if(s.meadow){for(const p of s.meadow.buds||[])if(!p.taken){smallStar(p.x*W,p.y*H,10);ring(p.x*W,p.y*H,17,0x9cdaa4,1)}port(W*.5,H*.7);for(let i=0;i<(s.meadow.garden||[]).length;i++)smallStar(W*(.1+i*.11),H*.2,15)}
  const j=s.researchTrip;if(j){if(j.choice===null&&j.chapter<2)for(const x of [.28,.72])portal(W*x,H*.44,true,x<.5?0x97cdb5:0xb5a1d4);for(const p of j.pods||[])if(!p.taken)pod(p.x*W,p.y*H);if(j.carry)pod(sh.x,sh.y+30,.5);if(j.chapter===2||j.choice===0&&j.chapter===0||j.choice===1&&j.chapter===1)port(W*.82,H*.43)}
  if(s.activeWorld==='ion'&&s.worldEvent){const e=s.worldEvent;for(let i=e.index;i<e.points.length;i++){const p=e.points[i],dark=p.polarity==='dark';portal(p.x*W,p.y*H,i===e.index,dark?0xb4a0d3:0xffe19b);ring(p.x*W,p.y*H,10,dark?0xc6abff:0xffedbc,2,dark?.6:0,dark?5.3:Math.PI*2)}}
  for(const p of s.warpGates||[])portal(p.x*W,p.y*H,true,p.id==='risk'?0xe2a37e:0xa5d6bf);
  for(const [i,p] of(s.warpBeacons||[]).entries())if(i>=(s.worldEvent?.index||0))portal(p.x*W,p.y*H,i===(s.worldEvent?.index||0),0xbca9d4);
  for(const p of s.warpRocks||[])art('fireMeteor',p.x*W,p.y*H,p.r*2,p.r*2);
  for(const p of s.supplyPoints||[])portal(p.x,p.y,p.active!==false,0xffd88a);
  if(s.fork)for(const x of[.25,.75])portal(W*x,H*.48,true,x<.5?0xa7d5be:0xc1accf);
  const bounty=s.bounty;if(bounty&&['beacon','hunt'].includes(bounty.stage)&&(s.elapsed||0)<bounty.until){if(bounty.stage==='hunt')art('trident',bounty.x,bounty.y,48,48);else portal(bounty.x,bounty.y,true,0xe5bd74)}
 }
 return {reset,draw,render,finish(){for(const p of Object.values(pools)){p.instanceMatrix.needsUpdate=true;if(p.instanceColor)p.instanceColor.needsUpdate=true}},diagnostics:()=>({ready,failed,dropped,counts:Object.fromEntries(Object.entries(pools).map(([k,p])=>[k,p.count]))}),dispose(){for(const p of Object.values(pools)){scene.remove(p);p.dispose()}for(const g of geometries)g.dispose();for(const t of sources.values())t.dispose();for(const m of maps)m.dispose();for(const m of materials)m.dispose()}};
}
