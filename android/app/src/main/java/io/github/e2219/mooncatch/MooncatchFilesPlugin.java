package io.github.e2219.mooncatch;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.view.WindowManager;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "MooncatchFiles")
public class MooncatchFilesPlugin extends Plugin {
    @PluginMethod public void exportBackup(PluginCall call) {
        String text = call.getString("text");
        if (text == null || text.length() > 65536) { call.reject("备份内容无效"); return; }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
            .setType("application/json").putExtra(Intent.EXTRA_TITLE, "mooncatch-save.json");
        startActivityForResult(call, intent, "exportResult");
    }
    @ActivityCallback private void exportResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Uri uri = result.getData() == null ? null : result.getData().getData();
        if (result.getResultCode() != Activity.RESULT_OK || uri == null) { call.reject("已取消导出"); return; }
        try (OutputStream output = getContext().getContentResolver().openOutputStream(uri, "wt")) {
            if (output == null) throw new Exception("无法打开文件");
            output.write(call.getString("text", "").getBytes(StandardCharsets.UTF_8));
            call.resolve();
        } catch (Exception error) { call.reject("无法保存备份", error); }
    }
    @PluginMethod public void importBackup(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
        startActivityForResult(call, intent, "importResult");
    }
    @ActivityCallback private void importResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Uri uri = result.getData() == null ? null : result.getData().getData();
        if (result.getResultCode() != Activity.RESULT_OK || uri == null) { call.reject("已取消导入"); return; }
        try (InputStream input = getContext().getContentResolver().openInputStream(uri);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            if (input == null) throw new Exception("无法打开文件");
            byte[] buffer = new byte[4096]; int read;
            while ((read = input.read(buffer)) != -1) {
                if (output.size() + read > 65536) throw new Exception("备份文件过大");
                output.write(buffer, 0, read);
            }
            call.resolve(new JSObject().put("text", output.toString(StandardCharsets.UTF_8.name())));
        } catch (Exception error) { call.reject("无法读取备份（上限 64 KB）", error); }
    }
    @PluginMethod public void getInsets(PluginCall call) { call.resolve(((MainActivity)getActivity()).getSafeInsets()); }
    @PluginMethod public void setAwake(PluginCall call) {
        boolean awake = Boolean.TRUE.equals(call.getBoolean("awake", false));
        getActivity().runOnUiThread(() -> {
            if (awake) getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            call.resolve();
        });
    }
}
