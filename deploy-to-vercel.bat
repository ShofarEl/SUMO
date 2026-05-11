@echo off
REM Quick deployment script for Vercel

echo ========================================
echo Vercel Deployment Helper
echo ========================================
echo.

echo Backend URL: https://sumo-d68k.onrender.com
echo.

echo [1/3] Verifying deployment readiness...
node verify-vercel-ready.js
if %errorlevel% neq 0 (
    echo.
    echo Fix the issues above before deploying.
    pause
    exit /b 1
)
echo.

echo [2/3] Checking if Vercel CLI is installed...
where vercel >nul 2>&1
if %errorlevel% neq 0 (
    echo Vercel CLI not found.
    echo.
    echo Install it with: npm install -g vercel
    echo Or deploy via web: https://vercel.com/new
    echo.
    pause
    exit /b 1
)
echo ✓ Vercel CLI found
echo.

echo [3/3] Ready to deploy!
echo.
echo Choose deployment option:
echo 1. Deploy to preview (test deployment)
echo 2. Deploy to production
echo 3. Exit and deploy via web
echo.
set /p choice="Enter choice (1-3): "

if "%choice%"=="1" (
    echo.
    echo Deploying to preview...
    cd frontend
    vercel
    cd ..
) else if "%choice%"=="2" (
    echo.
    echo Deploying to production...
    cd frontend
    vercel --prod
    cd ..
) else if "%choice%"=="3" (
    echo.
    echo Opening Vercel deployment page...
    start https://vercel.com/new
    echo.
    echo Import your GitHub repository and click Deploy.
    echo Vercel will auto-detect the configuration.
) else (
    echo Invalid choice.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo IMPORTANT: Update backend CORS settings
echo.
echo 1. Copy your Vercel URL
echo 2. Go to: https://dashboard.render.com
echo 3. Select service: sumo-d68k
echo 4. Update CORS_ORIGIN with your Vercel URL
echo.
echo See UPDATE_CORS.md for detailed instructions.
echo.

pause
