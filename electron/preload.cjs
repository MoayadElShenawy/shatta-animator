const { contextBridge, ipcRenderer } = require("electron");

/**
 * The only bridge between the Shatta overlay page and the desktop shell.
 * Deliberately tiny: toggling click-through, quitting, and an opt-in
 * developer-context subscription. No filesystem, no shell, no code access.
 */
contextBridge.exposeInMainWorld("shatta", {
  setInteractive: (value) => ipcRenderer.send("pet:interactive", Boolean(value)),
  quit: () => ipcRenderer.send("pet:quit"),
  setDevContext: (enabled) => ipcRenderer.send("pet:dev-context", Boolean(enabled)),
  onDevEvent: (cb) => {
    const handler = (_e, payload) => cb(payload);
    ipcRenderer.on("pet:dev-update", handler);
    return () => ipcRenderer.removeListener("pet:dev-update", handler);
  },
});
