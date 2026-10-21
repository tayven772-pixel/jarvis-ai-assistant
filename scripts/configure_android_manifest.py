from pathlib import Path
import re
import sys

manifest = Path("android/app/src/main/AndroidManifest.xml")
if not manifest.exists():
    print(f"Android manifest not found: {manifest}", file=sys.stderr)
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

content = manifest.read_text(encoding="utf-8")
for package in packages:
    if re.search(r'<package\s+android:name="' + re.escape(package) + r'"\s*/>', content):
        continue
    entry = f'        <package android:name="{package}" />'
    if "<queries>" in content and "</queries>" in content:
        content = content.replace("</queries>", entry + "\n    </queries>", 1)
    else:
        queries = "    <queries>\n" + entry + "\n    </queries>\n"
        marker = "    <application"
        if marker not in content:
            print("Could not find <application> in Android manifest", file=sys.stderr)
            raise SystemExit(1)
        content = content.replace(marker, queries + marker, 1)

manifest.write_text(content, encoding="utf-8")
print("Added Android package-visibility declarations for supported JARVIS app shortcuts.")
