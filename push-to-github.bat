@echo off
chcp 65001 >nul
title Push Disability-Check to GitHub

echo =====================================================================
echo    🚀 กำลังนำโค้ด Disability Check ขึ้น GitHub ของ parksiwasup
echo    Target: https://github.com/parksiwasup/Disability-Check.git
echo =====================================================================
echo.

"C:\Users\User\AppData\Local\GitHubDesktop\app-3.6.7\resources\app\git\cmd\git.exe" push -u origin main

echo.
echo เสร็จสิ้น! กดปุ่มใดก็ได้เพื่อปิดหน้าต่างนี้...
pause >nul
