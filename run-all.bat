@echo off
title MedChain Platform Launcher
echo ========================================================
echo        Starting MedChain Full Stack Platform
echo ========================================================
echo Launching AI Microservice (Port 8000)...
start "MedChain AI Service" cmd /k "run-ai.bat"
timeout /t 3 /nobreak >nul

echo Launching Spring Boot Backend (Port 8080)...
start "MedChain Backend" cmd /k "run-backend.bat"
timeout /t 5 /nobreak >nul

echo Launching React Frontend (Port 5173)...
start "MedChain Frontend" cmd /k "run-frontend.bat"

echo ========================================================
echo All services launched in separate windows!
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8080
echo AI Svc:   http://localhost:8000
echo ========================================================
