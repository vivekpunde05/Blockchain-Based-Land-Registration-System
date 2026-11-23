@echo off
title Ganache Local Blockchain (Port 7545)
echo ========================================================
echo Starting Ganache Local Blockchain (Port 7545, ID 5777)...
echo ========================================================
set PATH=C:\nvm4w\nodejs;C:\Users\vivek\AppData\Local\nvm;%PATH%
ganache --port 7545 --chain.networkId 5777 --chain.chainId 1337 --wallet.mnemonic "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat"
pause
