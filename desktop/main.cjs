const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

const DEFAULT_PORT = process.env.PORT || "3000";
let mainWindow = null;
let nextServer = null;

const waitForServer = async (url, retries = 60) => {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server may still be booting.
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Timed out waiting for desktop server at ${url}`);
};

const getServerEntry = () => {
  if (!app.isPackaged) {
    return null;
  }

  return path.join(app.getAppPath(), ".next", "standalone", "server.js");
};

const startNextServer = async () => {
  if (!app.isPackaged) {
    return `http://localhost:${DEFAULT_PORT}`;
  }

  const serverEntry = getServerEntry();
  nextServer = spawn(process.execPath, [serverEntry], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: DEFAULT_PORT,
      HOSTNAME: "127.0.0.1",
      ELECTRON_RUN_AS_NODE: "1",
    },
    stdio: "inherit",
  });

  const appUrl = `http://127.0.0.1:${DEFAULT_PORT}`;
  await waitForServer(appUrl);
  return appUrl;
};

const createWindow = async () => {
  const appUrl = await startNextServer();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#020408",
    autoHideMenuBar: true,
    title: "MockInterviewApp",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await mainWindow.loadURL(appUrl);
};

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (nextServer) {
    nextServer.kill();
    nextServer = null;
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});
