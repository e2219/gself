'use strict';
const elements=new Map(),$=id=>{if(!elements.has(id))elements.set(id,document.getElementById(id));return elements.get(id)},canvas=$('sky'),ctx=canvas.getContext('2d');
const phases=[
  {name:'巡航起步',subtitle:'全场自由移动 · 注意四边红色预警',flight:3.1,interval:3.2,hazards:8,multiplier:1},
  {name:'流星雨',subtitle:'交叉来袭 · 速度与频率持续上升',flight:2.5,interval:2.8,hazards:6,multiplier:1},
  {name:'终幕星雨',subtitle:'高压星雨 · 所有星光得分 ×2',flight:2.1,interval:2.4,hazards:4.8,multiplier:2}
];
const COOLDOWN=5,BOOST_TIME=1.2,BOOST_SPEED=2;
let W=960,H=510,state='ready',score=0,combo=0,hp=3,time=90,best=0,elapsed=0,spawn=0,invincible=0,last=0;
let phase=0,wave=0,hazardClock=5,boostTime=0,boostCooldown=0,announcementTime=0;
let items=[],particles=[],pending=[],warnings=[],keys=new Set(),sound=false,audio;
let ship={x:480,y:350,target:480,targetY:350,direction:1};
let hazardWave=0;
const newFlight=()=>({angle:-Math.PI/2,bank:0,throttle:0,trail:[]});
let flight=newFlight();
const upgradeAt=[3,8,15,24];
const powersList=[
 {id:'magnet',name:'磁力月舟',description:['吸引周围 100 像素内的星光与星屑。','吸引范围扩大到 155 像素。']},
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
 const other=recipe.needs.find(p=>p!==id),otherName=powersList.find(p=>p.id===other).name;
 return powers[other]>0?`合成「${recipe.name}」：${recipe.description}`:`搭配${otherName} → ${recipe.name}`;
}
const emptyPowers=()=>Object.fromEntries(powersList.map(p=>[p.id,0]));
let inputMode='keyboard',mouseX=null,mouseY=null,hudSignature='',guard=0,grace=0,boostSerial=0,perfectWindow=0,perfectReady=false,perfectCount=0,slowTime=0,boss=null,bossStarted=false;
let dust=0,upgradeCount=0,powers=emptyPowers(),offers=[],shards=[],echoes=[],rings=[];
let touches=new Map(),movePointer=null,lastTouchX=0,lastTouchY=0,leftHand=false;
try{leftHand=localStorage.getItem('mooncatch-left-hand')==='true'}catch{}
function focusGame(){canvas.focus({preventScroll:true})}
function clearInput(){
 const held=[...touches];touches.clear();movePointer=null;lastTouchX=lastTouchY=0;
 keys.clear();ship.target=ship.x;ship.targetY=ship.y;inputMode='keyboard';mouseX=mouseY=null;flight.throttle=0;flight.trail=[];
 $('touchPad').setAttribute('data-active','false');
 // Release before menus take focus; stale moves from a held finger cannot steer after resume.
 for(const [id,p] of held){try{p.surface?.releasePointerCapture?.(id)}catch{}}
}
function applyHand(){document.querySelector('.game').classList.toggle('controls-left',leftHand);$('touchControls').classList.toggle('controls-left',leftHand);$('hand').textContent='加速键：'+(leftHand?'左侧':'右侧')+' ⇄';$('hand').setAttribute('aria-pressed',String(leftHand))}

try{best=Number(localStorage.getItem('mooncatch-best-v6'))||0}catch{}
$('best').textContent=String(best).padStart(3,'0');
const stars=Array.from({length:75},()=>({x:Math.random(),y:Math.random(),r:Math.random()*1.4+.3,p:Math.random()*6}));
const shipY=()=>ship.y;
const clamp=x=>Math.max(24,Math.min(W-24,x));
const clampY=y=>Math.max(28,Math.min(H-28,y));
const moveKeys=['arrowleft','arrowright','arrowup','arrowdown','a','d','w','s'];
function difficulty(t=elapsed){
 const p=Math.max(0,Math.min(1,t/90));
 return {speed:Math.min(W,H)*(.28+.62*p),interval:1.5-1.08*p,warning:1.15-.4*p,count:1+(p>=.4?1:0)+(p>=.78?1:0),level:1+Math.min(5,Math.floor(p*6))};
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
 const b=canvas.getBoundingClientRect(),ow=W,oh=H;W=b.width;H=b.height;
 const d=Math.min(devicePixelRatio||1,2);canvas.width=W*d;canvas.height=H*d;ctx.setTransform(d,0,0,d,0,0);
 ship.x=clamp(ship.x*W/ow);ship.target=clamp(ship.target*W/ow);ship.y=clampY(ship.y*H/oh);ship.targetY=clampY(ship.targetY*H/oh);
 for(const o of items){o.x*=W/ow;o.y*=H/oh;if(Number.isFinite(o.v))o.v*=H/oh}
 for(const s of shards){s.x*=W/ow;s.y*=H/oh}
 for(const e of echoes){e.x*=W/ow;e.y*=H/oh}
 for(const r of rings){r.x*=W/ow;r.y*=H/oh}
 if(boss){boss.x*=W/ow;boss.y*=H/oh}
 clearInput();
}
new ResizeObserver(resize).observe(canvas);
function tone(f=600,d=.09){if(!sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(f,audio.currentTime);g.gain.setValueAtTime(.045,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+d)}catch{}}
function hud(){
 const signature=[score,Math.ceil(time),hp,guard,combo,phase,state,Math.ceil(boostCooldown*10),boostTime>0,dust,upgradeCount,...powersList.map(p=>powers[p.id]||0),announcementTime>0,boss?.hp,boss?.warning>0,activeWager?.id,Math.ceil(activeWager?.remaining||0),activeWager?.progress,wagerResult,bonusCredits,bonusUpgradeCount,difficulty().level].join('|');
 if(signature===hudSignature)return;hudSignature=signature;
 $('score').textContent=String(score).padStart(3,'0');$('time').innerHTML=Math.ceil(time)+'<span>s</span>';
 $('health').textContent='● '.repeat(hp)+'○ '.repeat(3-hp)+(guard?` +◇${guard}`:'');$('health').setAttribute('aria-label',hp+'点护盾，'+guard+'层护甲');
 $('combo').textContent=combo>=5?`${combo} 连击 · 星光 ×${Math.min(3,1+Math.floor(combo/5))*phases[phase].multiplier}`:'';
 $('pressure').textContent=`威胁 Lv.${difficulty().level} · 四面来袭`;
 $('boost').disabled=state!=='playing'||boostCooldown>0;
 $('padBoost').disabled=$('boost').disabled;
 $('padBoost').setAttribute('data-active',String(boostTime>0));
 $('touchPad').setAttribute('aria-disabled',String(state!=='playing'));
 $('padHint').textContent=state==='playing'?'任意落指 · 滑动驾驶 · 抬手停':state==='ready'?'出发后，在这里滑动驾驶':state==='over'?'本次航行已结束 · 等待再出发':'游戏已暂停 · 继续后重新落指';
 $('boost').setAttribute('data-active',String(boostTime>0));
 $('boostLabel').textContent=boostTime>0?'加速中':boostCooldown>0?`${boostCooldown.toFixed(1)}s`:'加速';
 $('padBoostLabel').textContent=$('boostLabel').textContent;
 $('padCharge').style.transform=`scaleX(${1-boostCooldown/COOLDOWN})`;
 $('dustMeter').textContent=upgradeCount<upgradeAt.length?`✧ 星屑 ${dust} / ${upgradeAt[upgradeCount]}`:`✧ 星屑 ${dust} · 星座已满`;
 $('powers').textContent=powersList.filter(p=>powers[p.id]).map(p=>`${p.name} ${powers[p.id]===2?'Ⅱ':'Ⅰ'}`).join(' · ')||'击碎陨石，点亮你的星座';
 const activeSynergies=synergyList.filter(s=>s.needs.every(p=>powers[p]>0));
 $('synergyBar').textContent=activeSynergies.length?'✧ 已合成：'+activeSynergies.map(s=>s.name).join(' · '):'技能两两搭配，可自动激活星座合成';
 $('wagerStatus').textContent=activeWager?`赌约 · ${activeWager.name} · ${Math.ceil(activeWager.remaining)}s${activeWager.id==='stars'?` · 星光 ${activeWager.progress}/8`:''}`:wagerResult||'星光赌约：18 秒 / 46 秒出现，可自由跳过';
 $('wagerStatus').setAttribute('data-active',String(!!activeWager));
 $('charge').style.transform=`scaleX(${1-boostCooldown/COOLDOWN})`;
 for(let i=0;i<3;i++)$('phase'+i).className=i===phase?'active':i<phase?'done':'';
 $('announcement').style.opacity=announcementTime>0?'1':'0';
 $('bossStatus').hidden=!boss||boss.hp<=0;
 if(boss&&boss.hp>0)$('bossStatus').textContent=boss.warning>0?'月蚀预警 · 可绕开，也可加速破壳':`月蚀巨陨 · 外壳 ${boss.hp}/3 · 每次加速击破一层`;

}
function announce(text){$('announcement').textContent=text;announcementTime=2.4}
function setPhase(n){phase=n;announce(`${phases[n].name}${n===2?' · 得分 ×2':''}`);$('status').textContent=phases[n].subtitle;tone(440+n*170,.2)}
function start(){
 state='playing';score=combo=elapsed=spawn=invincible=boostTime=boostCooldown=wave=0;hp=3;time=90;hazardClock=2;hazardWave=0;
 items=[];particles=[];pending=[];warnings=[];shards=[];echoes=[];rings=[];offers=[];dust=upgradeCount=0;powers=emptyPowers();guard=grace=boostSerial=perfectWindow=perfectCount=slowTime=0;perfectReady=false;boss=null;bossStarted=false;hudSignature='';$('upgrade').hidden=true;$('wager').hidden=true;wagerSlot=wagersWon=wagersFailed=bonusCredits=bonusUpgradeCount=flowProgress=0;wagerOffers=[];activeWager=null;wagerResult='';upgradeSource='dust';clearInput();ship={x:W/2,y:H*.68,target:W/2,targetY:H*.68,direction:1};flight=newFlight();
 $('overlay').hidden=true;$('pause').disabled=false;$('pause').innerHTML='暂停 <kbd>P</kbd>';setPhase(0);hud();focusGame();
}
function show(title,message,button){$('title').textContent=title;$('message').textContent=message;$('start').textContent=button;$('overlay').hidden=false;$('start').focus({preventScroll:true})}
function pause(){
 if(state==='playing'){state='paused';clearInput();$('tag').textContent='TAKE A LITTLE BREATH';show('让宇宙等一会儿。','已暂停。加速充能和预警也会等你回来。','继续旅程 →');$('pause').textContent='继续';$('status').textContent='已暂停'}
 else if(state==='paused'){state='playing';$('overlay').hidden=true;$('pause').innerHTML='暂停 <kbd>P</kbd>';$('status').textContent=phases[phase].subtitle;focusGame()}
 hud();
}
function finish(){
 state='over';clearInput();activeWager=null;$('wager').hidden=true;const record=score>best;if(record){best=score;try{localStorage.setItem('mooncatch-best-v6',String(best))}catch{}$('best').textContent=String(best).padStart(3,'0')}
 $('pause').disabled=true;$('tag').textContent=record?'A NEW PERSONAL RECORD':'EVERY LITTLE LIGHT COUNTS';
 show(hp?'满载星光，返航。':'月舟需要休息了。',`本次 ${score} 分 · 抵达「${phases[phase].name}」${record?' · 新纪录！':' · 本版最佳 '+best+' 分。'}`,'再出发一次 →');
 $('hint').textContent=`收集 ${dust} 颗星屑 · 强化 ${upgradeCount+bonusUpgradeCount} 次 · 赌约 ${wagersWon} 胜 · 完美碎星 ${perfectCount} 次${boss?.hp===0?" · 巨陨已击破":""}`;$('status').textContent=hp?'90 秒旅程完成':'护盾耗尽 · 再试一次';hud();tone(hp?660:180,.25);
}
function boost(){
 if(state!=='playing'||boostCooldown>0)return;
 if(activeWager?.id==='quiet')resolveWager(false);
 if(powers.echo)echoes.push({x:ship.x,y:ship.y,angle:flight.angle,life:powers.echo===2?4:2});
 boostSerial++;perfectWindow=.18;perfectReady=true;if(powers.streak)grace=powers.streak===2?4:2;
 boostTime=BOOST_TIME;boostCooldown=COOLDOWN;burst(ship.x,shipY(),'#a6d9c9');tone(850,.16);hud();
}
$('start').onclick=()=>state==='paused'?pause():start();$('pause').onclick=pause;$('boost').onclick=()=>{boost()};
for(const id of ['boost','padBoost']){
 $(id).onclick=boost;
 $(id).addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();boost()});
}
$('hand').onclick=()=>{clearInput();leftHand=!leftHand;applyHand();try{localStorage.setItem('mooncatch-left-hand',String(leftHand))}catch{}};
$('choice0').onclick=()=>chooseUpgrade(0);$('choice1').onclick=()=>chooseUpgrade(1);
$('wager0').onclick=()=>chooseWager(0);$('wager1').onclick=()=>chooseWager(1);$('wagerSkip').onclick=skipWager;
$('sound').onclick=()=>{sound=!sound;$('sound').textContent='音效：'+(sound?'开':'关');$('sound').setAttribute('aria-pressed',String(sound));tone();if(state==='playing')focusGame()};
window.addEventListener('keydown',e=>{
 const k=e.key.toLowerCase();
 if(state==='wager'){if(!e.repeat){if(k==='1'||k==='2'){e.preventDefault();chooseWager(Number(k)-1)}else if(k==='escape'){e.preventDefault();skipWager()}}return}
 if(state==='upgrade'){if((k==='1'||k==='2')&&!e.repeat){e.preventDefault();chooseUpgrade(Number(k)-1)}return}
 if(k==='p'){e.preventDefault();if(!e.repeat)pause();return}
 if(e.target.tagName==='BUTTON'||e.target.tagName==='A')return;
 if(moveKeys.includes(k)||k===' '){e.preventDefault();if(k===' '){if(!e.repeat)boost()}else{inputMode='keyboard';mouseX=mouseY=null;keys.add(k)}}
});
window.addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys.delete(k);if(moveKeys.includes(k)){ship.target=ship.x;ship.targetY=ship.y}});
window.addEventListener('blur',()=>{clearInput();if(state==='playing')pause()});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause()});
function pointer(e){
 if(state!=='playing')return;
 const p=eventPoint(e),x=clamp(p.x),y=clampY(p.y),gain=boostTime>0?BOOST_SPEED:1;
 if(inputMode!=='pointer'||mouseX===null){ship.target=x;ship.targetY=y}
 else{ship.target=clamp(ship.target+(x-mouseX)*gain);ship.targetY=clampY(ship.targetY+(y-mouseY)*gain)}
 mouseX=x;mouseY=y;inputMode='pointer';
}
function touchDown(e){
 if(state!=='playing')return;
 const surface=e.currentTarget||canvas,isPad=surface===$('touchPad');
 if(e.pointerType!=='touch'&&!isPad){pointer(e);canvas.setPointerCapture(e.pointerId);return}
 e.preventDefault();const p={...eventPoint(e),surface};touches.set(e.pointerId,p);surface.setPointerCapture(e.pointerId);
 if(isPad)$('touchPad').setAttribute('data-active','true');
 if(movePointer===null){inputMode='pointer';mouseX=mouseY=null;movePointer=e.pointerId;lastTouchX=p.x;lastTouchY=p.y;ship.target=ship.x;ship.targetY=ship.y}
 else boost();
}
function touchMove(e){
 if(state!=='playing')return;
 const surface=e.currentTarget||canvas,isPad=surface===$('touchPad');
 if(e.pointerType!=='touch'&&!isPad){if(e.pointerType==='mouse'||e.buttons)pointer(e);return}
 if(!touches.has(e.pointerId))return;
 e.preventDefault();const p={...eventPoint(e),surface};touches.set(e.pointerId,p);if(e.pointerId!==movePointer)return;
 inputMode='pointer';mouseX=mouseY=null;
 const dx=p.x-lastTouchX,dy=p.y-lastTouchY,gain=(boostTime>0?BOOST_SPEED:1)*(isPad?1.65:1);lastTouchX=p.x;lastTouchY=p.y;
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
function offerUpgrade(){
 if(state!=='playing')return;
 const bonus=bonusCredits>0;
 if(!bonus&&(upgradeCount>=upgradeAt.length||dust<upgradeAt[upgradeCount]))return;
 const candidates=powersList.filter(p=>(powers[p.id]||0)<2);
 if(candidates.length<2)return;
 state='upgrade';upgradeSource=bonus?'wager':'dust';clearInput();
 for(let i=candidates.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]]}
 offers=candidates.slice(0,2);
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
 state='paused';$('pause').disabled=false;clearInput();
 show('星座已点亮',`${power.name}已生效。${unlocked.length?"合成「"+unlocked.map(s=>s.name).join("、")+"」！":""}继续后，在触控板任意位置重新落指即可。`,'继续旅程 →');
 $('tag').textContent='CONSTELLATION AWAKENED';$('pause').textContent='继续';$('status').textContent='强化已获得 · 等待继续';hud();
}
function maybeOfferWager(){
 if(state!=='playing'||activeWager||bonusCredits||boostTime>0||wagerSlot>=wagerSchedule.length)return;
 if(elapsed>65){wagerSlot=wagerSchedule.length;return}
 if(elapsed<wagerSchedule[wagerSlot])return;
 wagerSlot++;state='wager';clearInput();
 const pool=[...wagerTypes];for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
 wagerOffers=pool.slice(0,2);
 wagerOffers.forEach((w,i)=>{$('wager'+i).innerHTML=`<em>${i+1} · 10 秒挑战</em><strong>${w.name}</strong><span>${w.description}</span>`});
 $('wager').hidden=false;$('pause').disabled=true;$('wager0').focus({preventScroll:true});hud();
}
function resumeWagerMenu(){
 wagerOffers=[];$('wager').hidden=true;$('pause').disabled=false;clearInput();state='playing';focusGame();hud();
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
 combo++;score+=10*Math.min(3,1+Math.floor(combo/5))*phases[phase].multiplier;
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
function shatter(rock){
 if(rock.dead)return;
 const perfect=claimPerfect(rock.x,rock.y);
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
function collectDust(){dust++;score+=25*phases[phase].multiplier;if(powers.capacitor)boostCooldown=Math.max(0,boostCooldown-(powers.capacitor===2?.45:.25));tone(980,.07)}
function claimPerfect(x,y){
 if(!perfectReady||perfectWindow<=0||boostTime<=0)return false;
 perfectReady=false;perfectCount++;score+=50*phases[phase].multiplier;slowTime=.35;
 announce('完美碎星 · 额外奖励');rings.push({x,y,radius:100,life:.4});tone(1200,.12);return true;
}
function damage(){
 if(invincible>0)return;
 if(guard>0){guard--;invincible=1.1;announce('月辉护甲 · 抵挡成功');burst(ship.x,shipY(),'#bca7f5');if(hasSynergy('nova'))shieldNova();return}
 if(activeWager?.id==='safe')resolveWager(false);
 hp--;combo=0;invincible=1.3;burst(ship.x,shipY(),'#f08c79');tone(130,.18);if(hp<=0)finish();
}
function missStar(){if(powers.streak&&grace>0)grace--;else combo=0}
function moveToward(o,x,y,speed,dt){
 const dx=x-o.x,dy=y-o.y,d=Math.hypot(dx,dy),step=Math.min(d,speed*dt);
 if(d>0){o.x+=dx/d*step;o.y+=dy/d*step}
}
function updateBoss(dt,worldDt,oldX,protectedByBoost,oldY=ship.y){
 if(!bossStarted&&elapsed>=70){bossStarted=true;boss={x:W/2,y:-60,r:40,hp:3,warning:2,lastBoost:-1};announce('月蚀巨陨 · 破壳奖励 600 分')}
 if(!boss||boss.hp<=0)return;
 if(boss.warning>0){boss.warning=Math.max(0,boss.warning-dt);return}
 boss.prevX=boss.x;boss.prevY=boss.y;
 moveToward(boss,W*(.5+Math.sin((elapsed-72)*.55)*.27),H*(.48+Math.sin((elapsed-72)*.72)*.2),Math.min(W,H)*.48,worldDt);
 if(!touchesPath(boss,oldX,oldY,boss.r+16))return;
 if(protectedByBoost){
  if(boss.lastBoost===boostSerial)return;
  boss.lastBoost=boostSerial;boss.hp--;const perfect=claimPerfect(boss.x,boss.y);burst(boss.x,boss.y,'#f3d694');
  if(perfect)for(let i=0;i<2;i++)shards.push({x:boss.x+(i?12:-12),y:boss.y,age:0,life:5,locked:true});
  shards.push({x:boss.x,y:boss.y,age:0,life:5,locked:true});
  announce(boss.hp?`${perfect?'完美破壳':'巨陨破壳'} · 剩余 ${boss.hp} 层`:'月蚀消散 · +600 分');
  if(boss.hp===0){score+=600;for(let i=0;i<6;i++)shards.push({x:boss.x+(i-2.5)*12,y:boss.y,age:0,life:5,locked:true});rings.push({x:boss.x,y:boss.y,radius:170,life:.4})}
 }else damage();
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
  const aimed=Math.random()<.65;
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
 if(state!=='playing')return;
 elapsed+=dt;tickWager();time=Math.max(0,90-elapsed);const next=Math.min(2,Math.floor(elapsed/30));if(next!==phase)setPhase(next);
 announcementTime=Math.max(0,announcementTime-dt);invincible=Math.max(0,invincible-dt);boostCooldown=Math.max(0,boostCooldown-dt);
 const worldDt=dt*(slowTime>0?.4:1);slowTime=Math.max(0,slowTime-dt);
 const oldX=ship.x,oldY=ship.y;
 const dx=Number(keys.has('arrowright')||keys.has('d'))-Number(keys.has('arrowleft')||keys.has('a'));
 const dy=Number(keys.has('arrowdown')||keys.has('s'))-Number(keys.has('arrowup')||keys.has('w'));
 const length=Math.hypot(dx,dy),moveStep=Math.min(W,H)*.9*(boostTime>0?BOOST_SPEED:1)*dt;
 if(length){ship.target=clamp(ship.x+dx/length*moveStep);ship.targetY=clampY(ship.y+dy/length*moveStep)}
 if(inputMode==='pointer'&&!length){ship.x=clamp(ship.target);ship.y=clampY(ship.targetY)}
 else{moveToward(ship,ship.target,ship.targetY,moveStep/(dt||1),dt);ship.x=clamp(ship.x);ship.y=clampY(ship.y)}
 updateFlight(dt,oldX,oldY);
 const protectedByBoost=boostTime>0;boostTime=Math.max(0,boostTime-dt);
 spawn-=dt;if(spawn<=0){starWave();spawn=phases[phase].interval}
 hazardClock-=dt;if(hazardClock<=0){warnWave();hazardClock=difficulty().interval}
 for(let i=warnings.length-1;i>=0;i--){const w=warnings[i];w.remaining-=dt;if(w.remaining<=0){spawnMeteor(w);warnings.splice(i,1)}}
 for(let i=pending.length-1;i>=0;i--){const p=pending[i];p.delay-=dt;if(p.delay<=0){spawnItem(p.x,p.rock);pending.splice(i,1)}}
 const y=shipY();
 for(let i=items.length-1;i>=0;i--){
  const o=items[i];if(o.dead)continue;o.prevX=o.x;o.prevY=o.y;o.a+=dt;o.age=(o.age||0)+dt;
  if(!o.rock&&powers.magnet&&!o.captured){const target=findAttractor(o,powers.magnet===2?155:100);if(target){o.captured=true;o.echoTarget=target.echo}}
  // Captured stars no longer fall: gravity must not balance attraction below the boat.
  if(o.captured)moveToward(o,attractionX(o),attractionY(o),Math.max(500,Math.min(W,H)*1.4),dt);
  else if(o.rock&&o.dx!==undefined){const speed=difficulty().speed*o.speedScale;o.x+=o.dx*speed*worldDt;o.y+=o.dy*speed*worldDt}
  else o.y+=(o.v||0)*worldDt;
  // Relative swept circles catch fast hits from any direction, including diagonal crossings.
  const hit=touchesPath(o,oldX,oldY,o.r+(o.rock?16:24));
  const echoHit=!o.rock&&echoes.some(e=>segmentDistance(e.x,e.y,o.prevX,o.prevY,o.x,o.y)<o.r+22);
  if(hit||echoHit){
   if(o.rock){if(protectedByBoost)shatter(o);else{o.dead=true;damage();if(state==='over')return}}
   else{o.dead=true;collectStar(o)}
  }else if((!o.rock&&o.y>H+20)||o.x<-60||o.x>W+60||o.y<-60||o.y>H+60||o.age>18){o.dead=true;if(!o.rock)missStar()}
 }
 items=items.filter(o=>!o.dead);
 for(let i=shards.length-1;i>=0;i--){
  const s=shards[i];s.age+=dt;s.life-=dt;
  const echo=echoes.find(e=>Math.hypot(s.x-e.x,s.y-e.y)<24);
  const range=powers.magnet===2?175:powers.magnet?140:110;
  if(!s.locked){const target=findAttractor(s,range);if(target){s.locked=true;s.echoTarget=target.echo}}
  if(s.age>.14&&s.locked){moveToward(s,attractionX(s),attractionY(s),Math.max(540,Math.min(W,H)*1.6),dt)}else s.y-=dt*5;
  if(s.age>.14&&(Math.hypot(s.x-ship.x,s.y-y)<=26||echo)){collectDust();shards.splice(i,1)}
  else if(s.life<=0)shards.splice(i,1);
 }
 updateBoss(dt,worldDt,oldX,protectedByBoost,oldY);if(state==='over')return;
 perfectWindow=Math.max(0,perfectWindow-dt);
 for(const e of echoes)e.life-=dt;echoes=echoes.filter(e=>e.life>0);
 for(const r of rings)r.life-=dt;rings=rings.filter(r=>r.life>0);

 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.life<=0)particles.splice(i,1)}
 hud();if(time<=0)finish();else{offerUpgrade();maybeOfferWager()}
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
 const mint=ghost?'#c1aaf0':'#a6efdc';
 // Twin swept fins surround a compact capsule, with the gold moon core at its center.
 if(!ghost&&throttle>.02){
  const flame=(9+throttle*16+(boostTime>0?15:0))*(1+Math.sin(t*36)*.08);
  ctx.fillStyle=boostTime>0?'#b9ffe67a':'#86dac45c';ctx.shadowColor=mint;ctx.shadowBlur=12;
  for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(-11,side*7-3);ctx.quadraticCurveTo(-flame-14,side*7,-11,side*7+3);ctx.fill()}
  ctx.shadowBlur=0;
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
function draw(t){ctx.clearRect(0,0,W,H);const bg=ctx.createRadialGradient(W*.55,H*.25,0,W*.5,H*.5,W*.7);bg.addColorStop(0,['#1c3046','#302640','#3b3040'][phase]);bg.addColorStop(1,'#0a1524');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
for(const s of stars){ctx.globalAlpha=.25+(Math.sin(t*.6+s.p)+1)*.22;ctx.fillStyle='#dde8ec';ctx.beginPath();ctx.arc(s.x*W,s.y*H,s.r,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
ctx.strokeStyle='#adcbd30c';for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(W*.52,H*1.06,W*(.45+i*.15),H*(.55+i*.15),-.12,Math.PI,Math.PI*2);ctx.stroke()}
ctx.fillStyle='#b8cec617';ctx.beginPath();ctx.arc(W*.83,H*.25,30,0,Math.PI*2);ctx.fill();ctx.fillStyle='#17283c';ctx.beginPath();ctx.arc(W*.83+12,H*.25-7,27,0,Math.PI*2);ctx.fill();
for(const w of warnings){
 const v=warningVector(w),x=Math.max(7,Math.min(W-7,v.x)),y=Math.max(7,Math.min(H-7,v.y));
 ctx.save();ctx.globalAlpha=.2+(Math.sin(t*14)+1)*.1;ctx.strokeStyle='#f08c79';ctx.lineWidth=1;ctx.setLineDash([5,9]);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+v.dx*Math.hypot(W,H),y+v.dy*Math.hypot(W,H));ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;ctx.fillStyle='#ff9f83';ctx.beginPath();ctx.arc(x,y,5+3*(1-w.remaining/w.total),0,Math.PI*2);ctx.fill();ctx.restore();
}
for(const o of items){if(o.rock&&o.dx!==undefined){ctx.strokeStyle='#ed8d7d55';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(o.x,o.y);ctx.lineTo(o.x-o.dx*22,o.y-o.dy*22);ctx.stroke()}ctx.fillStyle=o.rock?'#ed8d7d':'#f3d694';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=o.rock?8:17;if(o.rock){ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.a);ctx.beginPath();for(let i=0;i<7;i++){const a=i*Math.PI*2/7,r=o.r*(i%2?.8:1);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.closePath();ctx.fill();ctx.fillStyle='#804e54';ctx.beginPath();ctx.arc(2,-2,3,0,7);ctx.fill();ctx.restore()}else star(o.x,o.y,o.r,o.a);ctx.shadowBlur=0}
if(boss&&boss.hp>0&&boss.warning<=0){ctx.save();ctx.translate(boss.x,boss.y);ctx.rotate(t*.15);ctx.fillStyle='#6d5367';ctx.strokeStyle='#f3b49c';ctx.lineWidth=3;ctx.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5,r=boss.r*(i%2?.87:1);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#f3d694';star(0,0,13,t);for(let i=0;i<boss.hp;i++){ctx.beginPath();ctx.arc(0,0,20+i*6,0,Math.PI*1.6);ctx.stroke()}ctx.restore()}
for(const s of shards){ctx.globalAlpha=Math.min(1,s.life);ctx.fillStyle='#a6ffe0';ctx.shadowColor='#a6ffe0';ctx.shadowBlur=16;star(s.x,s.y,6,t*2);ctx.shadowBlur=0}ctx.globalAlpha=1;
for(const r of rings){ctx.globalAlpha=r.life/.4;ctx.strokeStyle='#a6d9c9';ctx.lineWidth=2;ctx.beginPath();ctx.arc(r.x,r.y,r.radius*(1-r.life/.4),0,Math.PI*2);ctx.stroke()}ctx.globalAlpha=1;
for(const e of echoes){if(hasSynergy('gravity')){ctx.strokeStyle='#bca7f530';ctx.lineWidth=1;ctx.beginPath();ctx.arc(e.x,e.y,powers.magnet===2?130:90,0,Math.PI*2);ctx.stroke()}ctx.save();ctx.globalAlpha=Math.min(.6,e.life);drawCraft(e.x,e.y,e.angle??-Math.PI/2,0,0,t,true);ctx.restore()}
if(powers.magnet){ctx.strokeStyle='#a6d9c918';ctx.lineWidth=1;ctx.beginPath();ctx.arc(ship.x,shipY(),powers.magnet===2?155:100,0,Math.PI*2);ctx.stroke()}
for(const p of particles){ctx.globalAlpha=Math.max(0,p.life*2);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,3,3)}ctx.globalAlpha=1;
ctx.save();ctx.lineCap='round';
for(const p of flight.trail){ctx.globalAlpha=p.life/p.total*(p.boost?.32:.14);ctx.strokeStyle=p.boost?'#b3ffe5':'#a6d9c9';ctx.lineWidth=p.boost?6:3;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x2,p.y2);ctx.stroke()}
ctx.restore();
if(boostTime>0){ctx.save();ctx.translate(ship.x,ship.y);ctx.strokeStyle='#a6d9c9a0';ctx.lineWidth=1.5;ctx.fillStyle='#a6d9c912';ctx.beginPath();ctx.arc(0,0,27+Math.sin(t*16),0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore()}
ctx.save();if(invincible>0&&boostTime<=0)ctx.globalAlpha=.55+Math.sin(t*30)*.25;
drawCraft(ship.x,ship.y,flight.angle,flight.bank,flight.throttle,t);ctx.restore()}


function frame(ms){const dt=Math.min((ms-last)/1000,.05);last=ms;if(state==='playing')update(dt);draw(ms/1000);requestAnimationFrame(frame)}resize();applyHand();hud();requestAnimationFrame(frame);
