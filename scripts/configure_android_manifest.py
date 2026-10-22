from pathlib import Path
import re
import sys

manifest = Path("android/app/src/main/AndroidManifest.xml")
if not manifest.exists():
    print(f"Android manifest not found: {manifest}", file=sys.stderr)
    raise SystemExit(1)

content = manifest.read_text(encoding="utf-8")
permission = '    <uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" />'
calendar_permission = '    <uses-permission android:name="android.permission.READ_CALENDAR" />\n    <uses-permission android:name="android.permission.WRITE_CALENDAR" />'
if "android.permission.READ_CALENDAR" not in content:
    content = content.replace("    <application", calendar_permission + "\n    <application", 1)

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


# Register the user-enabled accessibility service. Android requires the user to
# explicitly enable this in Settings; the app never enables it silently.
service_decl = '''
        <service
            android:name=".JarvisAccessibilityService"
            android:label="JARVIS Screen Control"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/jarvis_accessibility_service" />
        </service>
'''
if "JarvisAccessibilityService" not in content:
    content = content.replace("</application>", service_decl + "\n    </application>", 1)

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

import android.Manifest;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.provider.CalendarContract;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.TimeZone;
import android.content.pm.ResolveInfo;
import android.os.Environment;
import android.os.StatFs;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.PermissionCallback;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CapacitorPlugin(name = "AppControl", permissions = { @Permission(alias = "calendar", strings = { Manifest.permission.READ_CALENDAR, Manifest.permission.WRITE_CALENDAR }) })
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
    public void getStorageInfo(PluginCall call) {
        try {
            String path = Environment.getExternalStorageDirectory().getAbsolutePath();
            StatFs stats = new StatFs(path);
            long totalBytes = Math.max(0L, stats.getTotalBytes());
            long freeBytes = Math.max(0L, stats.getAvailableBytes());
            JSObject volume = new JSObject();
            volume.put("name", "Internal shared storage");
            volume.put("totalBytes", totalBytes);
            volume.put("freeBytes", freeBytes);
            volume.put("usedBytes", Math.max(0L, totalBytes - freeBytes));
            JSArray volumes = new JSArray();
            volumes.put(volume);
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("source", "android");
            result.put("volumes", volumes);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Could not read storage information on this phone.", "STORAGE_INFO_FAILED", error);
        }
    }

    @PluginMethod
    public void createCalendarEvent(PluginCall call) {
        if (getPermissionState("calendar") != PermissionState.GRANTED) {
            requestPermissionForAlias("calendar", call, "calendarPermissionCallback");
            return;
        }
        insertCalendarEvent(call);
    }

    @PermissionCallback
    private void calendarPermissionCallback(PluginCall call) {
        if (getPermissionState("calendar") == PermissionState.GRANTED) {
            insertCalendarEvent(call);
        } else {
            call.resolve(new JSObject().put("success", false).put("message", "Calendar permission was not granted, so no event was created."));
        }
    }

    private void insertCalendarEvent(PluginCall call) {
        String title = call.getString("title", "").trim();
        String dateText = call.getString("date", "");
        String timeText = call.getString("time", "");
        boolean allDay = call.getBoolean("allDay", true) || timeText.trim().isEmpty();
        int reminderMinutes = call.getInt("reminderMinutes", 900);
        if (title.isEmpty() || title.length() > 180 || !dateText.matches("\\\\d{4}-\\\\d{2}-\\\\d{2}")) {
            call.resolve(new JSObject().put("success", false).put("message", "Provide an event title and date in YYYY-MM-DD format."));
            return;
        }
        if (reminderMinutes < -1 || reminderMinutes > 40320) {
            call.resolve(new JSObject().put("success", false).put("message", "Reminder must be between 0 and 40320 minutes, or -1 for no reminder."));
            return;
        }
        try {
            long startMillis;
            long endMillis;
            String eventTimezone;
            if (allDay) {
                SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US);
                format.setLenient(false);
                format.setTimeZone(TimeZone.getTimeZone("UTC"));
                Date startDate = format.parse(dateText);
                if (startDate == null) throw new ParseException("Invalid date", 0);
                startMillis = startDate.getTime();
                endMillis = startMillis + 24L * 60L * 60L * 1000L;
                eventTimezone = "UTC";
            } else {
                if (!timeText.matches("\\\\d{2}:\\\\d{2}")) {
                    call.resolve(new JSObject().put("success", false).put("message", "Provide time in 24-hour HH:mm format."));
                    return;
                }
                SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd HH:mm", java.util.Locale.US);
                format.setLenient(false);
                Date startDate = format.parse(dateText + " " + timeText);
                if (startDate == null) throw new ParseException("Invalid date or time", 0);
                startMillis = startDate.getTime();
                endMillis = startMillis + 30L * 60L * 1000L;
                eventTimezone = TimeZone.getDefault().getID();
            }

            String[] projection = { CalendarContract.Calendars._ID };
            String selection = CalendarContract.Calendars.VISIBLE + "=? AND " + CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL + ">=?";
            String[] selectionArgs = { "1", String.valueOf(CalendarContract.Calendars.CAL_ACCESS_CONTRIBUTOR) };
            long calendarId = -1;
            try (Cursor cursor = getContext().getContentResolver().query(
                    CalendarContract.Calendars.CONTENT_URI, projection, selection, selectionArgs,
                    CalendarContract.Calendars.IS_PRIMARY + " DESC, " + CalendarContract.Calendars._ID + " ASC")) {
                if (cursor != null && cursor.moveToFirst()) calendarId = cursor.getLong(0);
            }
            if (calendarId < 0) {
                call.resolve(new JSObject().put("success", false).put("message", "No writable calendar was found. Add or enable a calendar in your Calendar app first."));
                return;
            }

            ContentValues values = new ContentValues();
            values.put(CalendarContract.Events.CALENDAR_ID, calendarId);
            values.put(CalendarContract.Events.TITLE, title);
            values.put(CalendarContract.Events.DTSTART, startMillis);
            values.put(CalendarContract.Events.DTEND, endMillis);
            values.put(CalendarContract.Events.EVENT_TIMEZONE, eventTimezone);
            values.put(CalendarContract.Events.ALL_DAY, allDay ? 1 : 0);
            values.put(CalendarContract.Events.HAS_ALARM, reminderMinutes >= 0 ? 1 : 0);
            android.net.Uri eventUri = getContext().getContentResolver().insert(CalendarContract.Events.CONTENT_URI, values);
            if (eventUri == null) {
                call.resolve(new JSObject().put("success", false).put("message", "Android did not create the calendar event."));
                return;
            }

            boolean reminderCreated = reminderMinutes < 0;
            if (reminderMinutes >= 0) {
                long eventId = Long.parseLong(eventUri.getLastPathSegment());
                ContentValues reminder = new ContentValues();
                reminder.put(CalendarContract.Reminders.EVENT_ID, eventId);
                reminder.put(CalendarContract.Reminders.MINUTES, reminderMinutes);
                reminder.put(CalendarContract.Reminders.METHOD, CalendarContract.Reminders.METHOD_ALERT);
                reminderCreated = getContext().getContentResolver().insert(CalendarContract.Reminders.CONTENT_URI, reminder) != null;
            }
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("eventId", eventUri.getLastPathSegment());
            result.put("title", title);
            result.put("date", dateText);
            result.put("allDay", allDay);
            result.put("reminderCreated", reminderCreated);
            result.put("message", reminderMinutes < 0 ? "Created the calendar event without a reminder."
                : reminderCreated ? "Created the calendar event and its notification." : "Created the calendar event, but Android did not save its notification.");
            call.resolve(result);
        } catch (Exception error) {
            call.resolve(new JSObject().put("success", false).put("message", "Calendar event creation failed: " + error.getMessage()));
        }
    }

    @PluginMethod
    public void accessibilityStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("enabled", JarvisAccessibilityService.isConnected());
        call.resolve(result);
    }

    @PluginMethod
    public void openAccessibilitySettings(PluginCall call) {
        try {
            Intent intent = new Intent(android.provider.Settings.ACTION_ACCESSIBILITY_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Could not open Android Accessibility settings.", "ACCESSIBILITY_SETTINGS_FAILED", error);
        }
    }

    @PluginMethod
    public void inspectScreen(PluginCall call) {
        JarvisAccessibilityService service = JarvisAccessibilityService.getInstance();
        if (service == null) {
            call.reject("Enable JARVIS Screen Control in Android Accessibility settings first.", "ACCESSIBILITY_NOT_ENABLED");
            return;
        }
        try { call.resolve(service.inspectScreen()); }
        catch (Exception error) { call.reject("Could not inspect the current screen.", "SCREEN_INSPECT_FAILED", error); }
    }

    @PluginMethod
    public void tapText(PluginCall call) {
        JarvisAccessibilityService service = JarvisAccessibilityService.getInstance();
        String target = call.getString("text");
        if (service == null) { call.reject("Enable JARVIS Screen Control in Android Accessibility settings first.", "ACCESSIBILITY_NOT_ENABLED"); return; }
        if (target == null || target.trim().isEmpty() || target.length() > 180) { call.reject("Provide the visible text to tap.", "INVALID_TARGET"); return; }
        JSObject result = service.tapText(target.trim());
        call.resolve(result);
    }

    @PluginMethod
    public void typeText(PluginCall call) {
        JarvisAccessibilityService service = JarvisAccessibilityService.getInstance();
        String value = call.getString("text");
        if (service == null) { call.reject("Enable JARVIS Screen Control in Android Accessibility settings first.", "ACCESSIBILITY_NOT_ENABLED"); return; }
        if (value == null || value.length() > 2000) { call.reject("Text must be 2000 characters or fewer.", "INVALID_TEXT"); return; }
        JSObject result = service.typeText(value);
        call.resolve(result);
    }

    @PluginMethod
    public void scrollScreen(PluginCall call) {
        JarvisAccessibilityService service = JarvisAccessibilityService.getInstance();
        String direction = call.getString("direction", "down");
        if (service == null) { call.reject("Enable JARVIS Screen Control in Android Accessibility settings first.", "ACCESSIBILITY_NOT_ENABLED"); return; }
        if (!"up".equals(direction) && !"down".equals(direction) && !"left".equals(direction) && !"right".equals(direction)) { call.reject("Choose up, down, left, or right.", "INVALID_DIRECTION"); return; }
        JSObject result = service.scrollScreen(direction);
        call.resolve(result);
    }

    @PluginMethod
    public void navigationAction(PluginCall call) {
        JarvisAccessibilityService service = JarvisAccessibilityService.getInstance();
        String action = call.getString("action");
        if (service == null) { call.reject("Enable JARVIS Screen Control in Android Accessibility settings first.", "ACCESSIBILITY_NOT_ENABLED"); return; }
        if (!"back".equals(action) && !"home".equals(action) && !"recents".equals(action)) { call.reject("Choose back, home, or recents.", "INVALID_ACTION"); return; }
        JSObject result = service.navigationAction(action);
        call.resolve(result);
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


(package_dir / "JarvisAccessibilityService.java").write_text("""package com.metacode.jarvisassistant;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.os.Bundle;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class JarvisAccessibilityService extends AccessibilityService {
    private static volatile JarvisAccessibilityService instance;
    private static final int MAX_NODES = 100;

    public static JarvisAccessibilityService getInstance() { return instance; }
    public static boolean isConnected() { return instance != null; }

    @Override public void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
        AccessibilityServiceInfo info = getServiceInfo();
        if (info != null) {
            info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
                | AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
                | AccessibilityEvent.TYPE_VIEW_SCROLLED;
            info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
            info.flags |= AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
                | AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS;
            info.notificationTimeout = 120;
            setServiceInfo(info);
        }
    }

    @Override public void onAccessibilityEvent(AccessibilityEvent event) { }
    @Override public void onInterrupt() { }
    @Override public void onDestroy() {
        if (instance == this) instance = null;
        super.onDestroy();
    }

    public JSObject inspectScreen() {
        JSObject result = new JSObject();
        AccessibilityNodeInfo root = getRootInActiveWindow();
        JSArray nodes = new JSArray();
        if (root != null) {
            int[] count = new int[]{0};
            appendNodes(root, nodes, count);
            result.put("packageName", String.valueOf(root.getPackageName()));
        } else {
            result.put("packageName", "");
        }
        result.put("nodes", nodes);
        result.put("count", nodes.length());
        result.put("message", root == null ? "No active accessibility window is available." : "Read visible accessibility labels. Password fields are excluded.");
        return result;
    }

    private void appendNodes(AccessibilityNodeInfo node, JSArray out, int[] count) {
        if (node == null || count[0] >= MAX_NODES) return;
        count[0]++;
        if (!node.isPassword()) {
            CharSequence text = node.getText();
            CharSequence desc = node.getContentDescription();
            String label = text != null ? text.toString().trim() : "";
            String description = desc != null ? desc.toString().trim() : "";
            if (!label.isEmpty() || !description.isEmpty() || node.isClickable() || node.isEditable()) {
                JSObject item = new JSObject();
                item.put("text", label.length() > 220 ? label.substring(0, 220) : label);
                item.put("description", description.length() > 220 ? description.substring(0, 220) : description);
                item.put("clickable", node.isClickable());
                item.put("editable", node.isEditable());
                item.put("className", String.valueOf(node.getClassName()));
                item.put("viewId", String.valueOf(node.getViewIdResourceName()));
                android.graphics.Rect bounds = new android.graphics.Rect();
                node.getBoundsInScreen(bounds);
                JSObject box = new JSObject();
                box.put("left", bounds.left);
                box.put("top", bounds.top);
                box.put("right", bounds.right);
                box.put("bottom", bounds.bottom);
                item.put("bounds", box);
                out.put(item);
            }
        }
        for (int i = 0; i < node.getChildCount() && count[0] < MAX_NODES; i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) appendNodes(child, out, count);
        }
    }

    private boolean clickMatching(AccessibilityNodeInfo node, String target) {
        if (node == null) return false;
        if (!node.isPassword()) {
            String text = node.getText() == null ? "" : node.getText().toString().trim();
            String desc = node.getContentDescription() == null ? "" : node.getContentDescription().toString().trim();
            if (text.equalsIgnoreCase(target) || desc.equalsIgnoreCase(target)) {
                AccessibilityNodeInfo candidate = node;
                for (int depth = 0; candidate != null && depth < 5; depth++) {
                    if (candidate.isClickable() && candidate.performAction(AccessibilityNodeInfo.ACTION_CLICK)) return true;
                    candidate = candidate.getParent();
                }
            }
        }
        for (int i = 0; i < node.getChildCount(); i++) {
            if (clickMatching(node.getChild(i), target)) return true;
        }
        return false;
    }

    public JSObject tapText(String target) {
        JSObject result = new JSObject();
        AccessibilityNodeInfo root = getRootInActiveWindow();
        boolean success = root != null && clickMatching(root, target);
        result.put("success", success);
        result.put("message", success ? "Tapped the visible control labelled " + target + "." : "Could not find a clickable control with that exact visible label. Inspect the screen and use the exact label.");
        return result;
    }

    public JSObject typeText(String value) {
        JSObject result = new JSObject();
        AccessibilityNodeInfo root = getRootInActiveWindow();
        AccessibilityNodeInfo field = findFocusedEditable(root);
        if (field == null) {
            result.put("success", false);
            result.put("message", "No focused editable text field was found. Tap a text field first.");
            return result;
        }
        Bundle args = new Bundle();
        args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, value);
        boolean success = field.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args);
        if (!success) {
            ClipboardManager clipboard = (ClipboardManager)getSystemService(Context.CLIPBOARD_SERVICE);
            clipboard.setPrimaryClip(ClipData.newPlainText("JARVIS text", value));
            success = field.performAction(AccessibilityNodeInfo.ACTION_PASTE);
        }
        result.put("success", success);
        result.put("message", success ? "Entered text into the focused field." : "Android rejected text entry into the focused field.");
        return result;
    }

    private AccessibilityNodeInfo findFocusedEditable(AccessibilityNodeInfo node) {
        if (node == null) return null;
        if (!node.isPassword() && node.isEditable() && node.isFocused()) return node;
        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo found = findFocusedEditable(node.getChild(i));
            if (found != null) return found;
        }
        return null;
    }

    public JSObject scrollScreen(String direction) {
        JSObject result = new JSObject();
        AccessibilityNodeInfo root = getRootInActiveWindow();
        int action = "up".equals(direction) ? AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD
            : "down".equals(direction) ? AccessibilityNodeInfo.ACTION_SCROLL_FORWARD
            : "left".equals(direction) ? AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD
            : AccessibilityNodeInfo.ACTION_SCROLL_FORWARD;
        boolean success = scrollFirst(root, action);
        result.put("success", success);
        result.put("message", success ? "Scrolled " + direction + "." : "No scrollable control accepted the scroll action.");
        return result;
    }

    private boolean scrollFirst(AccessibilityNodeInfo node, int action) {
        if (node == null) return false;
        if (node.isScrollable() && node.performAction(action)) return true;
        for (int i = 0; i < node.getChildCount(); i++) {
            if (scrollFirst(node.getChild(i), action)) return true;
        }
        return false;
    }

    public JSObject navigationAction(String action) {
        int global = "back".equals(action) ? GLOBAL_ACTION_BACK
            : "home".equals(action) ? GLOBAL_ACTION_HOME : GLOBAL_ACTION_RECENTS;
        boolean success = performGlobalAction(global);
        JSObject result = new JSObject();
        result.put("success", success);
        result.put("message", success ? "Performed Android " + action + " navigation." : "Android did not accept the navigation action.");
        return result;
    }
}
""", encoding="utf-8")

xml_dir = Path("android/app/src/main/res/xml")
xml_dir.mkdir(parents=True, exist_ok=True)
(xml_dir / "jarvis_accessibility_service.xml").write_text("""<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:description="@string/app_name"
    android:accessibilityEventTypes="typeWindowStateChanged|typeWindowContentChanged|typeViewScrolled"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:notificationTimeout="120"
    android:canRetrieveWindowContent="true"
    android:canPerformGestures="true"
    android:accessibilityFlags="flagReportViewIds|flagRetrieveInteractiveWindows" />
""", encoding="utf-8")

print("Configured JARVIS Android app discovery and launch plugin.")
