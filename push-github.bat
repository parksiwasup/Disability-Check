@echo off
chcp 65001 >nul
title GitHub Auto-Uploader & Version Manager

echo =====================================================================
echo    🚀 GITHUB UPLOADER ^& VERSION MANAGER
echo    ระบบอัปโหลดขึ้น GitHub พร้อมแยกเวอร์ชันอัตโนมัติ
echo =====================================================================
echo.

node "%~dp0backend\scripts\push-to-github.js"

echo.
echo กดปุ่มใดก็ได้เพื่อปิดหน้าต่างนี้...
pause >nul
