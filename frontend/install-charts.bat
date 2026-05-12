@echo off
echo ========================================
echo Installing Chart.js for Training Results
echo ========================================
echo.

cd /d "%~dp0"

echo Installing chart.js and react-chartjs-2...
call npm install chart.js react-chartjs-2

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo You can now run: npm run dev
echo Then visit: http://localhost:5173/training-results
echo.
pause
