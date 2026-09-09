@echo off
title MedChain AI Service (Port 8000)
cd /d "%~dp0medchain-ai-service"
echo ==========================================
echo Starting MedChain AI Service on port 8000...
echo ==========================================
if exist venv\Scripts\python.exe (
    .\venv\Scripts\python.exe -m uvicorn app.main:app --port 8000 --host 0.0.0.0 --reload
) else (
    python -m uvicorn app.main:app --port 8000 --host 0.0.0.0 --reload
)
pause
