@echo off
setlocal

echo.
echo ============================================
echo    AI Browser - Electron Build & Pack
echo ============================================
echo.

:: ========== Check Node.js ==========
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org/
    pause
    exit /b 1
)
for /f "delims=" %%i in ('node -v') do echo [OK] Node.js %%i

:: ========== Set mirrors ==========
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/

:: ========== Install deps ==========
echo.
echo [1/3] Installing dependencies...
cd /d "%~dp0"
call npm install --registry=https://registry.npmmirror.com
if errorlevel 1 (
    echo.
    echo [TIP] If download fails, check network/proxy settings
    pause
    exit /b 1
)
echo [OK] Dependencies installed

:: ========== Build ==========
echo.
echo [2/3] Packaging...
call npx electron-builder --win portable
if errorlevel 1 (
    echo [ERROR] Package failed
    pause
    exit /b 1
)

:: ========== Done ==========
echo.
echo [3/3] DONE!
echo.
echo ============================================
echo    Output: dist\AIBrowser.exe
echo ============================================
echo.
echo Cookie persistence enabled via partition=main

start "" "%~dp0dist"
pause
