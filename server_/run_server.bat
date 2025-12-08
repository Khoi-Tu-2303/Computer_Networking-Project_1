@echo off
title Server - ASP.NET Core
echo Dang khoi dong Server...

cd server

start http://localhost:5000
dotnet run --urls "http://0.0.0.0:5000"