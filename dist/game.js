'use strict';
const $=id=>document.getElementById(id),canvas=$('sky'),ctx=canvas.getContext('2d');
const phases=[
  {name:'平静夜空',subtitle:'循着星阵，找到节奏',flight:3.1,interval:3.2,hazards:8,multiplier:1},
  {name:'流星雨',subtitle:'留意红色预警 · 冲刺穿越陨石',flight:2.5,interval:2.8,hazards:6,multiplier:1},
  {name:'最后冲刺',subtitle:'所有星光得分 ×2',flight:2.1,interval:2.4,hazards:4.8,multiplier:2}
];
const COOLDOWN=5,DASH_TIME=.65,MOVE_TIME=.24;
let W=960,H=510,state='ready',score=0,combo=0,hp=3,time=90,best=0,elapsed=0,spawn=0,invincible=0,last=0;
let phase=0,wave=0,hazardClock=5,dashTime=0,dashCooldown=0,dashDirection=1,announcementTime=0;
let items=[],particles=[],pending=[],warnings=[],keys=new Set(),sound=false,audio;
let ship={x:480,target:480,direction:1};
const upgradeAt=[3,8,15];
const powersList=[
 {id:'magnet',name:'磁力月舟',description:['吸引周围 100 像素内的星光与星屑。','吸引范围扩大到 155 像素。']},
 {id:'echo',name:'冲刺分身',description:['冲刺出发点留下分身，代接星光与星屑 2 秒。','分身持续 4 秒，守住错过的星光。']},
 {id:'chain',name:'碎星连爆',description:['击碎陨石时，连锁击碎 85 像素内的陨石。','连爆范围扩大到 125 像素。']}
];
let dust=0,upgradeCount=0,powers={magnet:0,echo:0,chain:0},offers=[],shards=[],echoes=[],rings=[];
let touches=new Map(),movePointer=null,lastTouchX=0,leftHand=false;
try{leftHand=localStorage.getItem('mooncatch-left-hand')==='true'}catch{}
function focusGame(){canvas.focus({preventScroll:true})}
function clearInput(){keys.clear();touches.clear();movePointer=null}
function applyHand(){document.querySelector('.game').classList.toggle('controls-left',leftHand);$('hand').textContent='冲刺键：'+(leftHand?'左侧':'右侧')+' ⇄';$('hand').setAttribute('aria-pressed',String(leftHand))}

try{best=Number(localStorage.getItem('mooncatch-best-v3'))||0}catch{}
$('best').textContent=String(best).padStart(3,'0');
const stars=Array.from({length:75},()=>({x:Math.random(),y:Math.random(),r:Math.random()*1.4+.3,p:Math.random()*6}));
const shipY=()=>H-112;
const clamp=x=>Math.max(24,Math.min(W-24,x));
function resize(){
 const b=canvas.getBoundingClientRect(),ow=W,oh=H;W=b.width;H=b.height;
 const d=Math.min(devicePixelRatio||1,2);canvas.width=W*d;canvas.height=H*d;ctx.setTransform(d,0,0,d,0,0);
 ship.x=clamp(ship.x*W/ow);ship.target=clamp(ship.target*W/ow);
 for(const o of items){o.x*=W/ow;o.y*=H/oh;o.v*=H/oh}
 for(const s of shards){s.x*=W/ow;s.y*=H/oh}
 for(const e of echoes)e.x*=W/ow;
 for(const r of rings){r.x*=W/ow;r.y*=H/oh}
 clearInput();
}
new ResizeObserver(resize).observe(canvas);
function tone(f=600,d=.09){if(!sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(f,audio.currentTime);g.gain.setValueAtTime(.045,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+d)}catch{}}
function hud(){
 $('score').textContent=String(score).padStart(3,'0');$('time').innerHTML=Math.ceil(time)+'<span>s</span>';
 $('health').textContent='● '.repeat(hp)+'○ '.repeat(3-hp);$('health').setAttribute('aria-label',hp+'点护盾');
 $('combo').textContent=combo>=5?`${combo} 连击 · 星光 ×${Math.min(3,1+Math.floor(combo/5))*phases[phase].multiplier}`:'';
 $('dash').disabled=state!=='playing'||dashCooldown>0;
 $('dashLabel').textContent=dashTime>0?'无敌':dashCooldown>0?`${dashCooldown.toFixed(1)}s`:'冲刺';
 $('dustMeter').textContent=upgradeCount<3?`✧ 星屑 ${dust} / ${upgradeAt[upgradeCount]}`:`✧ 星屑 ${dust} · 星座已满`;
 $('powers').textContent=powersList.filter(p=>powers[p.id]).map(p=>`${p.name} ${powers[p.id]===2?'Ⅱ':'Ⅰ'}`).join(' · ')||'击碎陨石，点亮你的星座';
 $('charge').style.transform=`scaleX(${1-dashCooldown/COOLDOWN})`;
 for(let i=0;i<3;i++)$('phase'+i).className=i===phase?'active':i<phase?'done':'';
 $('announcement').style.opacity=announcementTime>0?'1':'0';
}
function announce(text){$('announcement').textContent=text;announcementTime=2.4}
function setPhase(n){phase=n;announce(`${phases[n].name}${n===2?' · 得分 ×2':''}`);$('status').textContent=phases[n].subtitle;tone(440+n*170,.2)}
function start(){
 state='playing';score=combo=elapsed=spawn=invincible=dashTime=dashCooldown=wave=0;hp=3;time=90;hazardClock=5;
 items=[];particles=[];pending=[];warnings=[];shards=[];echoes=[];rings=[];offers=[];dust=upgradeCount=0;powers={magnet:0,echo:0,chain:0};$('upgrade').hidden=true;clearInput();ship={x:W/2,target:W/2,direction:1};
 $('overlay').hidden=true;$('pause').disabled=false;$('pause').innerHTML='暂停 <kbd>P</kbd>';setPhase(0);hud();focusGame();
}
function show(title,message,button){$('title').textContent=title;$('message').textContent=message;$('start').textContent=button;$('overlay').hidden=false;$('start').focus()}
function pause(){
 if(state==='playing'){state='paused';clearInput();$('tag').textContent='TAKE A LITTLE BREATH';show('让宇宙等一会儿。','已暂停。冲刺充能和预警也会等你回来。','继续旅程 →');$('pause').textContent='继续';$('status').textContent='已暂停'}
 else if(state==='paused'){state='playing';$('overlay').hidden=true;$('pause').innerHTML='暂停 <kbd>P</kbd>';$('status').textContent=phases[phase].subtitle;focusGame()}
 hud();
}
function finish(){
 state='over';const record=score>best;if(record){best=score;try{localStorage.setItem('mooncatch-best-v3',String(best))}catch{}$('best').textContent=String(best).padStart(3,'0')}
 $('pause').disabled=true;$('tag').textContent=record?'A NEW PERSONAL RECORD':'EVERY LITTLE LIGHT COUNTS';
 show(hp?'满载星光，返航。':'月舟需要休息了。',`本次 ${score} 分 · 抵达「${phases[phase].name}」${record?' · 新纪录！':' · 本版最佳 '+best+' 分。'}`,'再出发一次 →');
 $('hint').textContent=`收集 ${dust} 颗星屑 · 获得 ${upgradeCount} 次星座强化`;$('status').textContent=hp?'90 秒旅程完成':'护盾耗尽 · 再试一次';hud();tone(hp?660:180,.25);
}
function dash(){
 if(state!=='playing'||dashCooldown>0)return;
 const dir=Number(keys.has('arrowright')||keys.has('d'))-Number(keys.has('arrowleft')||keys.has('a'));
 dashDirection=dir||ship.direction;if(ship.x<30&&dashDirection<0)dashDirection=1;if(ship.x>W-30&&dashDirection>0)dashDirection=-1;
 if(powers.echo)echoes.push({x:ship.x,life:powers.echo===2?4:2});
 dashTime=DASH_TIME;dashCooldown=COOLDOWN;burst(ship.x,shipY(),'#a6d9c9');tone(850,.16);hud();
}
$('start').onclick=()=>state==='paused'?pause():start();$('pause').onclick=pause;$('dash').onclick=()=>{dash()};
$('dash').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();dash()});
$('hand').onclick=()=>{leftHand=!leftHand;applyHand();try{localStorage.setItem('mooncatch-left-hand',String(leftHand))}catch{}};
$('choice0').onclick=()=>chooseUpgrade(0);$('choice1').onclick=()=>chooseUpgrade(1);
$('sound').onclick=()=>{sound=!sound;$('sound').textContent='音效：'+(sound?'开':'关');$('sound').setAttribute('aria-pressed',String(sound));tone();if(state==='playing')focusGame()};
window.addEventListener('keydown',e=>{
 const k=e.key.toLowerCase();
 if(state==='upgrade'){if((k==='1'||k==='2')&&!e.repeat){e.preventDefault();chooseUpgrade(Number(k)-1)}return}
 if(k==='p'){e.preventDefault();if(!e.repeat)pause();return}
 if(e.target.tagName==='BUTTON'||e.target.tagName==='A')return;
 if(['arrowleft','arrowright','a','d',' '].includes(k)){e.preventDefault();if(k===' '){if(!e.repeat)dash()}else keys.add(k)}
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{clearInput();if(state==='playing')pause()});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause()});
function pointer(e){const target=clamp(e.clientX-canvas.getBoundingClientRect().left);if(Math.abs(target-ship.x)>4)ship.direction=Math.sign(target-ship.x);ship.target=target}
function touchDown(e){
 if(state!=='playing')return;
 if(e.pointerType!=='touch'){pointer(e);canvas.setPointerCapture(e.pointerId);return}
 e.preventDefault();touches.set(e.pointerId,e.clientX);canvas.setPointerCapture(e.pointerId);
 if(movePointer===null){movePointer=e.pointerId;lastTouchX=e.clientX}
 else dash();
}
function touchMove(e){
 if(state!=='playing')return;
 if(e.pointerType!=='touch'){if(e.pointerType==='mouse'||e.buttons)pointer(e);return}
 if(!touches.has(e.pointerId))return;
 touches.set(e.pointerId,e.clientX);
 if(e.pointerId!==movePointer)return;
 const delta=e.clientX-lastTouchX;lastTouchX=e.clientX;
 if(Math.abs(delta)>.5)ship.direction=Math.sign(delta);
 // Relative dragging lets the thumb stay away from the ship and avoids a jump on touch-down.
 ship.target=clamp(ship.target+delta);
}
function touchEnd(e){touches.delete(e.pointerId);if(movePointer===e.pointerId){const next=touches.entries().next();movePointer=next.done?null:next.value[0];if(!next.done)lastTouchX=next.value[1]}}
canvas.addEventListener('pointerdown',touchDown);
canvas.addEventListener('pointermove',touchMove);
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,touchEnd);
function offerUpgrade(){
 if(state!=='playing'||upgradeCount>=3||dust<upgradeAt[upgradeCount])return;
 state='upgrade';clearInput();
 const candidates=powersList.filter(p=>powers[p.id]<2);
 // Shuffle once per offer, with two distinct, non-maxed abilities.
 for(let i=candidates.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]]}
 offers=candidates.slice(0,2);
 $('upgradeHint').textContent=`第 ${upgradeCount+1} / 3 次强化 · 时间与冷却已暂停`;
 offers.forEach((p,i)=>{$('choice'+i).innerHTML=`<em>${i+1} · ${powers[p.id]?'进阶强化':'获得能力'}</em><strong>${p.name} ${powers[p.id]?'Ⅱ':'Ⅰ'}</strong><span>${p.description[powers[p.id]]}</span>`});
 $('upgrade').hidden=false;$('pause').disabled=true;$('choice0').focus({preventScroll:true});hud();
}
function chooseUpgrade(i){
 if(state!=='upgrade'||!offers[i])return;
 const power=offers[i];powers[power.id]++;upgradeCount++;offers=[];$('upgrade').hidden=true;
 // Resume through an explicit button, avoiding movement when returning from a hidden tab.
 state='paused';$('pause').disabled=false;clearInput();
 show('星座已点亮',`${power.name}已生效。准备好后继续旅程。`,'继续旅程 →');
 $('tag').textContent='CONSTELLATION AWAKENED';$('pause').textContent='继续';$('status').textContent='强化已获得 · 等待继续';hud();
}
function shatter(rock){
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
function collectDust(){dust++;score+=25*phases[phase].multiplier;tone(980,.07)}
function burst(x,y,color){for(let i=0;i<12;i++)particles.push({x,y,vx:(Math.random()-.5)*150,vy:(Math.random()-.5)*150,life:.5,color})}
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
function warnWave(){
 // One or two broad safe lanes always remain; the warning lasts 1.3 seconds.
 const lane=wave%3,lanes=phase===2?[lane,(lane+1)%3]:[lane];
 for(const l of lanes)warnings.push({left:l/3+.025,right:(l+1)/3-.025,remaining:1.3});
}
function spawnItem(x,rock){items.push({x:clamp(x*W),y:-16,r:rock?12:9,v:(H-55)/phases[phase].flight*(rock?1.13:1),rock,a:Math.random()*6})}
function update(dt){
 if(state!=='playing')return;
 elapsed+=dt;time=Math.max(0,90-elapsed);const next=Math.min(2,Math.floor(elapsed/30));if(next!==phase)setPhase(next);
 announcementTime=Math.max(0,announcementTime-dt);invincible=Math.max(0,invincible-dt);dashCooldown=Math.max(0,dashCooldown-dt);
 const oldX=ship.x,dir=Number(keys.has('arrowright')||keys.has('d'))-Number(keys.has('arrowleft')||keys.has('a'));
 if(dashTime>DASH_TIME-MOVE_TIME){ship.x=clamp(ship.x+dashDirection*W*1.45*dt);ship.target=ship.x}
 else {if(dir){ship.direction=dir;ship.target=clamp(ship.target+dir*W*.85*dt)}ship.x+=(ship.target-ship.x)*Math.min(1,dt*18)}
 const protectedByDash=dashTime>0;dashTime=Math.max(0,dashTime-dt);
 spawn-=dt;if(spawn<=0){starWave();spawn=phases[phase].interval}
 hazardClock-=dt;if(hazardClock<=0){warnWave();hazardClock=phases[phase].hazards}
 for(let i=warnings.length-1;i>=0;i--){const w=warnings[i];w.remaining-=dt;if(w.remaining<=0){const count=Math.max(2,Math.ceil((w.right-w.left)*W/38));for(let j=0;j<count;j++)spawnItem(w.left+(w.right-w.left)*j/(count-1),true);warnings.splice(i,1)}}
 for(let i=pending.length-1;i>=0;i--){const p=pending[i];p.delay-=dt;if(p.delay<=0){spawnItem(p.x,p.rock);pending.splice(i,1)}}
 const y=shipY();
 for(let i=items.length-1;i>=0;i--){
  const o=items[i];if(o.dead)continue;o.y+=o.v*dt;o.a+=dt;
  if(!o.rock&&powers.magnet){const range=powers.magnet===2?155:100;if(Math.hypot(o.x-ship.x,o.y-y)<range){o.x+=(ship.x-o.x)*Math.min(1,dt*6);o.y+=(y-o.y)*Math.min(1,dt*6)}}
  // Swept horizontal collision catches stars crossed during a fast dash.
  const hit=o.x>=Math.min(oldX,ship.x)-o.r-18&&o.x<=Math.max(oldX,ship.x)+o.r+18&&Math.abs(o.y-y)<o.r+10;
  const echoHit=!o.rock&&echoes.some(e=>Math.abs(o.x-e.x)<o.r+20&&Math.abs(o.y-y)<o.r+10);
  if(hit||echoHit){
   if(o.rock){if(protectedByDash)shatter(o);else{o.dead=true;if(invincible<=0){hp--;combo=0;invincible=1.3;burst(ship.x,y,'#f08c79');tone(130,.18);if(!hp){finish();return}}}}
   else{o.dead=true;combo++;score+=10*Math.min(3,1+Math.floor(combo/5))*phases[phase].multiplier;burst(o.x,o.y,'#f3d694');tone(520+Math.min(combo,12)*35)}
  }else if(o.y>H+20){o.dead=true;if(!o.rock)combo=0}
 }
 items=items.filter(o=>!o.dead);
 for(let i=shards.length-1;i>=0;i--){
  const s=shards[i];s.age+=dt;s.life-=dt;
  const echo=echoes.find(e=>Math.hypot(s.x-e.x,s.y-y)<24);
  const distance=Math.hypot(s.x-ship.x,s.y-y),range=powers.magnet===2?175:powers.magnet?140:110;
  if(distance<range)s.locked=true;
  if(s.age>.14&&s.locked){s.x+=(ship.x-s.x)*Math.min(1,dt*10);s.y+=(y-s.y)*Math.min(1,dt*10)}else s.y-=dt*5;
  if(s.age>.14&&(Math.hypot(s.x-ship.x,s.y-y)<22||echo)){collectDust();shards.splice(i,1)}
  else if(s.life<=0)shards.splice(i,1);
 }
 for(const e of echoes)e.life-=dt;echoes=echoes.filter(e=>e.life>0);
 for(const r of rings)r.life-=dt;rings=rings.filter(r=>r.life>0);

 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.life<=0)particles.splice(i,1)}
 hud();if(time<=0)finish();else offerUpgrade();
}
function star(x,y,r,a){ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.beginPath();for(let i=0;i<8;i++){const t=i*Math.PI/4,rr=i%2?r*.35:r;ctx.lineTo(Math.cos(t)*rr,Math.sin(t)*rr)}ctx.closePath();ctx.fill();ctx.restore()}
function draw(t){ctx.clearRect(0,0,W,H);const bg=ctx.createRadialGradient(W*.55,H*.25,0,W*.5,H*.5,W*.7);bg.addColorStop(0,['#1c3046','#302640','#3b3040'][phase]);bg.addColorStop(1,'#0a1524');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
for(const s of stars){ctx.globalAlpha=.25+(Math.sin(t*.6+s.p)+1)*.22;ctx.fillStyle='#dde8ec';ctx.beginPath();ctx.arc(s.x*W,s.y*H,s.r,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
ctx.strokeStyle='#adcbd30c';for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(W*.52,H*1.06,W*(.45+i*.15),H*(.55+i*.15),-.12,Math.PI,Math.PI*2);ctx.stroke()}
ctx.fillStyle='#b8cec617';ctx.beginPath();ctx.arc(W*.83,H*.25,30,0,Math.PI*2);ctx.fill();ctx.fillStyle='#17283c';ctx.beginPath();ctx.arc(W*.83+12,H*.25-7,27,0,Math.PI*2);ctx.fill();
for(const w of warnings){
 const x=w.left*W,width=(w.right-w.left)*W;
 ctx.fillStyle=`rgba(240,140,121,${.07+(Math.sin(t*12)+1)*.035})`;ctx.fillRect(x,92,width,H-125);
 ctx.fillStyle='#f08c79';ctx.font='10px system-ui';ctx.textAlign='center';ctx.fillText('▼ 陨石来袭',x+width/2,112);
 ctx.fillRect(x,92,width*Math.max(0,w.remaining/1.3),2);
}
for(const o of items){ctx.fillStyle=o.rock?'#ed8d7d':'#f3d694';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=o.rock?8:17;if(o.rock){ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.a);ctx.beginPath();for(let i=0;i<7;i++){const a=i*Math.PI*2/7,r=o.r*(i%2?.8:1);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.closePath();ctx.fill();ctx.fillStyle='#804e54';ctx.beginPath();ctx.arc(2,-2,3,0,7);ctx.fill();ctx.restore()}else star(o.x,o.y,o.r,o.a);ctx.shadowBlur=0}
for(const s of shards){ctx.globalAlpha=Math.min(1,s.life);ctx.fillStyle='#a6ffe0';ctx.shadowColor='#a6ffe0';ctx.shadowBlur=16;star(s.x,s.y,6,t*2);ctx.shadowBlur=0}ctx.globalAlpha=1;
for(const r of rings){ctx.globalAlpha=r.life/.4;ctx.strokeStyle='#a6d9c9';ctx.lineWidth=2;ctx.beginPath();ctx.arc(r.x,r.y,r.radius*(1-r.life/.4),0,Math.PI*2);ctx.stroke()}ctx.globalAlpha=1;
for(const e of echoes){ctx.save();ctx.translate(e.x,shipY());ctx.globalAlpha=Math.min(.6,e.life);ctx.strokeStyle='#bca7f5';ctx.fillStyle='#bca7f5';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-23,-7);ctx.quadraticCurveTo(0,22,23,-7);ctx.quadraticCurveTo(0,5,-23,-7);ctx.stroke();star(0,-6,5,t);ctx.restore()}
if(powers.magnet){ctx.strokeStyle='#a6d9c920';ctx.lineWidth=1;ctx.beginPath();ctx.arc(ship.x,shipY(),powers.magnet===2?155:100,Math.PI,Math.PI*2);ctx.stroke()}
for(const p of particles){ctx.globalAlpha=Math.max(0,p.life*2);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,3,3)}ctx.globalAlpha=1;
ctx.save();ctx.translate(ship.x,shipY());if(dashTime>0){ctx.strokeStyle='#a6d9c9';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,33,22,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#a6d9c925';ctx.fill();for(let k=1;k<5;k++){ctx.globalAlpha=(5-k)*.1;ctx.fillRect(-dashDirection*k*14-10,-3,18,4)}ctx.globalAlpha=1}if(invincible>0&&dashTime<=0)ctx.globalAlpha=.4+Math.sin(t*30)*.3;ctx.shadowColor='#a6d9c9';ctx.shadowBlur=18;ctx.strokeStyle='#afdccd';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-23,-7);ctx.quadraticCurveTo(0,22,23,-7);ctx.quadraticCurveTo(0,5,-23,-7);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#f3d694';star(0,-5,5,t*.25);ctx.strokeStyle='#a6d9c925';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(0,15,30,4,0,0,Math.PI*2);ctx.stroke();ctx.restore()}

function frame(ms){const dt=Math.min((ms-last)/1000,.05);last=ms;if(state==='playing')update(dt);draw(ms/1000);requestAnimationFrame(frame)}resize();applyHand();hud();requestAnimationFrame(frame);
