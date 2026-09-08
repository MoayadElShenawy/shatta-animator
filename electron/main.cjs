const { app, BrowserWindow, screen, ipcMain, Menu, Tray, nativeImage, shell } = require("electron");
const { execFile } = require("child_process");
const path = require("path");
const fs = require("fs");

/**
 * Shatta desktop shell.
 *
 * The overlay itself is the SAME React app as the website (route `/overlay`),
 * so the desktop companion always runs the current character engine, AI chat and
 * voice stack. If the app can't be reached, we fall back to the bundled
 * offline Shatta page.
 */

const APP_URL = process.env.SHATTA_APP_URL || "http://localhost:8080";
const OVERLAY_URL = `${APP_URL.replace(/\/$/, "")}/overlay`;
const ALLOWED_ORIGIN = new URL(APP_URL).origin;

let win = null;
let tray = null;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    hasShadow: false,
    skipTaskbar: true,
    // focusable so the quick-chat composer can actually receive typing
    focusable: true,
    alwaysOnTop: true,
    fullscreenable: false,
    backgroundColor: "#00000000",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // Clicks pass through to whatever is behind, except where Shatta / her UI is.
  win.setIgnoreMouseEvents(true, { forward: true });

  // Microphone (voice input) only for our own origin, nothing else.
  win.webContents.session.setPermissionRequestHandler((wc, permission, callback) => {
    const origin = new URL(wc.getURL() || "about:blank").origin;
    callback(origin === ALLOWED_ORIGIN && (permission === "media" || permission === "audioCapture"));
  });

  // External links open in the real browser, never inside the overlay.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.loadURL(OVERLAY_URL).catch(loadOffline);
  win.webContents.on("did-fail-load", loadOffline);
}

function loadOffline() {
  if (win && !win.isDestroyed()) win.loadFile(path.join(__dirname, "pet.html"));
}

ipcMain.on("pet:interactive", (_e, interactive) => {
  if (!win) return;
  win.setIgnoreMouseEvents(!interactive, { forward: true });
});

ipcMain.on("pet:quit", () => app.quit());

/* ---------------- Developer context (opt-in, read-only, no source code) --------------- */

const PROJECT_DIR = process.env.SHATTA_PROJECT || null;
let devTimer = null;
let lastSignature = "";

function git(args) {
  return new Promise((resolve) => {
    execFile("git", ["-C", PROJECT_DIR, ...args], { timeout: 4000 }, (err, stdout) => {
      resolve(err ? null : String(stdout).trim());
    });
  });
}

async function pollDevContext() {
  if (!PROJECT_DIR || !win || win.isDestroyed()) return;
  if (!fs.existsSync(path.join(PROJECT_DIR, ".git"))) return;

  const branch = await git(["rev-parse", "--abbrev-ref", "HEAD"]);
  const status = await git(["status", "--porcelain"]);
  const changedFiles = status === null ? null : status ? status.split("\n").length : 0;

  const context = {
    project: path.basename(PROJECT_DIR),
    branch,
    changedFiles,
    lastEvent: null,
  };

  const signature = `${branch}|${changedFiles}`;
  let event = null;
  if (lastSignature && signature !== lastSignature) {
    event = { kind: "git", status: "success", label: `branch ${branch}` };
    context.lastEvent = { ...event, at: Date.now() };
  }
  lastSignature = signature;

  win.webContents.send("pet:dev-update", { context, event });
}

ipcMain.on("pet:dev-context", (_e, enabled) => {
  if (devTimer) {
    clearInterval(devTimer);
    devTimer = null;
  }
  lastSignature = "";
  if (!enabled || !PROJECT_DIR) return;
  void pollDevContext();
  devTimer = setInterval(pollDevContext, 8000);
});

/* -------------------------------------- tray ----------------------------------------- */

function createTray() {
  const iconPath = path.join(__dirname, "assets", "shatta-idle.png");
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath).resize({ width: 18, height: 18 })
    : nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip("Shatta");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Shatta is causing chaos on your desktop 🐈", enabled: false },
      { label: PROJECT_DIR ? `Project: ${path.basename(PROJECT_DIR)}` : "No project folder set", enabled: false },
      { type: "separator" },
      { label: "Reload overlay", click: () => win && win.loadURL(OVERLAY_URL).catch(loadOffline) },
      { label: "Quit Shatta", click: () => app.quit() },
    ]),
  );
}

app.whenReady().then(() => {
  createWindow();
  try {
    createTray();
  } catch {
    // tray is optional on some Linux desktops
  }
});

app.on("window-all-closed", () => app.quit());

/* --------------------- scoped filesystem bridge ---------------------
 * The renderer never sends an OS path. It sends { scope, path } where scope is
 * either a built-in user folder, a folder the user picked in an OS dialog, or
 * "device" after an explicit whole-device grant. Everything is resolved here
 * and rejected if it escapes its root. Grants live in memory only.
 *
 * Deletion moves items to the OS trash (recoverable) and only runs when the
 * renderer already collected an explicit confirmation. System commands are a
 * fixed allowlist of safe actions — there is no shell.
 */

const DEFAULT_SCOPES = ["desktop", "documents", "downloads"];
const MAX_DEPTH = 4;
const MAX_ENTRIES = 4000;

/** id -> absolute root, for folders the user explicitly picked this session. */
const grantedFolders = new Map();
let deviceGranted = false;

function homeRoot() {
  try {
    return app.getPath("home");
  } catch {
    return null;
  }
}

function scopeRoot(scope) {
  try {
    if (scope === "desktop") return app.getPath("desktop");
    if (scope === "documents") return app.getPath("documents");
    if (scope === "downloads") return app.getPath("downloads");
  } catch {
    return null;
  }
  if (scope === "device") return deviceGranted ? homeRoot() : null;
  const granted = grantedFolders.get(scope);
  return granted || null;
}

function activeScopes() {
  const scopes = DEFAULT_SCOPES.filter((s) => scopeRoot(s));
  for (const id of grantedFolders.keys()) scopes.push(id);
  if (deviceGranted) scopes.push("device");
  return scopes;
}

function fsError(reason, error) {
  return { ok: false, reason, error };
}

/** Never let a scope resolve into another user's home or a system directory. */
function isForbiddenRoot(full) {
  const home = homeRoot();
  const lower = full.toLowerCase();
  const blocked = ["/system", "/library/keychains", "/etc", "/private/etc", "/windows", "/proc", "/sys"];
  if (blocked.some((b) => lower === b || lower.startsWith(b + path.sep) || lower.startsWith(b + "/"))) return true;
  if (/(^|[/\\])\.ssh([/\\]|$)/i.test(full) || /(^|[/\\])\.aws([/\\]|$)/i.test(full)) return true;
  if (home && /^\/(users|home)\//i.test(full)) {
    const homeNorm = path.resolve(home) + path.sep;
    if (!(path.resolve(full) + path.sep).startsWith(homeNorm)) return true;
  }
  return false;
}

/** Resolve a scoped relative path, guaranteeing it stays inside its root. */
function resolveScoped(location) {
  if (!location || typeof location !== "object") return { error: fsError("invalid", "Missing location.") };
  const { scope, path: rel } = location;
  if (typeof scope !== "string" || !scopeRoot(scope)) {
    return { error: fsError("denied", `Scope "${scope}" is not allowed.`) };
  }
  if (typeof rel !== "string" || !rel.trim()) return { error: fsError("invalid", "Missing path.") };
  if (rel.includes("\0")) return { error: fsError("invalid", "Invalid path.") };
  const root = scopeRoot(scope);
  const normalizedRoot = path.resolve(root) + path.sep;
  const full = path.resolve(root, rel);
  if (full !== path.resolve(root) && !full.startsWith(normalizedRoot)) {
    return { error: fsError("denied", "Path escapes its allowed folder.") };
  }
  // Symlinks must not be used to hop outside the root either.
  try {
    if (fs.existsSync(full)) {
      const real = fs.realpathSync(full);
      const realRoot = fs.realpathSync(root);
      if (real !== realRoot && !real.startsWith(path.resolve(realRoot) + path.sep)) {
        return { error: fsError("denied", "Path escapes its allowed folder.") };
      }
      if (isForbiddenRoot(real)) return { error: fsError("denied", "That location is protected.") };
    }
  } catch {
    return { error: fsError("failed", "Could not verify the path.") };
  }
  if (isForbiddenRoot(full)) return { error: fsError("denied", "That location is protected.") };
  return { root, full };
}

function walk(root, matcher, out, depth, budget) {
  if (depth > MAX_DEPTH || out.length >= budget.limit || budget.seen > MAX_ENTRIES) return;
  let entries = [];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (out.length >= budget.limit || budget.seen > MAX_ENTRIES) return;
    budget.seen += 1;
    if (entry.name.startsWith(".")) continue;
    const full = path.join(root, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (isForbiddenRoot(full)) continue;
    if (matcher(entry.name)) {
      let stat = null;
      try {
        stat = fs.statSync(full);
      } catch {
        stat = null;
      }
      out.push({ full, name: entry.name, type: entry.isDirectory() ? "folder" : "file", stat });
    }
    if (entry.isDirectory()) walk(full, matcher, out, depth + 1, budget);
  }
}

ipcMain.handle("fs:scopes", () => activeScopes());

ipcMain.handle("fs:grants", () => ({
  ok: true,
  data: {
    device: deviceGranted,
    folders: [...grantedFolders.entries()].map(([id, root]) => ({ id, label: path.basename(root) || root })),
  },
}));

/** Explicit user gesture: pick a folder in the OS dialog. */
ipcMain.handle("fs:requestFolder", async () => {
  const { dialog } = require("electron");
  const res = await dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] });
  if (res.canceled || !res.filePaths.length) return { ok: true, data: null };
  const root = res.filePaths[0];
  if (isForbiddenRoot(root)) return fsError("denied", "That folder is protected.");
  const id = "g" + Math.random().toString(36).slice(2, 10);
  grantedFolders.set(id, root);
  return { ok: true, data: { id, label: path.basename(root) || root } };
});

/** Explicit user gesture: whole-device access, still limited to this user. */
ipcMain.handle("fs:requestDevice", async () => {
  const { dialog } = require("electron");
  const res = await dialog.showMessageBox({
    type: "warning",
    buttons: ["Cancel", "Allow"],
    defaultId: 0,
    cancelId: 0,
    message: "Allow Shatta to reach every folder in your user account?",
    detail: "Shatta can then search, copy, move and trash files anywhere in your home folder. System folders and other users stay off limits.",
  });
  deviceGranted = res.response === 1;
  return { ok: true, data: { granted: deviceGranted } };
});

ipcMain.handle("fs:revokeAll", () => {
  grantedFolders.clear();
  deviceGranted = false;
  return { ok: true, data: { revoked: true } };
});

ipcMain.handle("fs:search", (_e, input) => {
  const query = input && typeof input.query === "string" ? input.query.trim().toLowerCase() : "";
  if (!query || query.includes("..") || /[/\\\0]/.test(query)) {
    return fsError("invalid", "Invalid search query.");
  }
  const limit = Math.min(Math.max(1, Number(input && input.limit) || 10), 25);
  const all = activeScopes();
  const scopes = input && typeof input.scope === "string" && all.includes(input.scope) ? [input.scope] : all;
  const matcher = (name) => name.toLowerCase().includes(query);
  const results = [];
  for (const scope of scopes) {
    const root = scopeRoot(scope);
    if (!root || !fs.existsSync(root)) continue;
    const hits = [];
    walk(root, matcher, hits, 0, { limit, seen: 0 });
    for (const hit of hits) {
      results.push({
        name: hit.name,
        scope,
        path: path.relative(root, hit.full).split(path.sep).join("/"),
        type: hit.type,
        ...(hit.stat ? { sizeBytes: hit.stat.size, modifiedAt: hit.stat.mtimeMs } : {}),
      });
      if (results.length >= limit) break;
    }
    if (results.length >= limit) break;
  }
  return { ok: true, data: results };
});

function transfer(input, mode) {
  const source = resolveScoped(input && input.source);
  if (source.error) return source.error;
  const destination = resolveScoped(input && input.destination);
  if (destination.error) return destination.error;
  if (!fs.existsSync(source.full)) return fsError("not_found", "Source file was not found.");
  let stat;
  try {
    stat = fs.statSync(source.full);
  } catch {
    return fsError("failed", "Could not read the source file.");
  }
  if (!stat.isFile()) return fsError("invalid", "Only files can be copied or moved.");
  if (fs.existsSync(destination.full)) {
    return fsError("exists", "A file already exists at the destination — nothing was overwritten.");
  }
  try {
    fs.mkdirSync(path.dirname(destination.full), { recursive: true });
    if (mode === "copy") fs.copyFileSync(source.full, destination.full, fs.constants.COPYFILE_EXCL);
    else fs.renameSync(source.full, destination.full);
  } catch (err) {
    if (err && err.code === "EEXIST") return fsError("exists", "Destination already exists.");
    if (err && err.code === "EXDEV" && mode === "move") {
      try {
        fs.copyFileSync(source.full, destination.full, fs.constants.COPYFILE_EXCL);
        fs.unlinkSync(source.full);
      } catch {
        return fsError("failed", "Move across drives failed.");
      }
    } else {
      return fsError("failed", "The operation failed.");
    }
  }
  return { ok: true, data: { destination: input.destination } };
}

ipcMain.handle("fs:copy", (_e, input) => transfer(input, "copy"));
ipcMain.handle("fs:move", (_e, input) => transfer(input, "move"));

/**
 * Deletion = move to the OS trash. Recoverable by design; the renderer has
 * already obtained an explicit, target-bound confirmation from the user.
 */
ipcMain.handle("fs:remove", async (_e, input) => {
  const target = resolveScoped(input && input.target);
  if (target.error) return target.error;
  if (!fs.existsSync(target.full)) return fsError("not_found", "That file was not found.");
  let stat;
  try {
    stat = fs.lstatSync(target.full);
  } catch {
    return fsError("failed", "Could not read that file.");
  }
  if (!stat.isFile()) return fsError("invalid", "Only files can be deleted.");
  try {
    await shell.trashItem(target.full);
  } catch {
    return fsError("failed", "Could not move that file to the trash.");
  }
  return { ok: true, data: { trashed: true, target: input.target } };
});

/* --------------------- system actions (allowlist, no shell) --------------------- */

ipcMain.handle("fs:command", async (_e, input) => {
  const action = input && typeof input.action === "string" ? input.action : "";
  try {
    if (action === "open_folder" || action === "reveal_file") {
      const target = resolveScoped(input.target);
      if (target.error) return target.error;
      if (!fs.existsSync(target.full)) return fsError("not_found", "That location was not found.");
      if (action === "open_folder") await shell.openPath(target.full);
      else shell.showItemInFolder(target.full);
      return { ok: true, data: { action } };
    }
    if (action === "empty_trash") {
      if (process.platform !== "darwin" && process.platform !== "win32") {
        return fsError("not_supported", "Emptying the trash is not supported on this system.");
      }
      return fsError("not_supported", "Emptying the trash is not supported yet.");
    }
    if (action === "lock_screen") {
      if (process.platform === "darwin") {
        await new Promise((resolve, reject) =>
          execFile(
            "/usr/bin/pmset",
            ["displaysleepnow"],
            (err) => (err ? reject(err) : resolve(null)),
          ),
        );
        return { ok: true, data: { action } };
      }
      if (process.platform === "win32") {
        await new Promise((resolve, reject) =>
          execFile("rundll32.exe", ["user32.dll,LockWorkStation"], (err) => (err ? reject(err) : resolve(null))),
        );
        return { ok: true, data: { action } };
      }
      return fsError("not_supported", "Locking the screen is not supported on this system.");
    }
  } catch {
    return fsError("failed", "That action failed.");
  }
  return fsError("rejected", `Action "${action}" is not on the allowlist.`);
});
