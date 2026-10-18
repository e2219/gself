package io.github.e2219.mooncatch;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;

public class MainActivity extends BridgeActivity {
    private JSObject safeInsets = new JSObject();
    private boolean leftForeground = false;
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MooncatchFilesPlugin.class);
        super.onCreate(savedInstanceState);
        if (getBridge() == null) return; // Keep Capacitor's WebView installation/recovery screen.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams params = getWindow().getAttributes();
            params.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(params);
        }
        View web = getBridge().getWebView();
        ViewCompat.setOnApplyWindowInsetsListener(web, (view, insets) -> {
            Insets safe = insets.getInsets(WindowInsetsCompat.Type.displayCutout() | WindowInsetsCompat.Type.mandatorySystemGestures());
            float density = getResources().getDisplayMetrics().density;
            safeInsets = new JSObject().put("top", safe.top / density).put("right", safe.right / density)
                .put("bottom", safe.bottom / density).put("left", safe.left / density);
            getBridge().triggerWindowJSEvent("mooncatchInsets", safeInsets.toString());
            return insets;
        });
        ViewCompat.requestApplyInsets(web);
        immersive();
    }
    public JSObject getSafeInsets() { return safeInsets; }
    private void immersive() {
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsetsCompat.Type.systemBars());
    }
    @Override public void onWindowFocusChanged(boolean focus) {
        super.onWindowFocusChanged(focus);
        if (focus) immersive();
    }
    @Override public void onResume() {
        super.onResume();
        if (leftForeground && getBridge() != null) {
            // WebView can defer background JS callbacks. Reapply pause before accepting foreground input.
            getBridge().getWebView().evaluateJavascript("window.MooncatchLifecycle?.(false);window.MooncatchLifecycle?.(true)", null);
            leftForeground = false;
        }
    }
    @Override public void onPause() {
        leftForeground = true;
        if (getBridge() != null) getBridge().getWebView().evaluateJavascript("window.MooncatchLifecycle?.(false)", null);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        super.onPause();
    }
}
