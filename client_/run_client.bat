@echo off
title REMOTE CONTROL LAUNCHER
cd /d "%~dp0"

echo ===================================================
echo   DANG KHOI DONG HE THONG REMOTE CONTROL CLIENT
echo ===================================================

:: 1. Chạy Tool lấy IP (IpAgent) ở một cửa sổ riêng
echo.
echo [1/2] Dang bat Tool lay IP LAN (IpAgent)...
:: "start" để mở cửa sổ mới
:: "cmd /k" để giữ cửa sổ không bị tắt nếu có lỗi (để debug)
start "IP Agent Helper" cmd /k "cd IpAgent && dotnet run"

:: Chờ 2 giây cho Tool C# khởi động xong hẳn
timeout /t 2 >nul

:: 2. Chạy Web Client (React) ở cửa sổ hiện tại
echo.
echo [2/2] Dang bat Web Client...
cd client
npm run dev -- --open
