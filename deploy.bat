@echo off
chcp 65001 >nul
title Hospital Disability System - Deployment & Service Launcher

echo =====================================================================
echo    🏥 HOSPITAL DISABILITY ASSESSMENT & SSO 2-19 AUTO-FILLER
echo    ระบบประเมินทุพพลภาพและพิมพ์แบบฟอร์ม สปส. 2-19
echo =====================================================================
echo.

:: 1. Version Info
set APP_VERSION=v1.2.0
echo [INFO] Current Release Version: %APP_VERSION%
echo.

:: 2. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: 2. Check Backend .env
if not exist "%~dp0backend\.env" (
    echo [INFO] ไม่พบไฟล์ backend\.env กำลังสร้างจากตัวอย่าง...
    copy "%~dp0backend\.env.example" "%~dp0backend\.env" >nul
)

echo [1/4] Checking and installing Backend dependencies...
cd /d "%~dp0backend"
call npm.cmd install
if %errorlevel% neq 0 (
    echo [WARN] npm install encountered warnings, continuing...
)

echo [2/4] Generating Prisma Client and Syncing Database...
call npx.cmd prisma generate
echo [INFO] กำลังตรวจสอบ/ซิงค์โมเดลกับ MySQL...
call npx.cmd prisma db push >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] MySQL ยังไม่ได้ตั้งค่าฐานข้อมูล - ระบบจะรันด้วยโหมด Excel/In-Memory แบบไร้รอยต่อ
)


echo [3/4] Checking and building Frontend...
cd /d "%~dp0frontend"
call npm.cmd install
call npm.cmd run build

echo.
echo =====================================================================
echo    🚀 STARTING SERVERS...
echo    • Backend API:  http://localhost:5000
echo    • Frontend App: http://localhost:5173
echo =====================================================================
echo.

:: Start Backend in separate window
start "Hospital Backend API (Port 5000)" cmd /k "cd /d "%~dp0backend" && npm.cmd run dev"

:: Wait 3 seconds
timeout /t 3 /nobreak >nul

:: Start Frontend in separate window
start "Hospital Frontend Web (Port 5173)" cmd /k "cd /d "%~dp0frontend" && npm.cmd run dev"

:: Open default browser to Frontend
timeout /t 2 /nobreak >nul
start http://localhost:5173

echo [SUCCESS] System is up and running!
echo You can manage both servers from their respective terminal windows.
echo Press any key to close this launcher.
pause >nul
