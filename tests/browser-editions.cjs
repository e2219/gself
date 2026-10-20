const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chromium',headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=process.env.MOON_TEST_URL||'http://127.0.0.1:5188/';
 const out=process.env.MOON_EVIDENCE_DIR||'artifacts/editions-browser';fs.mkdirSync(out,{recursive:true});
 await page.goto(base+'?qa=1&edition=3d');await page.locator('#chooseOriginal').waitFor();
 await page.evaluate(()=>localStorage.setItem('mooncatch-best-v6','54321'));
 await page.locator('#chooseOriginal').click();await page.waitForURL(/legacy\/index.html/);await page.locator('#choose3D').waitFor();
 assert.equal(await page.evaluate(()=>window.MooncatchEdition.current),'original');
 assert.equal(await page.evaluate(()=>!!window.Moon3D),false);assert.equal(await page.locator('#sky3d').count(),0);
 assert.equal(await page.evaluate(()=>localStorage.getItem('mooncatch-best-v6')),'54321');
 await page.screenshot({path:out+'/original-home.png'});
 await page.locator('#chooseClassic').click();await page.evaluate(()=>{start(true);});
 await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>state),'playing');
 await page.screenshot({path:out+'/original-flight.png'});
 await page.evaluate(()=>MooncatchSuite.home());await page.locator('#chooseEcho').click();
 const echo=page.frameLocator('#echoFrame');await echo.locator('#boards').waitFor();await page.waitForFunction(()=>!!document.getElementById('echoFrame')?.contentWindow?.MoonEcho&&Array.isArray(document.getElementById('echoFrame').contentWindow.EchoLevels));
 assert.equal(await page.locator('#echoFrame').evaluate(el=>el.contentWindow.EchoLevels.length),30);
 await page.locator('#echoFrame').evaluate(el=>el.contentWindow.MoonEcho.choose(22));
 await page.screenshot({path:out+'/original-puzzle-23.png'});
 await page.evaluate(()=>MooncatchSuite.home());
 await page.locator('#choose3D').click();await page.waitForURL(url=>!url.pathname.includes('/legacy/'));
 await page.locator('#chooseOriginal').waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('mooncatch-best-v6')),'54321');
 // A plain app launch honors the remembered edition; QA URLs remain deterministic.
 await page.locator('#chooseOriginal').click();await page.waitForURL(/legacy\/index.html/);
 await page.goto(base);await page.waitForURL(/legacy\/index.html/);await page.locator('#choose3D').waitFor();
 await page.goto(base+'?qa=1');await page.locator('#chooseOriginal').waitFor();assert.equal(await page.evaluate(()=>MooncatchEdition.current),'3d');
 for(const viewport of [{width:320,height:711},{width:711,height:320}]){
  await page.setViewportSize(viewport);await page.evaluate(()=>MooncatchSuite.home());
  const boxes=await page.locator('#editionChoice button').evaluateAll(els=>els.map(el=>{const b=el.getBoundingClientRect();return {w:b.width,h:b.height,x:b.x,right:b.right}}));
  assert(boxes.every(b=>b.w>=44&&b.h>=44&&b.x>=0&&b.right<=viewport.width));
  await page.screenshot({path:out+`/choice-${viewport.width}.png`});
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/result.json',JSON.stringify({pass:true,errors,checks:['original real flight','original 30 levels and puzzle23','shared records','reversible selection','persisted edition','qa routing','320 portrait and711 landscape']},null,2));
 await browser.close();console.log('PASS original/3D edition switching and shared records');
})().catch(e=>{console.error(e);process.exit(1)});
