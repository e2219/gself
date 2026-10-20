const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const dir='mobile/www/legacy/';
const html=fs.readFileSync(dir+'index.html','utf8');
assert(html.includes('<script src="../bootstrap.js"></script>'));assert(!/src="(?:game|game-suite|profile-ui|flight-bridge|scene3d)\.js/.test(html));
const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://localhost/legacy/index.html?edition=original'}),w=dom.window;
const noop=()=>{},ctx=new Proxy({createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
w.HTMLCanvasElement.prototype.getContext=()=>ctx;w.HTMLElement.prototype.getBoundingClientRect=()=>({width:390,height:844,left:0,top:0});w.ResizeObserver=class{observe(){}};w.requestAnimationFrame=noop;
const calls=[];w.MooncatchNative={files:{setAwake:async v=>calls.push(v),getInsets:async()=>({top:24,bottom:0,left:0,right:0})},App:{exitApp:async()=>calls.push('exit')}};w.MooncatchSaveChanged=async()=>calls.push('save');
const run=s=>vm.runInContext(s,dom.getInternalVMContext()),el=id=>w.document.getElementById(id);
for(const file of ['profile-data.js','game.js','profile-ui.js','native-runtime.js','game-suite.js'])run(fs.readFileSync(dir+file,'utf8'));
(async()=>{
 assert.equal(w.MooncatchSuite.mode,'home');w.MooncatchSuite.select('classic');assert(w.MooncatchIsHome());el('nativeStart').click();assert.equal(run('state'),'playing');
 w.MooncatchLifecycle(false);assert.equal(run('state'),'paused');w.MooncatchLifecycle(true);assert.equal(run('state'),'paused');
 w.MooncatchBack();assert(run('panelOpen'));w.MooncatchBack();assert(!run('panelOpen'));
 el('nativeReturn').click();assert(w.MooncatchIsHome());w.MooncatchBack();assert.equal(w.MooncatchSuite.mode,'home');w.MooncatchBack();await new Promise(r=>setTimeout(r,0));assert(calls.includes('exit'));assert(calls.includes('save'));
 assert.equal(w.document.documentElement.style.getPropertyValue('--native-safe-top'),'24px');
 for(const name of ['game.js','profile-data.js','profile-ui.js','game-suite.js','echo/app.js','echo/engine.js','echo/levels.js'])assert.deepEqual(fs.readFileSync(dir+name),fs.readFileSync('dist/legacy/'+name),name);
 dom.window.close();console.log('PASS built original native assets, shared save callback, lifecycle pause, back stack, insets, no duplicate game entry');
})().catch(e=>{console.error(e);process.exit(1)});
