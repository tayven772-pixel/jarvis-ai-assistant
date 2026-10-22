const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("jarvisDesktop", {
  listApps: () => ipcRenderer.invoke("jarvis:desktop:list-apps"),
  getStorageInfo: () => ipcRenderer.invoke("jarvis:desktop:get-storage-info"),
  launchApp: appId => ipcRenderer.invoke("jarvis:desktop:launch-app", appId),
  openExternal: url => ipcRenderer.invoke("jarvis:desktop:open-external", url)
});
