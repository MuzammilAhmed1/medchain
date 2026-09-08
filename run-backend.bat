@echo off
title MedChain Backend (Port 8080)
cd /d "%~dp0medchain-backend"
echo ==========================================
echo Starting MedChain Backend on port 8080...
echo ==========================================
if exist target\medchain-backend-0.1.0.jar (
    java -jar target\medchain-backend-0.1.0.jar
) else (
    mvn spring-boot:run
)
pause
