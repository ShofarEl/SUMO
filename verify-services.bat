@echo off
echo ========================================
echo Georgetown Traffic AI - Service Verification
echo ========================================
echo.

echo Checking MongoDB...
curl -s http://localhost:27017 >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] MongoDB is running on port 27017
) else (
    echo [ERROR] MongoDB is NOT running on port 27017
    echo Please start MongoDB first
)
echo.

echo Checking Backend API...
curl -s http://localhost:5000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Backend API is running on port 5000
    curl -s http://localhost:5000/health
) else (
    echo [ERROR] Backend API is NOT running on port 5000
    echo Please start: cd backend ^&^& npm start
)
echo.

echo Checking Python AI Service...
curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Python AI Service is running on port 8000
    curl -s http://localhost:8000/health
) else (
    echo [ERROR] Python AI Service is NOT running on port 8000
    echo Please start: cd python-ai ^&^& python -m app.main
)
echo.

echo Checking Frontend...
curl -s http://localhost:5174 >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Frontend is running on port 5174
) else (
    echo [ERROR] Frontend is NOT running on port 5174
    echo Please start: cd frontend ^&^& npm run dev
)
echo.

echo ========================================
echo Verification Complete
echo ========================================
pause
