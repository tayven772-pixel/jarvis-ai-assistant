const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("jarvisDesktop", {
  listApps: () => ipcRenderer.invoke("jarvis:desktop:list-apps"),
  launchApp: appId => ipcRenderer.invoke("jarvis:desktop:launch-app", appId),
  openExternal: url => ipcRenderer.invoke("jarvis:desktop:open-external", url)
});
