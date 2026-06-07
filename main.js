const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');

// ==================== 持久化 Session ====================
// 指定自定义数据目录，保证 Cookie / LocalStorage 重启不丢失
const USER_DATA = path.join(app.getPath('appData'), 'AIBrowser');
app.setPath('userData', USER_DATA);

// 全局默认 sess
let defaultSession = null;

function ensureSession() {
  if (!defaultSession) {
    defaultSession = session.defaultSession;
    // 强制持久化 Cookie
    defaultSession.cookies.addListener('changed', (event, cookie, cause, removed) => {
      // 静默持久化，不打扰用户
    });
  }
  return defaultSession;
}

// ==================== 主窗口 ====================
let mainWindow = null;

function createWindow() {
  ensureSession();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'AI Browser',
    backgroundColor: '#1a1a2e',
    autoHideMenuBar: true,       // 隐藏菜单栏（Alt可临时显示）
    frame: false,                // 无边框窗口，去掉白色原生标题栏
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('maximize', () => mainWindow.webContents.send('window-maximized', true));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window-maximized', false));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ==================== IPC ====================
ipcMain.handle('get-user-data-path', () => {
  return USER_DATA;
});

ipcMain.handle('persist-cookies', async () => {
  try {
    const sess = ensureSession();
    await sess.cookies.flushStore();
    return { ok: true };
  } catch (e) {
    return { ok: false, err: e.message };
  }
});

// 窗口控制
ipcMain.on('window-minimize', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.on('window-maximize', () => {
  if (!mainWindow) return;
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on('window-close', () => { if (mainWindow) mainWindow.close(); });

// ==================== 启动 ====================
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
