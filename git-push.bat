@echo off
echo ========================================
echo Georgetown Traffic AI - Git Push Script
echo ========================================
echo.

REM Check if git is initialized
if not exist .git (
    echo Initializing Git repository...
    git init
    echo.
)

REM Check git status
echo Checking git status...
git status
echo.

REM Prompt for commit message
set /p commit_msg="Enter commit message (or press Enter for default): "
if "%commit_msg%"=="" set commit_msg="Update: Georgetown Traffic AI changes"

echo.
echo Adding files to git...
git add .

echo.
echo Committing changes...
git commit -m "%commit_msg%"

echo.
echo Current remotes:
git remote -v

REM Check if remote exists
git remote | findstr origin >nul
if errorlevel 1 (
    echo.
    echo No remote repository configured!
    echo Please add your remote repository:
    echo.
    echo For HTTPS:
    echo   git remote add origin https://github.com/yourusername/georgetown-traffic-ai.git
    echo.
    echo For SSH:
    echo   git remote add origin git@github.com:yourusername/georgetown-traffic-ai.git
    echo.
    pause
    exit /b 1
)

echo.
set /p push_confirm="Push to remote? (y/n): "
if /i "%push_confirm%"=="y" (
    echo Pushing to remote...
    git push
    if errorlevel 1 (
        echo.
        echo Push failed! Trying with -u origin main...
        git push -u origin main
    )
    echo.
    echo ========================================
    echo Push completed successfully!
    echo ========================================
) else (
    echo Push cancelled.
)

echo.
pause
