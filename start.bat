@echo off
title StockPilot - Retail Inventory & Demand Forecasting
echo ================================================
echo  StockPilot - Retail Inventory Forecasting
echo ================================================
echo.

start "StockPilot Backend" cmd /k "cd /d %~dp0backend && npm run dev"
start "StockPilot Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo  Backend starting  ->  http://localhost:5000  (API)
echo  Frontend starting ->  http://localhost:3000  (App)
echo.
echo  Two windows will open. Close them to stop the servers.
pause >nul