const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

// Import the Express server
const server = require("./server");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    icon: path.join(__dirname, "assets", "icon.png"),
    titleBarStyle: "default",
    show: false,
    title: "Screenshot Note - My Personal Wiki"
  });

  // Load the app
  mainWindow.loadURL("http://localhost:3019");

  // Show window when ready to prevent visual flash
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();

    // Open DevTools in development
    if (process.env.NODE_ENV === "development") {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require("electron").shell.openExternal(url);
    return { action: "deny" };
  });
}

// App event handlers
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on("web-contents-created", (event, contents) => {
  contents.on("new-window", (event, navigationUrl) => {
    event.preventDefault();
    require("electron").shell.openExternal(navigationUrl);
  });
});

// IPC handlers for file dialogs
ipcMain.handle("select-image-files", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile", "multiSelections"],
    filters: [
      {
        name: "Images",
        extensions: ["jpg", "jpeg", "png", "gif", "webp", "bmp"],
      },
      {
        name: "All Files",
        extensions: ["*"],
      },
    ],
  });
  return result;
});

ipcMain.handle("select-json-file", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [
      {
        name: "JSON Files",
        extensions: ["json"],
      },
      {
        name: "All Files",
        extensions: ["*"],
      },
    ],
  });
  return result;
});

ipcMain.handle("save-json-file", async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      {
        name: "JSON Files",
        extensions: ["json"],
      },
    ],
    defaultPath: `screenshot-notes-${new Date().toISOString().split('T')[0]}.json`,
  });
  return result;
});

ipcMain.handle("select-directory", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
  return result;
});

// Handle JSON file operations
ipcMain.handle("read-json-file", async (event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    throw new Error(`Failed to read JSON file: ${error.message}`);
  }
});

ipcMain.handle("write-json-file", async (event, filePath, data) => {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, jsonString, 'utf8');
    return { success: true };
  } catch (error) {
    throw new Error(`Failed to write JSON file: ${error.message}`);
  }
});

// Handle image file operations
ipcMain.handle("copy-image-to-assets", async (event, sourcePath, targetName) => {
  try {
    const assetsDir = path.join(__dirname, "assets", "screenshots");
    
    // Ensure assets directory exists
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }
    
    const targetPath = path.join(assetsDir, targetName);
    fs.copyFileSync(sourcePath, targetPath);
    
    return { success: true, path: `assets/screenshots/${targetName}` };
  } catch (error) {
    throw new Error(`Failed to copy image: ${error.message}`);
  }
});

// Handle app updates and restart
ipcMain.handle("restart-app", () => {
  app.relaunch();
  app.quit();
});

// Error handling
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
