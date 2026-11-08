@echo off
title TKLab - AI Crowd Control Center Launcher
echo ==============================================================
echo    Starting TKLab AI Crowd Dynamics & Stampede Control Center
echo ==============================================================

cd /d "%~dp0"

REM Try python with fallback to py launcher or venv
python launch_app.py
if %ERRORLEVEL% NEQ 0 (
    py -3.13 launch_app.py
    if %ERRORLEVEL% NEQ 0 (
        if exist ".venv\Scripts\python.exe" (
            ".venv\Scripts\python.exe" launch_app.py
        )
    )
)

pause

