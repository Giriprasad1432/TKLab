@echo off
:: Run as Administrator to allow Mobile phone connection through Windows Firewall
echo ==============================================================
echo    Allowing TKLab Ports (5173 & 8000) in Windows Firewall
echo ==============================================================

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [NOTE] Please right-click this file and choose "Run as administrator" to apply!
    echo.
)

netsh advfirewall firewall add rule name="TKLab Mobile Port 5173" dir=in action=allow protocol=TCP localport=5173
netsh advfirewall firewall add rule name="TKLab Backend Port 8000" dir=in action=allow protocol=TCP localport=8000

echo.
echo Firewall rules added for ports 5173 (Frontend) and 8000 (Backend).
echo Now your mobile phone can connect to: http://192.168.31.19:5173
pause

