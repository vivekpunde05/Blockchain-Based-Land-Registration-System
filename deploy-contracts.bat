@echo off
title Truffle Migrate Contracts
echo ========================================================
echo Deploying Smart Contracts to Ganache (Port 7545)...
echo ========================================================
set PATH=C:\nvm4w\nodejs;C:\Users\vivek\AppData\Local\nvm;%PATH%
truffle migrate --reset
echo.
echo Deployment Complete!
pause
