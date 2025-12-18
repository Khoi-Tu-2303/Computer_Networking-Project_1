@echo off
title REMOTE CONTROL LAUNCHER
cd /d "%~dp0"

echo ===================================================
echo   DANG KHOI DONG HE THONG REMOTE CONTROL CLIENT
echo ===================================================

:: 1. Chạy Tool lấy IP (IpAgent) ở một cửa sổ riêng
echo.
echo [1/2] Dang bat Tool lay IP LAN (IpAgent)...
:: Mở cửa sổ mới để chạy C#
start "IP Agent Helper" cmd /k "cd IpAgent && dotnet run"

:: --- SỬA Ở ĐÂY: Tăng thời gian chờ lên 5 giây ---
echo.
echo Dang doi Agent khoi dong (5 giay)...
timeout /t 5 >nul

:: 2. Sau khi chờ xong mới chạy Web Client
echo.
echo [2/2] Dang bat Web Client...
cd client
npm run dev -- --open