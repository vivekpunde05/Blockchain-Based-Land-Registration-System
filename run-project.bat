@echo off
title Decentralized Land Registration System
echo =========================================================================
echo   Decentralized Land Registration System using Blockchain
echo   Team: Vivek Punde, Aryan Mhatre, Rohit Dongre
echo   Loknete Shamrao Peje Government College of Engineering (AI & DS)
echo =========================================================================
echo.
echo [1/2] Starting Ganache Blockchain...
start "Ganache Blockchain" cmd /c "start-blockchain.bat"
timeout /t 4 /nobreak >nul

echo [2/2] Starting React Web Application...
start "React Frontend" cmd /c "start-client.bat"

echo.
echo =========================================================================
echo Both services have been launched in separate windows!
echo Web Application URL: http://localhost:3000
echo Blockchain RPC URL:  http://127.0.0.1:7545 (Chain ID: 1337)
echo =========================================================================
pause
