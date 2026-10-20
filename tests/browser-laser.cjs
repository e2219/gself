const {chromium}=require('@playwright/test');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const out=process.env.MOON_EVIDENCE_DIR||'artifacts/laser-final';
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chromium'});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},recordVideo:{dir:out+'/motion',size:{width:390,height:844}}});
  const page=await context.newPage(),errors=[],samples=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.MOON_TEST_URL||'http://127.0.0.1:5189')+'/?qa=1');
  await page.evaluate(()=>__THREE_GAME_TEST_HOOKS__.setState('laser-charge'));
  for(let i=0;i<30;i++){
   samples.push(await page.evaluate(()=>{
    const beams=MoonFlight3D.snapshot().visualBeams;
    const expected=laser?laserSegments(laser):[];
    return {elapsed,phase:beams[0]?.phase||'off',progress:beams[0]?.progress,
     aligned:beams.length===expected.length&&beams.every((b,i)=>[b.x1,b.y1,b.x2,b.y2].every((n,k)=>Math.abs(n-expected[i][k])<.001)),
     copy:document.getElementById('obstacleStatus').textContent,render:MoonFlight3D.view.diagnostics()};
   }));
   await page.waitForTimeout(100);
  }
  assert(samples.some(s=>s.phase==='charge'));
  assert(samples.some(s=>s.phase==='active'));
  assert.equal(samples.at(-1).phase,'off');
  assert(samples.every(s=>s.aligned),'Rendered segments must match collision segments, including the open gap');
  assert(samples.every(s=>!/安全通道|安全间隙|走绿色缺口/.test(s.copy)));
  assert(samples.every(s=>s.render.droppedInstances===0&&s.render.calls<=150));
  assert.equal(errors.length,0,JSON.stringify(errors));
  fs.writeFileSync(out+'/phase-report.json',JSON.stringify({errors,samples},null,2));
  await context.close();
  console.log('Laser charge / fire / fade, collision alignment, no route labels, and render budget PASS');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
