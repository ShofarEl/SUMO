@echo off
echo ========================================
echo Georgetown Traffic AI - Safe Git Init
echo ========================================
echo.

REM Configure Git for Windows line endings
echo Configuring Git for Windows...
git config core.autocrlf true
git config core.safecrlf false
echo.

REM Initialize if needed
if not exist .git (
    echo Initializing Git repository...
    git init
    echo.
)

REM Add .gitattributes and .gitignore first
echo Adding Git configuration files...
git add .gitattributes .gitignore
git commit -m "Add Git configuration files" 2>nul
echo.

REM Add documentation files
echo Adding documentation...
git add README.md LICENSE GIT_SETUP_GUIDE.md GIT_READY.md setup-git.bat git-push.bat
git commit -m "Add documentation and setup scripts" 2>nul
echo.

REM Add frontend files (excluding problematic ones)
echo Adding frontend files...
git add frontend/package.json frontend/package-lock.json frontend/vite.config.js frontend/index.html
git add frontend/src/*.jsx frontend/src/*.css frontend/src/pages/ frontend/src/components/ frontend/src/contexts/
git commit -m "Add frontend application" 2>nul
echo.

REM Add backend files
echo Adding backend files...
git add backend/package.json backend/package-lock.json backend/src/
git commit -m "Add backend application" 2>nul
echo.

REM Add Python AI files
echo Adding Python AI files...
git add python-ai/requirements.txt python-ai/app/ python-ai/tests/
git commit -m "Add Python AI service" 2>nul
echo.

REM Add Docker and config files
echo Adding Docker and configuration...
git add docker-compose.yml .env.example Makefile
git commit -m "Add Docker configuration" 2>nul
echo.

REM Add remaining files
echo Adding remaining project files...
git add .
git commit -m "Add remaining project files" 2>nul
echo.

echo ========================================
echo Git initialization complete!
echo ========================================
echo.
echo Next steps:
echo 1. Create repository on GitHub/GitLab
echo 2. Add remote: git remote add origin YOUR_REPO_URL
echo 3. Push: git push -u origin main
echo.
echo Or run: setup-git.bat for interactive setup
echo.
pause
