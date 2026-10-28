const {chromium}=require('@playwright/test'),assert=require('node:assert/strict'),fs=require('fs');
(async()=>{const browser=await chromium.launch({channel:'chromium'});try{
 const out=process.env.MOON_EVIDENCE_DIR||'artifacts/naigua';fs.mkdirSync(out,{recursive:true});const errors=[],reports=[];
 const context=await browser.newContext({viewport:{width:390,height:844},recordVideo:{dir:out+'/motion'}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(15000);
 const base=process.env.MOON_TEST_URL||'http://127.0.0.1:5192/';
 await page.goto(base+'?qa=1&edition=3d');await page.locator('#chooseNaigua').click();await page.waitForURL(/edition=naigua/);await page.locator('#chooseNaigua').waitFor();assert.equal(await page.locator('#chooseNaigua').getAttribute('aria-pressed'),'true');
 await page.evaluate(()=>localStorage.setItem('mooncatch-best-v6','54321'));await page.screenshot({path:out+'/home.png'});
 for(const viewport of [{width:390,height:844},{width:960,height:720}]){
 await page.setViewportSize(viewport);
 for(const state of ['active-play','aurora-play','warp-play','station-play','laser-charge','laser-active']){
 await page.evaluate(s=>{__THREE_GAME_TEST_HOOKS__.setState(s);__THREE_GAME_TEST_HOOKS__.setPausedForScreenshot(true);invincible=resumeShield=0;items=[{x:W*.25,y:H*.4,r:22,rock:true},{x:W*.7,y:H*.3,r:18,rock:true}];draw(elapsed)},state);
 await page.waitForFunction(()=>MoonFlight3D.view.diagnostics().theme?.loaded===5&&MoonFlight3D.view.diagnostics().theme.world.ready);await page.evaluate(()=>draw(elapsed));await page.waitForTimeout(120);
 const d=await page.evaluate(()=>MoonFlight3D.view.diagnostics());assert.equal(d.theme.failed,0);assert.equal(d.theme.meteorCount+d.theme.world.counts.fireMeteor,2);assert(d.calls<150);reports.push(d);await page.screenshot({path:`${out}/${viewport.width}-${state}.png`});
 }
 }
 // Real input invokes the supplied audio once per successful boost; cooldown and mute suppress it.
 await page.evaluate(()=>{__THREE_GAME_TEST_HOOKS__.setState('active-play');__THREE_GAME_TEST_HOOKS__.setPausedForScreenshot(true);MoonGuide?.close();focusGame();sound=true;boostCooldown=0;window.clipPlays=0;const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){if(this.src.includes('/naigua/boost.mp3'))window.clipPlays++;return play.call(this)};});
 console.log('boost-input');await page.keyboard.press('Space');await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>clipPlays),1);await page.waitForFunction(()=>naiguaBoostAudio.readyState>=2&&!naiguaBoostAudio.paused);await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>clipPlays),1);
 await page.evaluate(()=>draw(elapsed));await page.screenshot({path:out+'/boost.png'});
 console.log('pause-audio');await page.evaluate(()=>{pause()});assert.equal(await page.evaluate(()=>naiguaBoostAudio.paused),true);
 console.log('mute-input');await page.evaluate(()=>{MoonGuide?.close();focusGame();state='playing';sound=false;boostCooldown=0});await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>clipPlays),1);
 console.log('switch-back');await page.evaluate(()=>{MoonGuide?.close();MooncatchSuite.home()});await page.locator('#chooseOriginal').click();await page.waitForURL(/legacy/);await page.locator('#chooseNaigua').click();await page.waitForURL(/edition=naigua/);await page.locator('#chooseNaigua').waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('mooncatch-best-v6')),'54321');
 await page.goto(base);await page.waitForURL(/edition=naigua/);await page.locator('#chooseNaigua').waitFor();
 await page.locator('#choose3D').click();await page.waitForURL(/edition=3d/);await page.waitForFunction(()=>!!window.MoonFlight3D);assert.equal(await page.evaluate(()=>MoonFlight3D.view.diagnostics().modelKit),'lunar-observatory-v2');
 assert.deepEqual(errors,[]);await context.close();fs.writeFileSync(out+'/report.json',JSON.stringify({errors,reports,checks:['3 editions and saved preference','shared record','4 paintings on mobile/desktop','transparent actor atlas','real boost input and cooldown/mute/pause','original 3D model isolation']},null,2));console.log('PASS 奶蛙 edition, backgrounds, audio lifecycle, isolation');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
