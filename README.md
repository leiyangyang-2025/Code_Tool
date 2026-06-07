# AI Browser — Electron 版

深色简约 AI 多模型快捷浏览器，左侧 7 个模型一键直达，右侧 Chromium 内核多标签浏览。

## 功能清单

| 功能 | 状态 |
|------|------|
| 🫘 豆包 / 🌙 Kimi / 🐋 DeepSeek / ☁️ 通义千问 / 🧠 文心一言 / 💎 智谱清言 / 🤖 ChatGPT | 侧边栏一键跳转 |
| 多标签页（新建/关闭/切换） | ✅ |
| 地址栏手动输入任意网址 | ✅ |
| 前进/后退/刷新/主页 | ✅ |
| Cookie 持久化（关闭重启不掉线） | ✅ `partition:persist:main` |
| 深色简约 UI | ✅ |
| 窗口默认 1200×800，可缩放 | ✅ |
| 单文件 exe 输出 | ✅ electron-builder portable |

## 快速开始（2 步）

### 1. 安装依赖

```bash
# 进入项目目录
cd AIBrowser-Electron

# 设置国内镜像加速（可选但强烈推荐）
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/

# 安装
npm install --registry=https://registry.npmmirror.com
```

### 2. 打包为独立 exe

```bash
# 双击运行 build_and_pack.bat
# 或者手动：
npx electron-builder --win portable
```

成品在 `dist/AIBrowser.exe`，双击即运行，无需安装。

## 环境要求

- **Node.js** ≥ 18（推荐 20+）
- **npm** 随 Node.js 自带
- **Windows 10/11** 64 位

## 项目结构

```
AIBrowser-Electron/
├── main.js              ← Electron 主进程（窗口 + 持久化 Session）
├── preload.js           ← 安全的 IPC 桥接
├── renderer/
│   ├── index.html       ← UI 结构
│   ├── style.css        ← 深色主题 CSS
│   └── app.js           ← 标签页管理 + WebView 逻辑
├── package.json         ← 依赖 & electron-builder 配置
├── build_and_pack.bat   ← 一键打包脚本
└── README.md
```
# Code_Tool
