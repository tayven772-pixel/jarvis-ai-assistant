const { app, BrowserWindow, shell, ipcMain } = require("electron");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

async function listWindowsStartApps() {
  if (process.platform !== "win32") return [];
  const script = "Get-StartApps | Select-Object Name, AppID | ConvertTo-Json -Compress";
  const { stdout } = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
    { windowsHide: true, timeout: 15000, maxBuffer: 8 * 1024 * 1024 }
  );
  const raw = stdout.trim();
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  const items = Array.isArray(parsed) ? parsed : [parsed];
  const seen = new Set();
  return items
    .map(item => ({ name: String(item.Name || "").trim(), appId: String(item.AppID || "").trim(), platform: "windows" }))
    .filter(item => {
      if (!item.name || !item.appId || seen.has(item.appId)) return false;
      seen.add(item.appId);
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

ipcMain.handle("jarvis:desktop:list-apps", async () => listWindowsStartApps());

ipcMain.handle("jarvis:desktop:get-storage-info", async () => {
  if (process.platform !== "win32") throw new Error("System storage reporting is supported on Windows only in the desktop bridge.");
  const script = 'Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | Select-Object DeviceID, VolumeName, Size, FreeSpace | ConvertTo-Json -Compress';
  const { stdout } = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
    { windowsHide: true, timeout: 15000, maxBuffer: 1024 * 1024 }
  );
  const raw = stdout.trim();
  const parsed = raw ? JSON.parse(raw) : [];
  const drives = Array.isArray(parsed) ? parsed : [parsed];
  const volumes = drives.map(drive => {
    const totalBytes = Math.max(0, Number(drive.Size) || 0);
    const freeBytes = Math.max(0, Number(drive.FreeSpace) || 0);
    return {
      name: String(drive.DeviceID || "Drive") + (drive.VolumeName ? " · " + String(drive.VolumeName) : ""),
      totalBytes,
      freeBytes,
      usedBytes: Math.max(0, totalBytes - freeBytes)
    };
  }).filter(volume => volume.totalBytes > 0);
  return { success: true, source: "windows", volumes };
});

ipcMain.handle("jarvis:desktop:launch-app", async (_event, requestedIdentifier) => {
  if (process.platform !== "win32") throw new Error("Installed-app launching through this bridge is supported on Windows only.");
  if (typeof requestedIdentifier !== "string" || requestedIdentifier.trim().length < 1 || requestedIdentifier.length > 512) {
    throw new Error("Missing app identifier. Refresh the installed-app list and try again.");
  }

  const identifier = requestedIdentifier.trim();
  const apps = await listWindowsStartApps();
  const target = apps.find(item => item.appId === identifier || item.name.toLowerCase() === identifier.toLowerCase());
  if (!target) throw new Error("That app is not in the current Windows Start menu app list. Refresh the app list and try again.");

  // Chrome's Start menu AppID is commonly just "Chrome"; launching the executable
  // directly is more reliable than routing it through AppsFolder on some Windows installs.
  if (/^chrome$/i.test(target.appId) || /^google chrome$/i.test(target.name)) {
    await execFileAsync("powershell.exe", [
      "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command",
      "Start-Process -FilePath 'chrome.exe' -ArgumentList '--new-window'"
    ], { windowsHide: true, timeout: 10000, maxBuffer: 1024 * 1024 });
    return { success: true, name: target.name, message: "Opened a new Google Chrome window." };
  }

  await execFileAsync("explorer.exe", ["shell:AppsFolder\\" + target.appId], {
    windowsHide: true,
    timeout: 10000,
    maxBuffer: 1024 * 1024
  });
  return { success: true, name: target.name, message: "Asked Windows to open " + target.name + "." };
});

ipcMain.handle("jarvis:desktop:open-external", async (_event, requestedUrl) => {
  if (typeof requestedUrl !== "string" || requestedUrl.length > 2048 || !/^https:\/\/[a-z0-9.-]+(?::\d+)?(?:\/|$)/i.test(requestedUrl)) {
    throw new Error("Only approved HTTPS links can be opened.");
  }
  await shell.openExternal(requestedUrl);
  return { success: true, message: "Asked Windows to open the link in your default browser." };
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: "#050b18",
    title: "JARVIS AI Assistant",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) shell.openExternal(url);
    return { action: "deny" };
  });

  if (!app.isPackaged) win.loadURL("http://127.0.0.1:5173");
  else win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
