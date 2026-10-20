const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict'),fs=require('node:fs');
const out=process.env.MOON_EVIDENCE_DIR||'artifacts/lunar-flight';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({channel:'chromium'});try{
 const errors=[],reports=[];
 for(const viewport of [{width:960,height:720},{width:390,height:844}]){
 const context=await browser.newContext({viewport,recordVideo:{dir:out+'/motion',size:viewport}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.MOON_TEST_URL||'http://127.0.0.1:5189')+'/?qa=1&edition=3d');
 for(const shipId of ['collector','falcon','warden']){
 await page.evaluate(id=>{__THREE_GAME_TEST_HOOKS__.setState('active-play');activeShip=id;invincible=0;resumeShield=0;items=[];objective=null;hud();draw(elapsed)},shipId);
 await page.waitForTimeout(150);
 for(const phase of ['bright','dark']){
 if(phase==='dark')await page.keyboard.press('q');
 await page.waitForTimeout(200);
 const d=await page.evaluate(()=>MoonFlight3D.view.diagnostics());assert.equal(d.moonPhase,phase);assert.equal(d.activeModelId,`lunar-${shipId}-${phase}`);assert(d.calls<=150);assert.equal(d.droppedInstances,0);
 await page.screenshot({path:`${out}/${viewport.width}-${shipId}-${phase}.png`});reports.push({viewport,shipId,phase,...d});
 }
 }
 // Existing mode snapshots create real objective/environment state; no mock meshes.
 for(const state of ['aurora-play','warp-play','ion-play','station-play','relax-play','adventure-play','stress-play']){
 await page.evaluate(s=>{__THREE_GAME_TEST_HOOKS__.setState(s);__THREE_GAME_TEST_HOOKS__.setPausedForScreenshot(true)},state);await page.waitForTimeout(100);
 const d=await page.evaluate(()=>MoonFlight3D.view.diagnostics());assert.equal(d.droppedInstances,0);assert(d.calls<=150);
 await page.screenshot({path:`${out}/${viewport.width}-${state}.png`});reports.push({viewport,state,...d});
 }
 await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({errors,reports},null,2));console.log('PASS six ship forms via real phase key, seven modes, mobile render budgets');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
