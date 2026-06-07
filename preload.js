const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aiBrowser', {
  // 获取用户数据路径
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  // 手动持久化 Cookie
  persistCookies: () => ipcRenderer.invoke('persist-cookies'),
  // 窗口控制
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose:    () => ipcRenderer.send('window-close'),
  // 监听窗口最大化状态
  onMaximizeChange: (callback) => {
    ipcRenderer.on('window-maximized', (_event, val) => callback(val));
  }
});
