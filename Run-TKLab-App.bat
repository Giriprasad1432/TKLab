@echo off
title TKLab - AI Crowd Control Center Launcher
echo ==============================================================
echo    Starting TKLab AI Crowd Dynamics & Stampede Control Center
echo ==============================================================

cd /d "%~dp0"

if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" launch_app.py
) else (
    python launch_app.py
)

pause

