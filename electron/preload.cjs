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

/**
 * Scoped filesystem bridge. The renderer can ONLY name a scope
 * ("desktop" | "documents" | "downloads") plus a relative path — the main
 * process resolves it and refuses anything that escapes the scope root.
 * No delete, no shell, no arbitrary absolute paths, no file contents.
 */
contextBridge.exposeInMainWorld("shattaFs", {
  scopes: () => ipcRenderer.invoke("fs:scopes"),
  search: (input) => ipcRenderer.invoke("fs:search", input),
  copy: (input) => ipcRenderer.invoke("fs:copy", input),
  move: (input) => ipcRenderer.invoke("fs:move", input),
  remove: (input) => ipcRenderer.invoke("fs:remove", input),
  grants: () => ipcRenderer.invoke("fs:grants"),
  requestFolderAccess: () => ipcRenderer.invoke("fs:requestFolder"),
  requestDeviceAccess: () => ipcRenderer.invoke("fs:requestDevice"),
  revokeAllAccess: () => ipcRenderer.invoke("fs:revokeAll"),
  runCommand: (input) => ipcRenderer.invoke("fs:command", input),
});
