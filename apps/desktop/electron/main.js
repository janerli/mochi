const { app, BrowserWindow, Menu } = require("electron");
const path = require("node:path");

app.setName("Mochi");
// The app has its own in-page header/nav — the native File/Edit/View/Window
// menu Electron adds by default is just OS chrome with no purpose here.
Menu.setApplicationMenu(null);

// The packaged app is a thin client: it just points at the hosted mochi
// server (Render + Supabase), same as dev mode points at the local dev
// server — no embedded backend, no local database. Update this once the
// Render service is live; can also be overridden via the MOCHI_SERVER_URL
// env var without rebuilding, e.g. for a self-hosted deployment.
const PRODUCTION_SERVER_URL = process.env.MOCHI_SERVER_URL ?? "https://mochi-server.onrender.com";

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#fff6ed",
    icon: path.join(__dirname, "..", "build", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL(app.isPackaged ? PRODUCTION_SERVER_URL : "http://localhost:5173");
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
