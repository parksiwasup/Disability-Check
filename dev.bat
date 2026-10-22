@echo off
chcp 65001 >nul
title Hospital Disability System - Development Launcher (dev.bat)

echo =====================================================================
echo    🏥 HOSPITAL DISABILITY ASSESSMENT & SSO 2-19 AUTO-FILLER
echo    โหมดพัฒนา (Development Mode Launcher)
echo =====================================================================
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] ไม่พบ Node.js ในระบบ! กรุณาติดตั้งจาก https://nodejs.org/
    pause
    exit /b 1
)

echo [1/3] ตรวจสอบและอัปเดตโมเดลฐานข้อมูล (Prisma ^& MySQL)...
cd /d "%~dp0backend"
call npx.cmd prisma generate >nul 2>&1

echo [2/3] เริ่มรัน Backend API (Port 5000)...
start "Hospital Backend [Port 5000]" cmd /k "cd /d "%~dp0backend" && npm.cmd run dev"

:: รอ 2 วินาทีให้ Backend พร้อมทำงาน
timeout /t 2 /nobreak >nul

echo [3/3] เริ่มรัน Frontend Vite Dev Server (Port 5173)...
start "Hospital Frontend [Port 5173]" cmd /k "cd /d "%~dp0frontend" && npm.cmd run dev"

:: รอ 2 วินาทีแล้วเปิดเว็บเบราว์เซอร์
timeout /t 2 /nobreak >nul
start http://localhost:5173

echo.
echo =====================================================================
echo    ✨ เริ่มต้นระบบในโหมดพัฒนาเรียบร้อยแล้ว!
echo    • Frontend: http://localhost:5173  (Hot Module Replacement - Vite)
echo    • Backend:  http://localhost:5000  (Auto Reload - Express/TSX)
echo =====================================================================
echo.
echo สามารถดู Log การทำงานได้จากหน้าต่าง Terminal ทั้งสองหน้าที่เปิดขึ้นมา
echo กดปุ่มใดก็ได้เพื่อปิดหน้าต่างตัวเรียกนี้...
pause >nul
