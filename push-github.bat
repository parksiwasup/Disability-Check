@echo off
title GitHub Auto-Uploader
cd /d "%~dp0"
node "%~dp0backend\scripts\push-to-github.js"
pause
