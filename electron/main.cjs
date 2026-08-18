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
