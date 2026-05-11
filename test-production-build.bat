@echo off
REM Test production build locally before deploying

echo ========================================
echo Testing Production Build Locally
echo ========================================
echo.

echo [1/4] Testing Backend Installation...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Backend npm install failed
    exit /b 1
)
echo ✓ Backend dependencies installed
echo.

echo [2/4] Testing Frontend Build...
cd ..\frontend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Frontend npm install failed
    exit /b 1
)
echo ✓ Frontend dependencies installed
echo.

call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Frontend build failed
    exit /b 1
)
echo ✓ Frontend built successfully
echo.

echo [3/4] Checking build output...
if exist "dist\index.html" (
    echo ✓ Frontend dist/index.html exists
) else (
    echo ERROR: Frontend build output not found
    exit /b 1
)
echo.

echo [4/4] Running verification...
cd ..
node verify-render-ready.js
if %errorlevel% neq 0 (
    echo ERROR: Verification failed
    exit /b 1
)
echo.

echo ========================================
echo ✅ All checks passed!
echo ========================================
echo.
echo Your project is ready for Render deployment.
echo.
echo Next steps:
echo 1. Commit and push to GitHub
echo 2. Set up MongoDB Atlas
echo 3. Follow RENDER_DEPLOYMENT.md
echo.

pause
