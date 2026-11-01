@echo off
chcp 65001 >nul
echo ========================================
echo   🎮 欢乐对战屋 - 启动脚本
echo ========================================
echo.

REM 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未检测到 Node.js，请先安装 Node.js
    echo    下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js 已检测到

REM 安装依赖
if not exist "server\node_modules" (
    echo.
    echo 📦 正在安装依赖...
    cd server
    call npm install
    cd ..
)

echo.
echo 🚀 正在启动联机服务器（端口 8080）...
echo    启动后请用浏览器打开 index.html
echo.
echo    局域网联机：在设置中填入 ws://你的IP:8080
echo.

cd server
node server.js
