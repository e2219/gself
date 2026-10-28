package io.github.e2219.mooncatch;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.SystemClock;
import android.view.MotionEvent;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.After;
import org.junit.runner.RunWith;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class MobileSmokeTest {
    private ActivityScenario<MainActivity> scenario;
    private String baseline;
    private void report(String message){android.os.Bundle bundle=new android.os.Bundle();bundle.putString("stream","\n"+message+"\n");InstrumentationRegistry.getInstrumentation().sendStatus(2,bundle);}
    private String js(String code) throws Exception {
        AtomicReference<String> result = new AtomicReference<>(); CountDownLatch latch = new CountDownLatch(1);
        scenario.onActivity(activity -> activity.getBridge().getWebView().evaluateJavascript(code, value -> {result.set(value);latch.countDown();}));
        assertTrue("JavaScript timed out", latch.await(8, TimeUnit.SECONDS)); return result.get();
    }
    private void waitFor(String expression) throws Exception {waitFor(expression,15000);}
    private void waitFor(String expression,long timeout) throws Exception {
        long deadline = SystemClock.uptimeMillis()+timeout;
        while(SystemClock.uptimeMillis()<deadline){if("true".equals(js(expression)))return;SystemClock.sleep(150);}
        fail("Not ready: "+expression+" / "+js("document.body.innerText.slice(0,300)"));
    }
    private void open() throws Exception {
        scenario=ActivityScenario.launch(MainActivity.class);
        waitFor("typeof MooncatchIsHome==='function' && typeof MooncatchSuite==='object'");
        js("MooncatchSuite.select('classic')");
        js("if(!MooncatchIsHome())document.getElementById('nativeReturn').click()");
        if(baseline==null)baseline=new JSONArray("["+js("JSON.stringify(MooncatchProfileData.snapshot(localStorage))")+"]").getString(0);
    }
    private float[] point(String id,double fx,double fy) throws Exception {
        String result=js("JSON.stringify((()=>{const r=document.getElementById('"+id+"').getBoundingClientRect();return [(r.left+r.width*"+fx+")*devicePixelRatio,(r.top+r.height*"+fy+")*devicePixelRatio]})())");
        JSONArray value=new JSONArray((String)new JSONArray("["+result+"]").get(0));
        return new float[]{(float)value.getDouble(0),(float)value.getDouble(1)};
    }
    private void touch(long down,int action,float[]... points){
        MotionEvent.PointerProperties[] props=new MotionEvent.PointerProperties[points.length];
        MotionEvent.PointerCoords[] coords=new MotionEvent.PointerCoords[points.length];
        for(int i=0;i<points.length;i++){props[i]=new MotionEvent.PointerProperties();props[i].id=i;props[i].toolType=MotionEvent.TOOL_TYPE_FINGER;coords[i]=new MotionEvent.PointerCoords();coords[i].x=points[i][0];coords[i].y=points[i][1];coords[i].pressure=1;coords[i].size=1;}
        MotionEvent event=MotionEvent.obtain(down,SystemClock.uptimeMillis(),action,points.length,props,coords,0,0,1,1,0,0,android.view.InputDevice.SOURCE_TOUCHSCREEN,0);
        InstrumentationRegistry.getInstrumentation().sendPointerSync(event);event.recycle();
    }
    @After public void restoreProfile() throws Exception {
        if(scenario!=null && baseline!=null){
            try {js("window.MooncatchSuite?.home();if(state==='playing'||state==='resuming')pause();clearInput();for(const k of MooncatchProfileData.keys)localStorage.removeItem(k);MooncatchProfileData.merge(localStorage,"+baseline+");window.nativeSaved=false;MooncatchSaveChanged().then(()=>window.nativeSaved=true)");waitFor("window.nativeSaved===true");
                assertEquals(baseline,new JSONArray("["+js("JSON.stringify(MooncatchProfileData.snapshot(localStorage))")+"]").getString(0));
                // Instrumentation terminates the app process; allow WebView DOM storage to flush first.
                SystemClock.sleep(2000);
            }
            finally{scenario.close();}
        }
    }
    @Test public void offlineMenuAndRealMultiTouch() throws Exception {
        open();
        assertEquals(PackageManager.PERMISSION_DENIED,InstrumentationRegistry.getInstrumentation().getTargetContext().checkSelfPermission(Manifest.permission.INTERNET));
        assertEquals("true",js("focusMode && canvasOnly"));
        for(String mode:new String[]{"drag","stick","dpad"}){
            js("document.getElementById('nativeStart').click();window.MoonGuide?.close({start:true});selectControlMode('"+mode+"');spawn=hazardClock=100;wagerSlot=wagerSchedule.length;adventureSlot=adventureSchedule.length;routeSlot=routeSchedule.length;laserSlot=laserSchedule.length;ship.x=ship.target=W*.35;ship.y=ship.targetY=H*.4");
            SystemClock.sleep(200);
            float[] p=point(mode.equals("drag")?"sky":mode.equals("stick")?"stickRing":"dir-r",mode.equals("stick")?.85:.5,.5);
            double before=Double.parseDouble(js("ship.x"));long down=SystemClock.uptimeMillis();touch(down,MotionEvent.ACTION_DOWN,p);
            if(mode.equals("drag")){p[0]+=60;touch(down,MotionEvent.ACTION_MOVE,p);}
            SystemClock.sleep(150);assertTrue("No actual movement for "+mode,Double.parseDouble(js("ship.x"))>before);
            float[] boost=point("boost",.5,.5);touch(down,MotionEvent.ACTION_POINTER_DOWN|(1<<MotionEvent.ACTION_POINTER_INDEX_SHIFT),p,boost);
            SystemClock.sleep(80);assertEquals("true",js("boostTime>0"));touch(down,MotionEvent.ACTION_POINTER_UP|(1<<MotionEvent.ACTION_POINTER_INDEX_SHIFT),p,boost);
            String moon=js("moonPhase");float[] toggle=point("moonToggle",.5,.5);touch(down,MotionEvent.ACTION_POINTER_DOWN|(1<<MotionEvent.ACTION_POINTER_INDEX_SHIFT),p,toggle);SystemClock.sleep(80);assertNotEquals(moon,js("moonPhase"));touch(down,MotionEvent.ACTION_POINTER_UP|(1<<MotionEvent.ACTION_POINTER_INDEX_SHIFT),p,toggle);touch(down,MotionEvent.ACTION_UP,p);
            InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(android.view.KeyEvent.KEYCODE_BACK);waitFor("state==='paused' && panelOpen");js("document.getElementById('nativeReturn').click()");
        }
        js("document.getElementById('nativeStart').click();window.MoonGuide?.close({start:true})");double beforePause=Double.parseDouble(js("elapsed"));scenario.moveToState(androidx.lifecycle.Lifecycle.State.CREATED);SystemClock.sleep(750);scenario.moveToState(androidx.lifecycle.Lifecycle.State.RESUMED);waitFor("state==='paused'");assertTrue("Game advanced in background",Double.parseDouble(js("elapsed"))<=beforePause+.2);
        js("window.pauseResumeShield=-1;const resumeHook=MooncatchResumeChanged;MooncatchResumeChanged=()=>{if(state==='playing')window.pauseResumeShield=resumeShield;resumeHook()};document.getElementById('start').click()");assertEquals("\"resuming\"",js("state"));waitFor("state==='playing'");assertEquals("true",js("window.pauseResumeShield>=1.5"));
        // Native bridge storage survives activity destruction and a cold activity launch.
        js("storeSetting('mooncatch-best-v6','731');storeSetting('mooncatch-sound','true');window.nativeSaved=false;MooncatchSaveChanged().then(()=>window.nativeSaved=true)");waitFor("window.nativeSaved===true");scenario.close();open();assertEquals("\"731\"",js("localStorage.getItem('mooncatch-best-v6')"));assertEquals("true",js("sound"));
    }
    @Test public void pauseCountdownAndControls() throws Exception {
        open();js("document.getElementById('nativeStart').click();window.MoonGuide?.close({start:true});selectControlMode('stick');spawn=hazardClock=100;invincible=100");
        float[] p=point("stickRing",.85,.5);long down=SystemClock.uptimeMillis();touch(down,MotionEvent.ACTION_DOWN,p);SystemClock.sleep(150);
        float[] pauseButton=point("canvasPause",.5,.5);touch(down,MotionEvent.ACTION_POINTER_DOWN|(1<<MotionEvent.ACTION_POINTER_INDEX_SHIFT),p,pauseButton);
        waitFor("state==='paused'");assertEquals("true",js("!panelOpen && stickPointer===null"));
        touch(down,MotionEvent.ACTION_POINTER_UP|(1<<MotionEvent.ACTION_POINTER_INDEX_SHIFT),p,pauseButton);touch(down,MotionEvent.ACTION_UP,p);
        String frozen=js("JSON.stringify([elapsed,ship.x,ship.y,hp])");
        js("document.getElementById('start').click()");assertEquals("true",js("state==='resuming' && !document.getElementById('resumeCue').hidden"));
        SystemClock.sleep(1800);assertEquals(frozen,js("JSON.stringify([elapsed,ship.x,ship.y,hp])"));assertEquals("\"resuming\"",js("state"));
        waitFor("state==='playing'");assertEquals("true",js("resumeShield>0 && stickPointer===null"));
        js("pause();pause()");scenario.moveToState(androidx.lifecycle.Lifecycle.State.CREATED);SystemClock.sleep(500);scenario.moveToState(androidx.lifecycle.Lifecycle.State.RESUMED);waitFor("state==='paused'");
        SystemClock.sleep(3300);assertEquals("\"paused\"",js("state"));
        js("pause()");SystemClock.sleep(300);js("document.getElementById('resumeCancel').click()");assertEquals("true",js("state==='paused' && document.getElementById('resumeCue').hidden"));
        report("MOONCATCH_PAUSE direct two-finger button, 3s freeze, shield, background cancellation and explicit cancel passed");
    }
    @Test public void cancelPauseDoesNotReturnHome() throws Exception {
        open();
        for(int orientation:new int[]{android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT,android.content.pm.ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE}){
            scenario.onActivity(a->a.setRequestedOrientation(orientation));waitFor(orientation==android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT?"H>W":"W>H");
            // Android's screen-rotation animation can outlive WebView's resize event.
            InstrumentationRegistry.getInstrumentation().waitForIdleSync();SystemClock.sleep(750);
            js("document.getElementById('nativeStart').click();window.MoonGuide?.close({start:true});score=123;pause();pause()");
            // Starting and rotating in one script can precede the first visible layout.
            js("window.cancelLayoutReady=false;requestAnimationFrame(()=>requestAnimationFrame(()=>window.cancelLayoutReady=true))");waitFor("window.cancelLayoutReady===true");
            float[] cancel=point("resumeCancel",.5,.5);long down=SystemClock.uptimeMillis();touch(down,MotionEvent.ACTION_DOWN,cancel);
            SystemClock.sleep(200);assertEquals("true",js("state==='resuming' && !document.getElementById('resumeCue').hidden"));
            touch(down,MotionEvent.ACTION_UP,cancel);waitFor("state==='paused'");SystemClock.sleep(600);
            assertEquals("true",js("state==='paused' && !MooncatchIsHome() && score===123"));
            // Inject the compatibility click which used to hit the newly revealed home button.
            js("document.getElementById('nativeResultHome').dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1}))");
            assertEquals("true",js("state==='paused' && !MooncatchIsHome() && score===123"));
            float[] home=point("nativeResultHome",.5,.5);down=SystemClock.uptimeMillis();touch(down,MotionEvent.ACTION_DOWN,home);touch(down,MotionEvent.ACTION_UP,home);waitFor("MooncatchIsHome()");
        }
        report("MOONCATCH_CANCEL portrait/landscape real hold-release, delayed click rejection and fresh home tap passed");
    }
    @Test public void nativeFileRoundTrip() throws Exception {
        org.junit.Assume.assumeTrue("Interactive system picker test", "true".equals(InstrumentationRegistry.getArguments().getString("interactiveFiles")));
        open();js("document.getElementById('nativeSettings').click();storeSetting('mooncatch-best-v6','10731');document.getElementById('saveExport').click()");
        report("MOONCATCH_FILES awaiting export picker");
        waitFor("document.getElementById('saveStatus').textContent==='存档已导出'",180000);
        js("storeSetting('mooncatch-best-v6','3');document.getElementById('saveImport').click()");
        report("MOONCATCH_FILES awaiting import picker");
        waitFor("!document.getElementById('saveApply').hidden",180000);
        js("window.nativeBeforeImport=true;document.getElementById('saveApply').click()");
        waitFor("typeof MooncatchIsHome==='function' && MooncatchIsHome() && typeof nativeBeforeImport==='undefined'");
        assertEquals("\"10731\"",js("localStorage.getItem('mooncatch-best-v6')"));
    }
    private float[] echoPoint(String id,double fx,double fy) throws Exception {
        String result=js("JSON.stringify((()=>{const f=document.getElementById('echoFrame'),a=f.getBoundingClientRect(),r=f.contentDocument.getElementById('"+id+"').getBoundingClientRect();return [(a.left+r.left+r.width*"+fx+")*devicePixelRatio,(a.top+r.top+r.height*"+fy+")*devicePixelRatio]})())");
        JSONArray v=new JSONArray((String)new JSONArray("["+result+"]").get(0));return new float[]{(float)v.getDouble(0),(float)v.getDouble(1)};
    }
    private void echoShot(String name) throws Exception {
        java.io.File f=new java.io.File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null),name+".png");
        try(java.io.FileOutputStream out=new java.io.FileOutputStream(f)){InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot().compress(android.graphics.Bitmap.CompressFormat.PNG,100,out);}
    }
    private void tap(float[] p){long d=SystemClock.uptimeMillis();touch(d,MotionEvent.ACTION_DOWN,p);SystemClock.sleep(55);touch(d,MotionEvent.ACTION_UP,p);SystemClock.sleep(180);}
    @Test public void echoSyncRealTouch() throws Exception {
        open();js("MooncatchSuite.home()");tap(point("chooseEcho",.5,.5));
        waitFor("document.getElementById('echoFrame')?.contentWindow.MoonEcho!==undefined");
        js("window.ew=document.getElementById('echoFrame').contentWindow;window.eg=ew.MoonEcho;ew.MoonGuide?.close()");
        tap(echoPoint("right",.5,.5));assertEquals("1",js("eg.game.state.moves"));assertEquals("true",js("eg.game.state.p[0]===11 && eg.game.state.p[1]===69"));
        tap(echoPoint("undo",.5,.5));assertEquals("0",js("eg.game.state.moves"));
        float[] p=echoPoint("right",.5,.5);long down=SystemClock.uptimeMillis();touch(down,MotionEvent.ACTION_DOWN,p);SystemClock.sleep(900);touch(down,MotionEvent.ACTION_UP,p);waitFor("eg.game.won");
        js("eg.choose(1);ew.MoonGuide?.close()");SystemClock.sleep(250);assertEquals("0",js("eg.game.state.moves"));
        p=echoPoint("board0",.3,.5);float[] q=echoPoint("board0",.7,.5);down=SystemClock.uptimeMillis();touch(down,MotionEvent.ACTION_DOWN,p);touch(down,MotionEvent.ACTION_MOVE,q);touch(down,MotionEvent.ACTION_UP,q);SystemClock.sleep(200);assertEquals("1",js("eg.game.state.moves"));
        js("eg.choose(24);ew.MoonGuide?.close()");SystemClock.sleep(250);echoShot("shared-portrait");
        assertEquals("1",js("ew.document.querySelectorAll('canvas').length"));assertEquals("true",js("!ew.document.getElementById('check') && !('flag' in eg.game)"));
        js("ew.tapLog=[];ew.errorLog=[];for(const t of ['pointerdown','pointerup','click'])ew.document.addEventListener(t,e=>ew.tapLog.push(t+':'+e.target.id),true);ew.addEventListener('error',e=>ew.errorLog.push(e.message))");
        tap(echoPoint("hint",.5,.5));SystemClock.sleep(500);report("SHARED_HINT "+js("JSON.stringify({events:ew.tapLog,errors:ew.errorLog,open:ew.document.getElementById('help').open})"));echoShot("shared-hint");waitFor("ew.document.getElementById('help').open");tap(echoPoint("closeHelp",.5,.5));

        InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(android.view.KeyEvent.KEYCODE_BACK);waitFor("ew.document.getElementById('menu').open");tap(echoPoint("closeMenu",.5,.5));
        js("eg.choose(0);ew.MoonGuide?.close()");p=echoPoint("right",.5,.5);down=SystemClock.uptimeMillis();touch(down,MotionEvent.ACTION_DOWN,p);touch(down,MotionEvent.ACTION_CANCEL,p);String saved=js("eg.game.state.moves");SystemClock.sleep(700);assertEquals(saved,js("eg.game.state.moves"));
        scenario.moveToState(androidx.lifecycle.Lifecycle.State.CREATED);SystemClock.sleep(500);assertEquals(saved,js("eg.game.state.moves"));scenario.moveToState(androidx.lifecycle.Lifecycle.State.RESUMED);
        scenario.onActivity(a->a.setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));waitFor("innerWidth>innerHeight");SystemClock.sleep(400);echoShot("shared-landscape");
        assertEquals("true",js("(()=>{const d=ew.document,b=d.getElementById('right').getBoundingClientRect();return b.width>=44&&b.height>=44&&b.bottom<=ew.innerHeight&&b.right<=ew.innerWidth})()"));
        tap(echoPoint("reset",.5,.5));tap(echoPoint("right",.5,.5));assertEquals("1",js("eg.game.state.moves"));
        scenario.onActivity(a->a.setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT));waitFor("innerHeight>innerWidth");
        js("window.echoTimes=[];window.echoPulse=setInterval(()=>eg.step(eg.game.state.p[0]===10?'R':'L'),150);window.echoLast=performance.now();function sample(t){echoTimes.push(t-echoLast);echoLast=t;if(echoTimes.length<90)requestAnimationFrame(sample)}requestAnimationFrame(sample)");
        waitFor("echoTimes.length>=90");js("clearInterval(echoPulse)");report("MOONCATCH_ECHO "+js("JSON.stringify({frames:echoTimes.length,medianMs:echoTimes.slice(5).sort((a,b)=>a-b)[42],maxMs:Math.max(...echoTimes.slice(5)),level:eg.index+1})"));
        js("MooncatchSuite.home()");tap(point("chooseClassic",.5,.5));assertEquals("\"classic\"",js("MooncatchSuite.mode"));startNativeTap();assertEquals("\"playing\"",js("state"));
        report("MOONCATCH_ECHO shared board, opposite movement, real dpad/hold/swipe, hints, undo, cancel, lifecycle, back, rotation and classic return passed");
    }
    private void echoWalk(int x,int y) throws Exception {
        for(int i=0;i<80;i++){
            if("true".equals(js("eg.game.puzzle.player.x==="+x+"&&eg.game.puzzle.player.y==="+y)))return;
            tap(echoPoint("board0",(x+.5)/17,(y+.5)/11));
        }
        fail("Map taps did not reach "+x+","+y);
    }
    private void echoWaitEnd() throws Exception {
        for(int i=0;i<100;i++){
            if("true".equals(js("eg.game.puzzle.cursor===eg.game.puzzle.trace.length-1")))return;
            tap(echoPoint("wait",.5,.5));
        }
        fail("Explicit waits did not finish replay");
    }
    @Test public void varietyRealTouch() throws Exception {
        open();js("MooncatchSuite.select('echo')");waitFor("document.getElementById('echoFrame')?.contentWindow.MoonEcho!==undefined");js("window.ew=document.getElementById('echoFrame').contentWindow;window.eg=ew.MoonEcho;ew.MoonGuide?.close()");
        js("eg.choose(1);ew.MoonGuide?.close()");SystemClock.sleep(350);echoShot("variety-relay-portrait");assertEquals("true",js("ew.document.getElementById('right').getBoundingClientRect().bottom<=ew.innerHeight"));String shadow=js("eg.game.state.p[1]");tap(echoPoint("right",.5,.5));assertEquals(shadow,js("eg.game.state.p[1]"));String body=js("eg.game.state.p[0]");tap(echoPoint("switchActor",.5,.5));assertEquals("1",js("eg.game.state.active"));tap(echoPoint("left",.5,.5));assertEquals(body,js("eg.game.state.p[0]"));assertNotEquals(shadow,js("eg.game.state.p[1]"));
        js("eg.choose(4);ew.MoonGuide?.close()");tap(echoPoint("right",.5,.5));assertEquals("true",js("eg.game.state.p[0]===11&&eg.game.state.p[1]===52"));
        js("eg.choose(2);ew.MoonGuide?.close()");SystemClock.sleep(250);tap(echoPoint("record",.5,.5));waitFor("eg.game.puzzle.mode==='recording'");String idleTrace=js("eg.game.puzzle.trace.length");SystemClock.sleep(900);assertEquals(idleTrace,js("eg.game.puzzle.trace.length"));tap(echoPoint("pauseReplay",.5,.5));String frozen=js("eg.game.puzzle.time");SystemClock.sleep(700);assertEquals(frozen,js("eg.game.puzzle.time"));tap(echoPoint("pauseReplay",.5,.5));
        echoWalk(5,3);echoShot("variety-record-portrait");tap(echoPoint("replay",.5,.5));waitFor("eg.game.puzzle.mode==='playing'");String idleCursor=js("eg.game.puzzle.cursor");SystemClock.sleep(900);assertEquals(idleCursor,js("eg.game.puzzle.cursor"));tap(echoPoint("right",.5,.5));assertEquals("1",js("eg.game.puzzle.cursor"));echoWaitEnd();
        tap(echoPoint("hint",.5,.5));waitFor("ew.document.getElementById('help').open");frozen=js("eg.game.puzzle.time");SystemClock.sleep(600);assertEquals(frozen,js("eg.game.puzzle.time"));tap(echoPoint("closeHelp",.5,.5));
        echoWalk(10,7);waitFor("eg.game.puzzle.latched");echoWalk(15,5);waitFor("eg.game.won&&ew.document.getElementById('victory').open");
        js("eg.choose(14);ew.MoonGuide?.close()");SystemClock.sleep(300);scenario.onActivity(a->a.setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));waitFor("innerWidth>innerHeight");SystemClock.sleep(500);echoShot("variety-replay-landscape");
        assertEquals("true",js("['right','record','replay','guard','interact','pauseReplay'].every(id=>{const r=ew.document.getElementById(id).getBoundingClientRect();return r.width>=44&&r.height>=44&&r.bottom<=ew.innerHeight&&r.right<=ew.innerWidth})"));tap(echoPoint("record",.5,.5));waitFor("eg.game.puzzle.mode==='recording'");
        frozen=js("eg.game.puzzle.time");scenario.moveToState(androidx.lifecycle.Lifecycle.State.CREATED);SystemClock.sleep(600);scenario.moveToState(androidx.lifecycle.Lifecycle.State.RESUMED);assertEquals(frozen,js("eg.game.puzzle.time"));assertEquals("true",js("eg.game.puzzle.paused"));
        js("eg.choose(9);ew.MoonGuide?.close()");SystemClock.sleep(300);echoShot("variety-relay-landscape");assertEquals("true",js("(()=>{const r=ew.document.getElementById('right').getBoundingClientRect();return r.bottom<=ew.innerHeight&&r.height>=44})()"));tap(echoPoint("switchActor",.5,.5));assertEquals("1",js("eg.game.state.active"));
        scenario.onActivity(a->a.setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT));waitFor("innerHeight>innerWidth");js("eg.choose(2);ew.MoonGuide?.close()");SystemClock.sleep(250);assertEquals("true",js("(()=>{const r=ew.document.getElementById('right').getBoundingClientRect();return r.bottom<=ew.innerHeight})()"));
        InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(android.view.KeyEvent.KEYCODE_BACK);waitFor("ew.document.getElementById('menu').open");tap(echoPoint("closeMenu",.5,.5));js("MooncatchSuite.home();MooncatchSuite.select('classic')");startNativeTap();assertEquals("\"playing\"",js("state"));
        report("MOONCATCH_VARIETY real role switch, parallel movement, full step-synchronized twin-moon solution, idle freeze, explicit waits, modal pause, background freeze, portrait/landscape controls and classic return passed");
    }
    @Test public void profileSnapshot() throws Exception {
        open();
        if("true".equals(InstrumentationRegistry.getArguments().getString("seedRecord"))){
            js("storeSetting('mooncatch-best-v6','9821');window.nativeSaved=false;MooncatchSaveChanged().then(()=>window.nativeSaved=true)");waitFor("window.nativeSaved===true");
            baseline=new JSONArray("["+js("JSON.stringify(MooncatchProfileData.snapshot(localStorage))")+"]").getString(0);
        }
        report("MOONCATCH_PROFILE "+android.util.Base64.encodeToString(baseline.getBytes(java.nio.charset.StandardCharsets.UTF_8),android.util.Base64.NO_WRAP));
        String expected=InstrumentationRegistry.getArguments().getString("expectedProfile");
        if(expected!=null)assertEquals(new String(android.util.Base64.decode(expected,android.util.Base64.DEFAULT),java.nio.charset.StandardCharsets.UTF_8),baseline);
        String restore=InstrumentationRegistry.getArguments().getString("restoreProfile");
        if(restore!=null){
            String candidate=new String(android.util.Base64.decode(restore,android.util.Base64.DEFAULT),java.nio.charset.StandardCharsets.UTF_8);
            baseline=new JSONArray("["+js("JSON.stringify(MooncatchProfileData.parse("+JSONObject.quote(candidate)+"))")+"]").getString(0);
        }
    }
    @Test public void rotationAndCutout() throws Exception {
        open();js("document.getElementById('nativeStart').click();window.MoonGuide?.close({start:true});selectControlMode('stick')");
        scenario.onActivity(a->a.setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));
        waitFor("W>H");assertEquals("true",js("focusMode && canvasOnly && driverMode()==='stick' && Number.isFinite(ship.x)"));
        scenario.onActivity(a->a.setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT));
        waitFor("H>W");assertEquals("true",js("focusMode && canvasOnly && driverMode()==='stick' && ship.x>=0 && ship.y>=0"));
        js("MooncatchBack()");waitFor("panelOpen");assertEquals("true",js("document.getElementById('gamePanel').getBoundingClientRect().width<=innerWidth"));
    }
    @Test public void endlessDockAndStickResponse() throws Exception {
        open();js("selectedRun='endless';document.getElementById('nativeStart').click();window.MoonGuide?.close({start:true});selectControlMode('stick');spawn=hazardClock=100;ship.x=ship.target=W*.35;ship.y=ship.targetY=H*.5");
        float[] center=point("stickRing",.5,.5);long down=SystemClock.uptimeMillis();touch(down,MotionEvent.ACTION_DOWN,center);
        float[] right=new float[]{center[0]+180,center[1]};touch(down,MotionEvent.ACTION_MOVE,right);SystemClock.sleep(100);
        double origin=Double.parseDouble(js("stickOrigin.x"));assertTrue("Overextended thumb must move the anchor",origin>Double.parseDouble(js("document.getElementById('stickRing').getBoundingClientRect().left")));
        float density=Float.parseFloat(js("devicePixelRatio"));float[] reverse=new float[]{(float)(origin-26)*density,center[1]};touch(down,MotionEvent.ACTION_MOVE,reverse);SystemClock.sleep(100);assertEquals("true",js("stickMotion.x<0"));touch(down,MotionEvent.ACTION_UP,reverse);
        String stopped=js("JSON.stringify([ship.x,ship.y])");SystemClock.sleep(120);assertEquals(stopped,js("JSON.stringify([ship.x,ship.y])"));
        js("hp=1;expedition.credits=1;elapsed=90;nextLeg()");assertEquals("\"dock\"",js("state"));assertEquals("3",js("hp"));assertEquals("2",js("expedition.picks"));
        SystemClock.sleep(500);assertEquals("0",js("elapsed"));
        float[] choice=point("module2",.5,.5);down=SystemClock.uptimeMillis();touch(down,MotionEvent.ACTION_DOWN,choice);touch(down,MotionEvent.ACTION_UP,choice);
        float[] confirm=point("dockApply",.5,.5);down=SystemClock.uptimeMillis();touch(down,MotionEvent.ACTION_DOWN,confirm);touch(down,MotionEvent.ACTION_UP,confirm);waitFor("expedition.modules.ward===1");
        InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(android.view.KeyEvent.KEYCODE_BACK);waitFor("panelOpen");InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(android.view.KeyEvent.KEYCODE_BACK);waitFor("!panelOpen && state==='dock'");
        float[] launch=point("dockLaunch",.5,.5);down=SystemClock.uptimeMillis();touch(down,MotionEvent.ACTION_DOWN,launch);touch(down,MotionEvent.ACTION_UP,launch);waitFor("state==='playing' && resumeShield>2");assertEquals("true",js("guard>=2 && stickPointer===null"));
    }
    @Test public void bossModelVoyages() throws Exception {
        open();
        for(String world:new String[]{"classic","aurora","warp"}){
            js("if(!MooncatchIsHome())document.getElementById('nativeReturn').click();selectedWorld='"+world+"';selectedRun='endless';document.getElementById('nativeStart').click();window.MoonGuide?.close({start:true});legIndex=8;elapsed=69.9;invincible=100;inputMode='keyboard';ship.x=ship.target=W*.5;ship.y=ship.targetY=H*.8");
            waitFor("boss && boss.maxHp===bossDifficulty().hp");
            for(int i=0;i<10;i++){
                js("activeShip=['collector','falcon','warden']["+i+"%3];ship.target=W*(.25+.5*(1+Math.sin("+i+"))/2)");
                SystemClock.sleep(1800);
                report("MOONCATCH_BOSS "+world+" "+js("JSON.stringify({fps:frameHealth.fps,tier:renderTier,elapsed,state,armor:boss?.maxHp,attacks:storm?.slot})"));
                assertEquals("true",js("Number.isFinite(ship.x+ship.y) && hp===3"));
            }
            waitFor("state==='dock'",10000);
            assertEquals("true",js("boss===null && storm===null && items.length===0"));
        }
    }
    @Test public void ionVoyageAndMusic() throws Exception {
        open();js("selectedWorld='ion';selectedRun='endless';document.getElementById('nativeStart').click();window.MoonGuide?.close({start:true});legIndex=20;invincible=300;selectControlMode('stick');if(musicEnabled)document.getElementById('music').click();openPanel('controls');document.getElementById('music').scrollIntoView({block:'center'})");
        float[] musicPoint=point("music",.5,.5);long musicDown=SystemClock.uptimeMillis();touch(musicDown,MotionEvent.ACTION_DOWN,musicPoint);touch(musicDown,MotionEvent.ACTION_UP,musicPoint);js("closePanel()");
        waitFor("musicEnabled && audio && audio.state==='running' && musicPlayer && !musicPlayer.paused && musicPlayer.currentTime>0");
        float[] p=point("stickRing",.8,.5);long down=SystemClock.uptimeMillis();touch(down,MotionEvent.ACTION_DOWN,p);SystemClock.sleep(150);
        float[] toggle=point("moonToggle",.5,.5);String before=js("moonPhase");touch(down,MotionEvent.ACTION_POINTER_DOWN|(1<<MotionEvent.ACTION_POINTER_INDEX_SHIFT),p,toggle);SystemClock.sleep(100);assertNotEquals(before,js("moonPhase"));touch(down,MotionEvent.ACTION_POINTER_UP|(1<<MotionEvent.ACTION_POINTER_INDEX_SHIFT),p,toggle);touch(down,MotionEvent.ACTION_UP,p);
        js("elapsed=6;stepIon(0,ship.x,ship.y);spawn=hazardClock=100;for(let i=0;i<3;i++){const n=worldEvent.points[worldEvent.index];moonPhase=n.polarity;ship.x=ship.target=n.x*W;ship.y=ship.targetY=n.y*H;stepIon(0,ship.x,ship.y)}");assertEquals("true",js("worldWins===1 && guard>0"));
        js("elapsed=25;fieldSlot=0;hazardClock=0");SystemClock.sleep(2500);assertEquals("true",js("Number.isFinite(ship.x+ship.y) && musicPlayer && !musicPlayer.error"));
        js("elapsed=69.9;hazardFields=[];boss=null;bossStarted=false;storm=null");waitFor("boss && boss.maxHp===10");
        for(int i=0;i<8;i++){SystemClock.sleep(2200);report("MOONCATCH_ION "+js("JSON.stringify({fps:frameHealth.fps,tier:renderTier,elapsed,state,musicTime:musicPlayer?.currentTime,attack:storm?.event?.kind,items:items.length})"));assertEquals("true",js("hp===3 && Number.isFinite(ship.x+ship.y)"));}
        waitFor("state==='dock'");assertEquals("true",js("musicPlayer.paused"));
        js("departDock();pause();pause()");assertEquals("true",js("musicPlayer.paused"));waitFor("state==='playing' && musicPlayer && !musicPlayer.paused && musicPlayer.currentTime>0");
        js("document.getElementById('music').click()");assertEquals("true",js("!musicEnabled && musicPlayer.paused"));
    }
    @Test public void recordedMusicTracks() throws Exception {
        open();js("document.getElementById('nativeStart').click();window.MoonGuide?.close({start:true});invincible=300;spawn=hazardClock=100;if(musicEnabled)document.getElementById('music').click();sound=false;openPanel('controls');document.getElementById('music').scrollIntoView({block:'center'})");
        float[] point=point("music",.5,.5);long down=SystemClock.uptimeMillis();touch(down,MotionEvent.ACTION_DOWN,point);touch(down,MotionEvent.ACTION_UP,point);js("closePanel()");
        for(String track:new String[]{"floating-cities","dream-culture"}){
            js("document.getElementById('musicTrack').value='"+track+"';document.getElementById('musicTrack').dispatchEvent(new Event('change'))");
            waitFor("musicPlayer && !musicPlayer.paused && musicPlayer.currentTime>0.5 && musicPlayer.duration>150");
            assertEquals("true",js("audio.state==='running' && !musicPlayer.error && Math.abs(musicGain.gain.value-.3)<.001 && !sound"));
            js("pause()");double saved=Double.parseDouble(js("musicPlayer.currentTime"));SystemClock.sleep(450);assertEquals(saved,Double.parseDouble(js("musicPlayer.currentTime")),.03);
            js("pause()");SystemClock.sleep(500);assertEquals("true",js("state==='resuming' && musicPlayer.paused"));waitFor("state==='playing' && !musicPlayer.paused");
            js("musicPlayer.currentTime=musicPlayer.duration-.2");waitFor("musicPlayer.currentTime<2 && !musicPlayer.paused");
            report("MOONCATCH_TRACK "+track+" "+js("JSON.stringify({duration:musicPlayer.duration,playing:!musicPlayer.paused,loop:musicPlayer.loop,volume:musicGain.gain.value})"));
        }
        scenario.moveToState(androidx.lifecycle.Lifecycle.State.CREATED);SystemClock.sleep(500);assertEquals("true",js("musicPlayer.paused"));scenario.moveToState(androidx.lifecycle.Lifecycle.State.RESUMED);waitFor("state==='paused'");assertEquals("true",js("musicPlayer.paused"));
        js("document.getElementById('music').click()");assertEquals("true",js("!musicEnabled && musicPlayer.paused"));
    }
    @Test public void modelAndUiShowcase() throws Exception {
        open();assertEquals("true",js("document.getElementById('nativeStart').getBoundingClientRect().bottom<=innerHeight+1"));
        js("selectedWorld='classic';selectedRun='endless';document.getElementById('nativeStart').click();window.MoonGuide?.close({start:true});invincible=300;spawn=hazardClock=100;elapsed=18;beginObjective({kind:'cargo',duration:60});objective.load=2;selectControlMode('stick')");
        waitFor("!document.getElementById('navigationCue').hidden");
        assertEquals("true",js("document.querySelector('.hud').getBoundingClientRect().bottom<document.getElementById('navigationCue').getBoundingClientRect().top"));
        for(String scene:new String[]{"cargo","rings","ion","zones","cross"}){
            js("objective=null;worldEvent=null;hazardFields=[];activeWorld='classic';worldSlot=99;spawn=hazardClock=100;fieldSlot=99;elapsed=20;invincible=300;ship.x=ship.target=W*.5;ship.y=ship.targetY=H*.5");
            if(scene.equals("cargo")||scene.equals("rings"))js("beginObjective({kind:'"+scene+"',duration:30})");
            else if(scene.equals("ion"))js("activeWorld='ion';worldSlot=0;elapsed=6;stepIon(0,ship.x,ship.y)");
            else js("hazardFields=[makeField('"+scene+"')];hazardFields[0].fire=elapsed+.3;hazardFields[0].end=elapsed+8");
            for(int i=0;i<2;i++){SystemClock.sleep(2300);report("MOONCATCH_MODEL "+scene+" "+js("JSON.stringify({fps:frameHealth.fps,tier:renderTier,state,hp})"));assertEquals("true",js("state==='playing' && hp===3 && Number.isFinite(ship.x+ship.y)"));}
        }
        js("activeWorld='ion';boss=null;worldSlot=0;worldEvent=null;elapsed=6;stepIon(0,ship.x,ship.y);hud()");
        scenario.onActivity(a->a.setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));waitFor("W>H");js("if(state==='paused'){pause()} ");waitFor("state==='playing'");
        assertEquals("true",js("document.getElementById('navigationCue').getBoundingClientRect().right<=innerWidth && document.querySelector('.hud').getBoundingClientRect().bottom<document.getElementById('navigationCue').getBoundingClientRect().top"));
        js("openPanel('controls')");assertEquals("true",js("document.querySelector('.music-settings').contains(document.getElementById('music')) && document.querySelector('.music-settings').contains(document.getElementById('sound')) && document.getElementById('musicTrack').getBoundingClientRect().width<=innerWidth"));
        report("MOONCATCH_MODEL UI: launch reachable, objective below HUD, landscape bounds and grouped audio controls passed");
    }
    @Test public void blackHoleAndBeaconSeparation() throws Exception {
        open();js("selectedWorld='classic';selectedRun='endless';document.getElementById('nativeStart').click();window.MoonGuide?.close({start:true});spawn=hazardClock=100;adventureSlot=adventureSchedule.length;routeSlot=routeSchedule.length;laserSlot=laserSchedule.length;expedition.seen=true;invincible=100");
        for(String mode:new String[]{"drag","stick","dpad"}){
            js("selectControlMode('"+mode+"');clearInput();elapsed=0;beginObjective({kind:'sling',duration:20});elapsed=3;boostTime=boostCooldown=0;ship.x=ship.target=W*.5+blackHoleGeometry().r*.6;ship.y=ship.targetY=H*.56;window.beforePull=ship.x");
            SystemClock.sleep(600);assertEquals("true",js("ship.x<beforePull-2 && objective.exposure>=.25"));
            float[] b=point("boost",.5,.5);long down=SystemClock.uptimeMillis();touch(down,MotionEvent.ACTION_DOWN,b);touch(down,MotionEvent.ACTION_UP,b);
            waitFor("objective.rewarded===true",3000);assertEquals("true",js("Math.hypot(ship.x-W*.5,ship.y-H*.56)>=blackHoleGeometry().r && state==='playing'"));
            report("MOONCATCH_BLACKHOLE "+mode+" gradual drift and real boost escape passed "+js("JSON.stringify({fps:frameHealth.fps,tier:renderTier})"));
        }
        js("objective=null;activeWorld='ion';worldSlot=1;worldEvent=null;expedition.seen=false;elapsed=18;stepIon(0,0,0);stepSupplyChain(0,0,0);hud()");assertEquals("true",js("worldEvent!==null && expedition.chain===null && document.getElementById('navigationCue').textContent.includes('回路')"));
        js("pause()");String frozen=js("JSON.stringify([ship,elapsed,worldEvent])");SystemClock.sleep(500);assertEquals(frozen,js("JSON.stringify([ship,elapsed,worldEvent])"));
        report("MOONCATCH_BLACKHOLE lunar/supply separation and pause passed");
    }
    @Test public void newModesAndEnvironmentalPlay() throws Exception {
        open();js("document.getElementById('run-relax').click();document.getElementById('nativeStart').click();window.MoonGuide?.close({start:true})");
        assertEquals("true",js("activeRun==='relax' && meadow!==null && !document.getElementById('endRun').hidden"));
        for(String mode:new String[]{"drag","stick","dpad"}){
            js("selectControlMode('"+mode+"');clearInput();objective=null;environment=newEnvironment();items=[];spawn=hazardClock=100;boostTime=boostCooldown=0;ship.x=ship.target=W*.35;ship.y=ship.targetY=H*.4;spawnWreck(.35,.4);environment.wrecks[0].born=elapsed-1;window.previousThrows=environment.thrown");
            waitFor("environment.tow!==null");
            float[] p=point(mode.equals("drag")?"sky":mode.equals("stick")?"stickRing":"dir-r",mode.equals("stick")?.85:.5,.5);
            double before=Double.parseDouble(js("ship.x"));long down=SystemClock.uptimeMillis();touch(down,MotionEvent.ACTION_DOWN,p);
            if(mode.equals("drag")){p[0]+=55;touch(down,MotionEvent.ACTION_MOVE,p);}SystemClock.sleep(150);
            assertTrue("Tow movement "+mode,Double.parseDouble(js("ship.x"))>before);
            float[] b=point("boost",.5,.5);touch(down,MotionEvent.ACTION_POINTER_DOWN|(1<<MotionEvent.ACTION_POINTER_INDEX_SHIFT),p,b);SystemClock.sleep(80);
            assertEquals("true",js("environment.tow===null && environment.thrown===previousThrows+1 && boostTime>0 && !document.getElementById('moonToggle').disabled"));
            touch(down,MotionEvent.ACTION_POINTER_UP|(1<<MotionEvent.ACTION_POINTER_INDEX_SHIFT),p,b);touch(down,MotionEvent.ACTION_UP,p);
            report("MOONCATCH_V25 real held "+mode+" and second-finger throw passed");
        }
        js("elapsed=46;stepMeadow(0,ship.x,ship.y);boostTime=0;elapsed=49;const h=blackHoleGeometry();for(let i=0;i<3;i++)environmentalMeteor({rock:true,r:12,prevX:h.x-h.r,prevY:h.y,x:h.x+h.r,y:h.y},.01)");
        waitFor("environment.loot.length===3",4000);assertEquals("true",js("hp===3 && state==='playing' && boss===null"));
        js("pause()");String frozen=js("JSON.stringify([environment,elapsed,meadow])");SystemClock.sleep(500);assertEquals(frozen,js("JSON.stringify([environment,elapsed,meadow])"));
        js("endVoyage()");assertEquals("true",js("state==='over' && document.getElementById('message').textContent.includes('星种')"));
        js("document.getElementById('nativeResultHome').click();document.getElementById('run-adventure').click();document.getElementById('nativeStart').click();window.MoonGuide?.close({start:true})");
        assertEquals("true",js("activeRun==='adventure' && researchTrip.chapter===0 && time>179 && environment.gate===null"));
        js("invincible=200;elapsed=4;ship.x=ship.target=W*.72;ship.y=ship.targetY=H*.44;stepJourney(0,ship.x,ship.y)");assertEquals("true",js("researchTrip.choice===1 && environment.gate.kind==='data'"));
        scenario.onActivity(a->a.setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));waitFor("W>H");
        assertEquals("true",js("environment.gate.points.every(p=>Number.isFinite(p.x*W+p.y*H)) && document.getElementById('navigationCue').getBoundingClientRect().width<=innerWidth"));
        scenario.onActivity(a->a.setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT));waitFor("H>W");
        js("elapsed=120;stepJourney(0,ship.x,ship.y);elapsed=173;ship.x=ship.target=W*.82;ship.y=ship.targetY=H*.43;stepJourney(0,ship.x,ship.y)");
        assertEquals("true",js("state==='over' && researchTrip.extracted && document.getElementById('title').textContent==='孤舟生还'"));
        report("MOONCATCH_V25 relax nonfailure, hole swallow/reward, frozen pause, adventure entry/route, rotation and extraction passed");
    }
    @Test public void fiveMinuteRenderSoak() throws Exception {
        open();js("document.getElementById('nativeStart').click();window.MoonGuide?.close({start:true})");
        long end=SystemClock.uptimeMillis()+300000;int tick=0;
        while(SystemClock.uptimeMillis()<end){
            js("if(state==='over')start(true);if(state==='paused')pause();if(state==='dock'){selectModule(1);applyModule();departDock()}inputMode='pointer';ship.target=W*(.2+.6*(1+Math.sin("+tick+"*.21))/2);ship.targetY=H*(.25+.5*(1+Math.cos("+tick+"*.17))/2);if(boostCooldown<=0)boost()");
            if(tick%30==0)report("MOONCATCH_SOAK "+js("JSON.stringify({fps:frameHealth.fps,tier:renderTier,elapsed,score,hp})"));
            SystemClock.sleep(500);tick++;
        }
        assertEquals("true",js("Number.isFinite(ship.x) && Number.isFinite(ship.y) && ['playing','over'].includes(state)"));
    }
    private void startNativeTap() throws Exception {tap(point("nativeStart",.5,.5));if("true".equals(js("!!window.MoonGuide?.active")))tap(point("moonGuideSkip",.5,.5));}
    @Test public void puzzleCompactLayouts() throws Exception {
        open();js("MooncatchSuite.home()");tap(point("chooseEcho",.5,.5));
        waitFor("document.getElementById('echoFrame')?.contentWindow.MoonEcho!==undefined");
        js("window.ew=document.getElementById('echoFrame').contentWindow;window.eg=ew.MoonEcho;ew.MoonGuide.close()");
        for(int orientation:new int[]{android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT,android.content.pm.ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE}){
            scenario.onActivity(a->a.setRequestedOrientation(orientation));
            waitFor(orientation==android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT?"innerHeight>innerWidth":"innerWidth>innerHeight");
            for(int level:new int[]{0,1,2,29}){
                js("eg.choose("+level+");ew.MoonGuide.close()");SystemClock.sleep(300);
                assertEquals("Controls must fit with full touch targets", "true",js("['home','echoSound','levels','up','left','down','right'].every(id=>{const e=ew.document.getElementById(id),r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=ew.innerHeight+.5&&r.left>=0&&r.right<=ew.innerWidth+.5&&r.height>=43.5&&r.width>=43.5&&e.scrollWidth<=e.clientWidth+1})"));
                if(level==2||level==29)echoShot("3d-compact-"+orientation+"-"+(level+1));
            }
        }
        js("eg.choose(0);ew.MoonGuide.close()");tap(echoPoint("right",.5,.5));assertEquals("1",js("eg.game.state.moves"));
        report("MOONCATCH_COMPACT_PASS portrait and landscape navigation, all direction buttons, center/relay/replay/late levels");
    }
    @Test public void editionAndMoonModels() throws Exception {
        open();js("MooncatchSuite.home()");
        String saved=js("JSON.stringify(MooncatchProfileData.snapshot(localStorage))");
        tap(point("chooseOriginal",.5,.5));waitFor("window.MooncatchEdition?.current==='original' && typeof MooncatchSuite==='object' && !!document.getElementById('nativeStart')");
        assertEquals(saved,js("JSON.stringify(MooncatchProfileData.snapshot(localStorage))"));
        assertEquals("true",js("!window.Moon3D && !document.getElementById('sky3d')"));
        tap(point("chooseClassic",.5,.5));startNativeTap();waitFor("state==='playing'");
        scenario.moveToState(androidx.lifecycle.Lifecycle.State.CREATED);SystemClock.sleep(350);scenario.moveToState(androidx.lifecycle.Lifecycle.State.RESUMED);waitFor("state==='paused'");
        js("MooncatchSuite.home()");tap(point("chooseEcho",.5,.5));waitFor("document.getElementById('echoFrame')?.contentWindow.MoonEcho!==undefined");
        js("window.ew=document.getElementById('echoFrame').contentWindow;window.eg=ew.MoonEcho;eg.choose(0)");tap(echoPoint("right",.5,.5));assertEquals("1",js("eg.game.state.moves"));
        js("MooncatchSuite.home()");tap(point("choose3D",.5,.5));waitFor("window.MooncatchEdition?.current==='3d' && typeof MooncatchSuite==='object' && !!document.getElementById('nativeStart')");
        tap(point("chooseClassic",.5,.5));startNativeTap();waitFor("MoonFlight3D.frames>5 && state==='playing'");js("invincible=100");
        assertEquals("\"bright\"",js("MoonFlight3D.view.diagnostics().moonPhase"));
        tap(point("moonToggle",.5,.5));waitFor("MoonFlight3D.view.diagnostics().moonPhase==='dark'");
        assertEquals("true",js("MoonFlight3D.view.diagnostics().activeModelId.endsWith('-dark')"));
        assertEquals("true",js("MoonFlight3D.view.diagnostics().calls<=150 && MoonFlight3D.view.diagnostics().droppedInstances===0"));
        report("MOONCATCH_EDITION_PASS original flight/puzzle, shared records, native background pause, return to3D, real moon phase touch");
    }
    @Test public void naiguaWorldReview() throws Exception {
        open();js("MooncatchSuite.home()");tap(point("chooseNaigua",.5,.5));
        waitFor("window.MooncatchEdition?.current==='naigua' && !!document.getElementById('nativeStart')");
        tap(point("chooseClassic",.5,.5));startNativeTap();
        waitFor("MoonFlight3D.view.diagnostics().theme?.world.ready && state==='playing'");
        for(String world:new String[]{"classic","aurora","warp","ion"}){
            js("state='ready';selectRun('timed');selectWorld('"+world+"');start(true);for(let i=0;i<1500&&!storm?.event;i++){invincible=2;update(.05)}invincible=100;draw(elapsed)");
            assertEquals("true",js("!!boss && MoonFlight3D.snapshot().bossCue.warning"));
            waitFor("MoonFlight3D.view.diagnostics().theme.world.ready");
            SystemClock.sleep(350);
            echoShot("naigua-"+world+"-charge");
            assertEquals("true",js("MoonFlight3D.view.diagnostics().legacyObjects===0 && MoonFlight3D.view.diagnostics().theme.world.dropped===0"));
            report("MOONCATCH_NAIGUA_WORLD "+world+" "+js("JSON.stringify(MoonFlight3D.view.diagnostics())"));
        }
        report("MOONCATCH_NAIGUA_WORLD_PASS four bosses, original photo textures, real GPU, no legacy models");
    }
    @Test public void bossModelReview() throws Exception {
        open();startNativeTap();
        for(String world:new String[]{"classic","aurora","warp","ion"}){
            js("state='ready';selectRun('timed');selectWorld('"+world+"');start(true);for(let i=0;i<1500&&!storm?.event;i++){invincible=2;update(.05)}invincible=100;draw(elapsed)");
            assertEquals("true",js("!!boss && boss.hp>0 && MoonFlight3D.snapshot().bossCue.warning"));
            echoShot("boss-"+world+"-charge");
            waitFor("MoonFlight3D.snapshot().bossCue?.warning===false");echoShot("boss-"+world+"-attack");
            report("MOONCATCH_BOSS "+world+" "+js("JSON.stringify({fps:frameHealth.fps,world:activeWorld,kind:storm.event.kind,render:MoonFlight3D.view.diagnostics()})"));
            assertEquals("true",js("MoonFlight3D.view.diagnostics().calls<=150 && MoonFlight3D.view.diagnostics().droppedInstances===0"));
            assertEquals("false",js("/安全通道|安全间隙|走绿色缺口/.test(document.getElementById('obstacleStatus').textContent)"));
            SystemClock.sleep(1000);
        }
        report("MOONCATCH_BOSS_PASS four distinct bosses charge and attack on real GPU");
    }
    @Test public void laserVisualLifecycle() throws Exception {
        open();js("selectWorld('classic');selectRun('timed')");startNativeTap();
        js("objective=null;elapsed=19.95;laser=null;laserSlot=0;invincible=100");
        waitFor("MoonFlight3D.snapshot().visualBeams[0]?.phase==='charge'");echoShot("3d-laser-charge");
        waitFor("MoonFlight3D.snapshot().visualBeams[0]?.phase==='active'");
        assertEquals("true",js("MoonFlight3D.snapshot().visualBeams.every((b,i)=>[b.x1,b.y1,b.x2,b.y2].every((n,k)=>Math.abs(n-laserSegments(laser)[i][k])<.001))"));
        assertEquals("false",js("/安全通道|安全间隙|走绿色缺口/.test(document.getElementById('obstacleStatus').textContent)"));
        echoShot("3d-laser-active");
        report("MOONCATCH_LASER "+js("JSON.stringify({fps:frameHealth.fps,render:MoonFlight3D.view.diagnostics()})"));
        waitFor("!laser");assertEquals("0",js("MoonFlight3D.snapshot().visualBeams.length"));
        assertEquals("0",js("MoonFlight3D.view.diagnostics().droppedInstances"));
        report("MOONCATCH_LASER_PASS charge, fire, disappearance, aligned gap and no route labels");
    }
    @Test public void threeDRealDeviceReview() throws Exception {
        open();
        tap(point("nativeStart",.5,.5));waitFor("MoonGuide.active");
        assertEquals("\"ready\"",js("state"));echoShot("3d-guide-portrait");
        tap(point("moonGuideSkip",.5,.5));waitFor("state==='playing' && MoonFlight3D.frames>5");
        report("MOONCATCH_GPU "+js("(()=>{const g=document.getElementById('sky3d').getContext('webgl2'),e=g.getExtension('WEBGL_debug_renderer_info');return JSON.stringify({renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER),version:g.getParameter(g.VERSION)})})()"));
        js("invincible=100;selectControlMode('stick')");
        float[] p=point("stickRing",.85,.5);double x=Double.parseDouble(js("ship.x"));long down=SystemClock.uptimeMillis();touch(down,MotionEvent.ACTION_DOWN,p);SystemClock.sleep(300);touch(down,MotionEvent.ACTION_UP,p);assertTrue(Double.parseDouble(js("ship.x"))>x);
        for(String world:new String[]{"classic","aurora","warp","ion","station"}){
            js("state='ready';selectRun('endless');selectWorld('"+world+"');start(true);invincible=100;legIndex=8;elapsed=50;if(station){station.raidSlot=stationRaids().filter(t=>t<elapsed).length;station.rescueSlot=2}");
            // Keep the sampling scene alive without inventing out-of-range shield geometry.
            for(int sample=0;sample<13;sample++){if(world.equals("station"))js("station.hp=4");SystemClock.sleep(500);}
            report("MOONCATCH_3D "+world+" "+js("JSON.stringify({fps:frameHealth.fps,tier:renderTier,state,elapsed,render:MoonFlight3D.view.diagnostics()})"));echoShot("3d-"+world+"-portrait");
            assertEquals("true",js("state==='playing' && MoonFlight3D.view.diagnostics().droppedInstances===0 && Number.isFinite(ship.x+ship.y)"));
        }
        scenario.onActivity(a->a.setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));waitFor("innerWidth>innerHeight");SystemClock.sleep(400);echoShot("3d-flight-landscape");
        js("MooncatchSuite.home()");SystemClock.sleep(250);
        assertEquals("true",js("(()=>{const r=document.getElementById('chooseEcho').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight})()"));
        tap(point("chooseEcho",.5,.5));waitFor("document.getElementById('echoFrame')?.contentWindow.MoonEcho!==undefined");
        js("window.ew=document.getElementById('echoFrame').contentWindow;window.eg=ew.MoonEcho");waitFor("ew.MoonGuide.active");tap(echoPoint("moonGuideSkip",.5,.5));
        tap(echoPoint("right",.5,.5));assertEquals("1",js("eg.game.state.moves"));echoShot("3d-puzzle-landscape");
        scenario.onActivity(a->a.setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT));waitFor("innerHeight>innerWidth");
        js("eg.choose(29);ew.MoonGuide.close()");SystemClock.sleep(350);echoShot("3d-puzzle-late-portrait");
        report("MOONCATCH_PUZZLE_3D "+js("JSON.stringify(ew.__THREE_GAME_DIAGNOSTICS__.state)"));
        js("eg.choose(2);ew.MoonGuide.close()");tap(echoPoint("record",.5,.5));tap(echoPoint("right",.5,.5));String t=js("eg.game.puzzle.time");SystemClock.sleep(700);assertEquals(t,js("eg.game.puzzle.time"));tap(echoPoint("replay",.5,.5));tap(echoPoint("right",.5,.5));assertEquals("true",js("eg.game.puzzle.time===1 && eg.game.puzzle.player.x===eg.game.puzzle.ghost.x"));
        report("MOONCATCH_3D_DEVICE_PASS guide, real touch, five worlds, both orientations, puzzle and synchronized echo");
    }

}
