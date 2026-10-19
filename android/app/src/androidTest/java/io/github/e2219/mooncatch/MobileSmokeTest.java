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
        waitFor("typeof MooncatchIsHome==='function'");
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
            try {js("if(state==='playing')pause();clearInput();for(const k of MooncatchProfileData.keys)localStorage.removeItem(k);MooncatchProfileData.merge(localStorage,"+baseline+");window.nativeSaved=false;MooncatchSaveChanged().then(()=>window.nativeSaved=true)");waitFor("window.nativeSaved===true");
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
            js("document.getElementById('nativeStart').click();selectControlMode('"+mode+"');spawn=hazardClock=100;wagerSlot=wagerSchedule.length;adventureSlot=adventureSchedule.length;routeSlot=routeSchedule.length;laserSlot=laserSchedule.length;ship.x=ship.target=W*.35;ship.y=ship.targetY=H*.4");
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
        js("document.getElementById('nativeStart').click()");double beforePause=Double.parseDouble(js("elapsed"));scenario.moveToState(androidx.lifecycle.Lifecycle.State.CREATED);SystemClock.sleep(750);scenario.moveToState(androidx.lifecycle.Lifecycle.State.RESUMED);waitFor("state==='paused'");assertTrue("Game advanced in background",Double.parseDouble(js("elapsed"))<=beforePause+.2);
        js("document.getElementById('start').click()");assertEquals("true",js("state==='playing' && resumeShield>0"));
        // Native bridge storage survives activity destruction and a cold activity launch.
        js("storeSetting('mooncatch-best-v6','731');storeSetting('mooncatch-sound','true');window.nativeSaved=false;MooncatchSaveChanged().then(()=>window.nativeSaved=true)");waitFor("window.nativeSaved===true");scenario.close();open();assertEquals("\"731\"",js("localStorage.getItem('mooncatch-best-v6')"));assertEquals("true",js("sound"));
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
        open();js("document.getElementById('nativeStart').click();selectControlMode('stick')");
        scenario.onActivity(a->a.setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));
        waitFor("W>H");assertEquals("true",js("focusMode && canvasOnly && driverMode()==='stick' && Number.isFinite(ship.x)"));
        scenario.onActivity(a->a.setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT));
        waitFor("H>W");assertEquals("true",js("focusMode && canvasOnly && driverMode()==='stick' && ship.x>=0 && ship.y>=0"));
        js("MooncatchBack()");waitFor("panelOpen");assertEquals("true",js("document.getElementById('gamePanel').getBoundingClientRect().width<=innerWidth"));
    }
    @Test public void endlessDockAndStickResponse() throws Exception {
        open();js("selectedRun='endless';document.getElementById('nativeStart').click();selectControlMode('stick');spawn=hazardClock=100;ship.x=ship.target=W*.35;ship.y=ship.targetY=H*.5");
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
            js("if(!MooncatchIsHome())document.getElementById('nativeReturn').click();selectedWorld='"+world+"';selectedRun='endless';document.getElementById('nativeStart').click();legIndex=8;elapsed=69.9;invincible=100;inputMode='keyboard';ship.x=ship.target=W*.5;ship.y=ship.targetY=H*.8");
            waitFor("boss && boss.maxHp===6");
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
    @Test public void fiveMinuteRenderSoak() throws Exception {
        open();js("document.getElementById('nativeStart').click()");
        long end=SystemClock.uptimeMillis()+300000;int tick=0;
        while(SystemClock.uptimeMillis()<end){
            js("if(state==='over')start();if(state==='paused')pause();if(state==='dock'){selectModule(1);applyModule();departDock()}inputMode='pointer';ship.target=W*(.2+.6*(1+Math.sin("+tick+"*.21))/2);ship.targetY=H*(.25+.5*(1+Math.cos("+tick+"*.17))/2);if(boostCooldown<=0)boost()");
            if(tick%30==0)report("MOONCATCH_SOAK "+js("JSON.stringify({fps:frameHealth.fps,tier:renderTier,elapsed,score,hp})"));
            SystemClock.sleep(500);tick++;
        }
        assertEquals("true",js("Number.isFinite(ship.x) && Number.isFinite(ship.y) && ['playing','over'].includes(state)"));
    }
}
