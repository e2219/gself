const {chromium}=require('@playwright/test'),assert=require('node:assert/strict'),fs=require('fs');
(async()=>{const browser=await chromium.launch({channel:'chromium'});try{
 const out='artifacts/naigua-world';fs.mkdirSync(out,{recursive:true});const errors=[],reports=[],seen=new Set();
 for(const viewport of [{width:390,height:844},{width:960,height:720}]){
 const context=await browser.newContext({viewport,recordVideo:{dir:out+'/motion',size:viewport}}),page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.MOON_TEST_URL||'http://127.0.0.1:5192/')+'?qa=1&edition=naigua');await page.waitForFunction(()=>window.MoonFlight3D?.view.diagnostics().theme?.world.ready);
 async function capture(name){await page.evaluate(()=>{hud();draw(elapsed)});await page.waitForTimeout(100);const d=await page.evaluate(()=>MoonFlight3D.view.diagnostics());assert.equal(d.legacyObjects,0);assert.equal(d.theme.world.failed,false);assert.equal(d.theme.world.dropped,0);assert.equal(d.droppedInstances,0);assert(d.calls<=150);for(const [n,c]of Object.entries(d.theme.world.counts))if(c)seen.add(n);reports.push({name,viewport,...d});await page.screenshot({path:`${out}/${viewport.width}-${name}.png`});}
 for(const world of ['classic','aurora','warp','ion']){
 await page.evaluate(world=>{__THREE_GAME_TEST_HOOKS__.setState(world==='classic'?'active-play':world+'-play');for(let i=0;i<1500&&!storm?.event;i++){invincible=2;update(.05)}__THREE_GAME_TEST_HOOKS__.setPausedForScreenshot(true);},world);
 assert.equal(await page.evaluate(()=>!!boss&&MoonFlight3D.snapshot().bossCue.warning),true);await capture(world+'-charge');
 const stable=await page.evaluate(()=>{const before=JSON.stringify({boss,storm,ship,hp,elapsed,items});const snap=MoonFlight3D.snapshot(),a=JSON.stringify(snap);MoonFlight3D.view.render(snap,elapsed);return before===JSON.stringify({boss,storm,ship,hp,elapsed,items})&&a===JSON.stringify(snap)});assert(stable,'render must not mutate simulation/snapshot');
 await page.evaluate(()=>{__moonScreenshotPaused=false;for(let i=0;i<100&&MoonFlight3D.snapshot().bossCue.warning;i++){invincible=2;update(.05)}__moonScreenshotPaused=true});await capture(world+'-active');
 }
 for(const state of ['station-play','relax-play','adventure-play','stress-play','laser-charge','laser-active','laser-fade']){await page.evaluate(s=>{__THREE_GAME_TEST_HOOKS__.setState(s);__moonScreenshotPaused=true},state);await capture(state)}
 // Asset inventory fixture: render every remaining simulation family without changing production spawning.
 await page.evaluate(()=>{__THREE_GAME_TEST_HOOKS__.setState('active-play');__moonScreenshotPaused=true;invincible=resumeShield=0;boss=null;storm=null;items=[];for(const [i,kind]of ['probe','boomerang','trident','splitter','core'].entries())items.push({x:W*(.12+i*.18),y:H*.28,r:17,rock:true,[kind]:true,dx:0,dy:1});objective={kind:'mining',deadline:elapsed+20,born:elapsed,ores:[{x:W*.24,y:H*.46}],mines:[{x:W*.75,y:H*.46,born:elapsed,offset:0}]};environment={wrecks:[{x:.2,y:.62}],shots:[],loot:[],pulses:[]};reflections=[{x:W*.65,y:H*.62,r:5,dx:0,dy:1}];echoes=[{x:W*.5,y:H*.72,life:2}];});await capture('hazard-inventory');
 // Direct snapshots verify portal/cargo/whale/rescue forms, and remain unchanged after render.
 for(const [name,objective]of [['rings',{kind:'rings',index:0,deadline:100,points:[{x:.3,y:.4},{x:.7,y:.4}]}],['whale',{kind:'whale',x:.5,y:.45,trail:[]}],['cargo',{kind:'cargo',station:{x:.7,y:.35},crates:[{x:.25,y:.4}],load:2}],['escort',{kind:'escort',x:140,y:230,home:{x:.7,y:.35},following:true}]]){
 await page.evaluate(o=>{objective=o;draw(elapsed)},objective);await capture(name);
 }
 await context.close();
 }
 assert.deepEqual(errors,[]);assert.equal(seen.size,16,'all atlas roles rendered: '+[...seen].join(','));fs.writeFileSync(out+'/report.json',JSON.stringify({errors,roles:[...seen],reports},null,2));console.log('PASS all 16 art roles, four bosses, all modes, laser cues, snapshot purity and zero old model instances');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
