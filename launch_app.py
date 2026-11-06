#!/usr/bin/env python3
"""
TKLab One-Click Application Launcher
Launches the FastAPI YOLOv11 backend and React dashboard in standalone desktop app window mode.
"""

import os
import sys
import time
import shutil
import socket
import subprocess
import webbrowser
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"

def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0

def get_local_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"

def find_python():
    # Prefer virtual environment if present
    venv_python = ROOT_DIR / ".venv" / "Scripts" / "python.exe"
    if venv_python.exists():
        return str(venv_python)
    return sys.executable

def find_app_browser(url: str):
    """Finds Chrome or Edge to launch in standalone --app window mode."""
    candidates = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe")
    ]
    for exe in candidates:
        if os.path.isfile(exe):
            return [exe, f"--app={url}", "--window-size=1440,900"]
    return None

def main():
    print("=" * 65)
    print("      TKLab AI Crowd Dynamics & Stampede Control Center      ")
    print("=" * 65)

    py_exe = find_python()
    backend_proc = None
    frontend_proc = None

    try:
        local_ip = get_local_ip()

        # 1. Start Backend if not already running on port 8000
        if not is_port_in_use(8000):
            print("\n[1/3] Starting FastAPI AI backend on 0.0.0.0:8000...")
            backend_cmd = [py_exe, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
            backend_proc = subprocess.Popen(
                backend_cmd,
                cwd=str(BACKEND_DIR)
            )
            # Wait for backend to be ready
            for _ in range(25):
                if is_port_in_use(8000):
                    print("      FastAPI AI backend is online!")
                    print(f"      • Local:   http://localhost:8000")
                    print(f"      • Network (Mobile): http://{local_ip}:8000")
                    break
                time.sleep(0.5)
        else:
            print("\n[1/3] Backend is already running on port 8000.")

        # 2. Start Frontend if not already running on port 5173
        if not is_port_in_use(5173):
            print("\n[2/3] Starting React Dashboard on 0.0.0.0:5173...")
            npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
            frontend_proc = subprocess.Popen(
                [npm_cmd, "run", "dev"],
                cwd=str(FRONTEND_DIR)
            )
            for _ in range(25):
                if is_port_in_use(5173):
                    print("      Dashboard is online!")
                    print(f"      • Desktop: http://localhost:5173")
                    print(f"      • Mobile:  http://{local_ip}:5173")
                    break
                time.sleep(0.5)
        else:
            print("\n[2/3] Frontend is already running on port 5173.")

        # 3. Launch Application Window
        app_url = "http://localhost:5173"
        print(f"\n[3/3] Opening TKLab in standalone desktop application mode...")
        app_cmd = find_app_browser(app_url)
        if app_cmd:
            subprocess.Popen(app_cmd)
        else:
            webbrowser.open(app_url)

        print("\n" + "=" * 65)
        print("  APPLICATION ONLINE:")
        print(f"  • Desktop URL: http://localhost:5173")
        print(f"  • Mobile URL:  http://{local_ip}:5173")
        print("=" * 65)
        print("  MOBILE CONNECTION TIPS:")
        print(f"  1. Ensure your phone is connected to the same Wi-Fi.")
        print(f"  2. Open Chrome on your phone and go to: http://{local_ip}:5173")
        print(f"  3. If site can't be reached, right-click 'Allow-Firewall.bat' and Run as administrator.")
        print("=" * 65)
        print("  Press Ctrl+C in this terminal window to stop the application.")

        # Keep parent alive until interrupted
        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\nStopping TKLab application services...")
    finally:
        if backend_proc:
            backend_proc.terminate()
        if frontend_proc:
            frontend_proc.terminate()
        print("TKLab application closed cleanly.")

if __name__ == "__main__":
    main()

