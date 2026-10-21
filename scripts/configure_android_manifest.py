from pathlib import Path
import re
import sys

manifest = Path("android/app/src/main/AndroidManifest.xml")
if not manifest.exists():
    print(f"Android manifest not found: {manifest}", file=sys.stderr)
    raise SystemExit(1)

content = manifest.read_text(encoding="utf-8")
permission = '    <uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" />'
if "android.permission.QUERY_ALL_PACKAGES" not in content:
    if "    <queries>" in content:
        content = content.replace("    <queries>", permission + "\n    <queries>", 1)
    elif "    <application" in content:
        content = content.replace("    <application", permission + "\n    <application", 1)
    else:
        print("Could not find <application> in Android manifest", file=sys.stderr)
        raise SystemExit(1)

packages = [
    "com.android.chrome",
    "com.google.android.youtube",
    "com.google.android.apps.maps",
    "com.google.android.gm",
    "com.google.android.apps.messaging",
    "com.google.android.dialer",
    "com.google.android.calendar",
    "com.spotify.music",
    "com.whatsapp",
    "com.android.settings",
    "com.android.vending",
]
for package in packages:
    if re.search(r'<package\s+android:name="' + re.escape(package) + r'"\s*/>', content):
        continue
    entry = f'        <package android:name="{package}" />'
    if "<queries>" in content and "</queries>" in content:
        content = content.replace("</queries>", entry + "\n    </queries>", 1)
    else:
        block = "    <queries>\n" + entry + "\n    </queries>\n"
        marker = "    <application"
        if marker not in content:
            print("Could not find <application> in Android manifest", file=sys.stderr)
            raise SystemExit(1)
        content = content.replace(marker, block + marker, 1)

manifest.write_text(content, encoding="utf-8")

package_dir = Path("android/app/src/main/java/com/metacode/jarvisassistant")
package_dir.mkdir(parents=True, exist_ok=True)
(package_dir / "MainActivity.java").write_text("""package com.metacode.jarvisassistant;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppControlPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
""", encoding="utf-8")

(package_dir / "AppControlPlugin.java").write_text("""package com.metacode.jarvisassistant;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CapacitorPlugin(name = "AppControl")
public class AppControlPlugin extends Plugin {
    private Map<String, String> getLaunchablePackages() {
        PackageManager manager = getContext().getPackageManager();
        Intent query = new Intent(Intent.ACTION_MAIN);
        query.addCategory(Intent.CATEGORY_LAUNCHER);
        List<ResolveInfo> activities = manager.queryIntentActivities(query, 0);
        Map<String, String> packages = new HashMap<>();
        String ownPackage = getContext().getPackageName();
        for (ResolveInfo info : activities) {
            if (info.activityInfo == null) continue;
            String packageName = info.activityInfo.packageName;
            if (packageName == null || packageName.equals(ownPackage)) continue;
            CharSequence label = info.loadLabel(manager);
            String name = label == null ? packageName : label.toString().trim();
            if (!name.isEmpty()) packages.put(packageName, name);
        }
        return packages;
    }

    @PluginMethod
    public void listLaunchableApps(PluginCall call) {
        try {
            Map<String, String> packages = getLaunchablePackages();
            List<Map.Entry<String, String>> entries = new ArrayList<>(packages.entrySet());
            Collections.sort(entries, Comparator.comparing(entry -> entry.getValue().toLowerCase()));
            JSArray apps = new JSArray();
            for (Map.Entry<String, String> entry : entries) {
                JSObject app = new JSObject();
                app.put("name", entry.getValue());
                app.put("packageName", entry.getKey());
                app.put("platform", "android");
                apps.put(app);
            }
            JSObject result = new JSObject();
            result.put("apps", apps);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Could not list launchable apps on this phone.", "APP_LIST_FAILED", error);
        }
    }

    @PluginMethod
    public void launchApp(PluginCall call) {
        String packageName = call.getString("packageName");
        if (packageName == null || packageName.trim().isEmpty() || packageName.length() > 255) {
            call.reject("A valid installed-app package is required.", "INVALID_PACKAGE");
            return;
        }
        try {
            Map<String, String> packages = getLaunchablePackages();
            String appName = packages.get(packageName);
            if (appName == null) {
                call.reject("That package is not a launchable app on this phone.", "APP_NOT_FOUND");
                return;
            }
            Intent launchIntent = getContext().getPackageManager().getLaunchIntentForPackage(packageName);
            if (launchIntent == null) {
                call.reject("Android did not provide a launch intent for " + appName + ".", "NO_LAUNCH_INTENT");
                return;
            }
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(launchIntent);
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("name", appName);
            result.put("packageName", packageName);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Android could not launch that app.", "APP_LAUNCH_FAILED", error);
        }
    }
}
""", encoding="utf-8")

print("Configured JARVIS Android app discovery and launch plugin.")
