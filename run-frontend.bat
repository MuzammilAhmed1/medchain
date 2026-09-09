@echo off
title MedChain Frontend (Port 5173)
cd /d "%~dp0medchain-frontend"
echo ==========================================
echo Starting MedChain Frontend on port 5173...
echo ==========================================
npm run dev
pause
