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

/* --------------------- scoped filesystem bridge (search / copy / move) ---------------------
 * The renderer never sends an OS path. It sends { scope, path } where scope is one of three
 * user-owned folders. Everything is resolved here and rejected if it escapes its root.
 * No delete, no shell execution, no reading of file contents.
 */

const FS_SCOPES = ["desktop", "documents", "downloads"];
const MAX_DEPTH = 4;
const MAX_ENTRIES = 4000;

function scopeRoot(scope) {
  try {
    if (scope === "desktop") return app.getPath("desktop");
    if (scope === "documents") return app.getPath("documents");
    if (scope === "downloads") return app.getPath("downloads");
  } catch {
    return null;
  }
  return null;
}

function fsError(reason, error) {
  return { ok: false, reason, error };
}

/** Resolve a scoped relative path, guaranteeing it stays inside its root. */
function resolveScoped(location) {
  if (!location || typeof location !== "object") return { error: fsError("invalid", "Missing location.") };
  const { scope, path: rel } = location;
  if (!FS_SCOPES.includes(scope)) return { error: fsError("denied", `Scope "${scope}" is not allowed.`) };
  if (typeof rel !== "string" || !rel.trim()) return { error: fsError("invalid", "Missing path.") };
  if (rel.includes("\0")) return { error: fsError("invalid", "Invalid path.") };
  const root = scopeRoot(scope);
  if (!root) return { error: fsError("unavailable", `Scope "${scope}" is not available.`) };
  const normalizedRoot = path.resolve(root) + path.sep;
  const full = path.resolve(root, rel);
  if (full !== path.resolve(root) && !full.startsWith(normalizedRoot)) {
    return { error: fsError("denied", "Path escapes its allowed folder.") };
  }
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

ipcMain.handle("fs:scopes", () => FS_SCOPES.filter((s) => scopeRoot(s)));

ipcMain.handle("fs:search", (_e, input) => {
  const query = input && typeof input.query === "string" ? input.query.trim().toLowerCase() : "";
  if (!query || query.includes("..") || /[/\\\\\0]/.test(query)) {
    return fsError("invalid", "Invalid search query.");
  }
  const limit = Math.min(Math.max(1, Number(input && input.limit) || 10), 25);
  const scopes = input && FS_SCOPES.includes(input.scope) ? [input.scope] : FS_SCOPES;
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
