const {chromium}=require('@playwright/test');
const fs=require('node:fs'),assert=require('node:assert/strict');
const out=process.env.MOON_EVIDENCE_DIR||'artifacts/boss-refinement';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({channel:'chromium'});try{
 const reports=[],errors=[];
 for(const viewport of [{width:960,height:720},{width:390,height:844}]){
 const context=await browser.newContext({viewport,recordVideo:{dir:out+'/motion',size:viewport}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.MOON_TEST_URL||'http://127.0.0.1:5189')+'/?qa=1');
 for(const world of ['classic','aurora','warp','ion']){
 await page.evaluate(world=>{__THREE_GAME_TEST_HOOKS__.setState(world==='classic'?'active-play':world+'-play');for(let i=0;i<1300&&!storm?.event;i++){invincible=2;update(.05)}__THREE_GAME_TEST_HOOKS__.setPausedForScreenshot(true);},world);
 const report=await page.evaluate(()=>{
 const before=JSON.stringify({boss,storm,ship,hp,elapsed});draw(elapsed);const s=MoonFlight3D.snapshot();
 const unchanged=before===JSON.stringify({boss,storm,ship,hp,elapsed});
 let cuesAligned=true;
 if(activeWorld==='aurora'){
  const e=storm.event,g=irisGeometry(e),distance=Math.hypot(ship.x-g.x,ship.y-g.y),crossing=e.fire+Math.max(0,Math.min(1,(distance-45)/(g.reach-45)))*Math.max(.5,e.end-e.fire)*.9,p=irisGeometry(e,crossing);
  cuesAligned=[p.gap-p.half,p.gap+p.half].every(a=>s.visualLines.some(l=>Math.abs(l.x2-(g.x+Math.cos(a)*g.reach))<.001&&Math.abs(l.y2-(g.y+Math.sin(a)*g.reach))<.001));
  cuesAligned&&=[g.gap-g.half,g.gap+g.half].every(a=>s.visualRings.some(r=>r.r===4&&Math.abs(r.x-(g.x+Math.cos(a)*g.r))<.001&&Math.abs(r.y-(g.y+Math.sin(a)*g.r))<.001));
 }
 return {cuesAligned,world:activeWorld,kind:storm?.event?.kind,warning:s.bossCue?.warning,unchanged,lines:s.visualLines.length,rings:s.visualRings.length,render:MoonFlight3D.view.diagnostics()};});
 assert(report.kind&&report.warning);assert(report.unchanged);assert(report.cuesAligned);assert.equal(report.render.droppedInstances,0);assert(report.render.calls<=150,JSON.stringify(report));
 await page.waitForTimeout(100);await page.screenshot({path:`${out}/${viewport.width}-${world}-charge.png`});reports.push(report);
 // Advance the real simulation through charge and release, retaining protection
 // solely in the test fixture. Animation is recorded in the browser video.
 for(let i=0;i<30;i++){await page.evaluate(()=>{__moonScreenshotPaused=false;invincible=2;update(.1);__moonScreenshotPaused=true;hud();draw(elapsed)});await page.waitForTimeout(35);}
 assert.equal(await page.evaluate(()=>MoonFlight3D.snapshot().bossCue?.warning),false);
 await page.waitForTimeout(100);await page.screenshot({path:`${out}/${viewport.width}-${world}-active.png`});
 }
 await context.close();
 }
 assert.equal(errors.length,0,JSON.stringify(errors));fs.writeFileSync(out+'/report.json',JSON.stringify({reports,errors},null,2));console.log('Four boss models, warning/active animation, snapshot purity and mobile render budgets PASS');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
