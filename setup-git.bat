@echo off
echo ========================================
echo Georgetown Traffic AI - Git Setup
echo ========================================
echo.

REM Check if git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git is not installed!
    echo Please install Git from: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo Git is installed.
echo.

REM Check if already initialized
if exist .git (
    echo Git repository already initialized.
    echo.
    set /p reinit="Do you want to reinitialize? This will delete git history! (y/n): "
    if /i "%reinit%"=="y" (
        rmdir /s /q .git
        echo Repository reinitialized.
    ) else (
        echo Keeping existing repository.
        goto :configure_remote
    )
)

REM Initialize git
echo Initializing Git repository...
git init
echo.

REM Configure git user (if not already configured)
git config user.name >nul 2>&1
if errorlevel 1 (
    echo Git user not configured.
    set /p git_name="Enter your name: "
    set /p git_email="Enter your email: "
    git config --global user.name "%git_name%"
    git config --global user.email "%git_email%"
    echo Git user configured.
) else (
    echo Git user already configured:
    git config user.name
    git config user.email
)
echo.

REM Check .gitignore
if not exist .gitignore (
    echo WARNING: .gitignore file not found!
    echo This file is important to prevent committing sensitive data.
    pause
)

REM Initial commit
echo Creating initial commit...
git add .
git commit -m "Initial commit: Georgetown Traffic AI Management System"
echo.

:configure_remote
REM Configure remote
echo ========================================
echo Remote Repository Setup
echo ========================================
echo.
echo Choose your Git hosting platform:
echo 1. GitHub
echo 2. GitLab
echo 3. Bitbucket
echo 4. Custom URL
echo 5. Skip (configure later)
echo.
set /p platform="Enter choice (1-5): "

if "%platform%"=="1" (
    set /p username="Enter your GitHub username: "
    set /p reponame="Enter repository name (default: georgetown-traffic-ai): "
    if "%reponame%"=="" set reponame=georgetown-traffic-ai
    
    echo.
    echo Choose connection method:
    echo 1. HTTPS (requires password)
    echo 2. SSH (requires SSH key)
    set /p method="Enter choice (1-2): "
    
    if "%method%"=="1" (
        set remote_url=https://github.com/%username%/%reponame%.git
    ) else (
        set remote_url=git@github.com:%username%/%reponame%.git
    )
) else if "%platform%"=="2" (
    set /p username="Enter your GitLab username: "
    set /p reponame="Enter repository name (default: georgetown-traffic-ai): "
    if "%reponame%"=="" set reponame=georgetown-traffic-ai
    
    echo.
    echo Choose connection method:
    echo 1. HTTPS
    echo 2. SSH
    set /p method="Enter choice (1-2): "
    
    if "%method%"=="1" (
        set remote_url=https://gitlab.com/%username%/%reponame%.git
    ) else (
        set remote_url=git@gitlab.com:%username%/%reponame%.git
    )
) else if "%platform%"=="3" (
    set /p username="Enter your Bitbucket username: "
    set /p reponame="Enter repository name (default: georgetown-traffic-ai): "
    if "%reponame%"=="" set reponame=georgetown-traffic-ai
    set remote_url=https://bitbucket.org/%username%/%reponame%.git
) else if "%platform%"=="4" (
    set /p remote_url="Enter custom repository URL: "
) else (
    echo Skipping remote configuration.
    goto :finish
)

REM Add remote
echo.
echo Adding remote repository: %remote_url%
git remote add origin %remote_url% 2>nul
if errorlevel 1 (
    echo Remote 'origin' already exists. Updating URL...
    git remote set-url origin %remote_url%
)

echo.
echo Remote configured successfully!
git remote -v

:finish
echo.
echo ========================================
echo Git Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Create the repository on your Git hosting platform
echo 2. Run: git push -u origin main
echo.
echo Or use the git-push.bat script for easy pushing.
echo.
echo IMPORTANT: Make sure .env files are NOT committed!
echo Check with: git status
echo.
pause
