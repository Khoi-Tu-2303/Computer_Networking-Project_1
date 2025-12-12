@echo off
title Server - ASP.NET Core
echo Dang khoi dong Server...

:: QUAN TRỌNG: Lệnh này buộc CMD nhảy về thư mục chứa file .bat này
cd /d "%~dp0"

:: Sau đó mới đi vào folder server
cd server

:: Mở trình duyệt
start http://localhost:5000

:: Chạy server
dotnet run --urls "http://0.0.0.0:5000"

