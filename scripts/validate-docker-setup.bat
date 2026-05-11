@echo off
REM Georgetown Traffic AI - Docker Setup Validation Script (Windows)
REM This script validates the Docker Compose configuration

echo Validating Docker Setup...
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed
    echo         Please install Docker Desktop: https://docs.docker.com/desktop/install/windows-install/
    exit /b 1
)
echo [OK] Docker is installed

REM Check if Docker Compose is available
docker compose version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Compose is not available
    echo         Please install Docker Compose v2+
    exit /b 1
)
echo [OK] Docker Compose is available

REM Validate docker-compose.yml syntax
docker compose config >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] docker-compose.yml has syntax errors
    docker compose config
    exit /b 1
)
echo [OK] docker-compose.yml syntax is valid

REM Check if required files exist
echo.
echo Checking required files...

set "all_files_exist=true"

if exist "docker-compose.yml" (echo [OK] docker-compose.yml) else (echo [ERROR] docker-compose.yml is missing & set "all_files_exist=false")
if exist "frontend\Dockerfile" (echo [OK] frontend\Dockerfile) else (echo [ERROR] frontend\Dockerfile is missing & set "all_files_exist=false")
if exist "frontend\.dockerignore" (echo [OK] frontend\.dockerignore) else (echo [ERROR] frontend\.dockerignore is missing & set "all_files_exist=false")
if exist "frontend\.env.example" (echo [OK] frontend\.env.example) else (echo [ERROR] frontend\.env.example is missing & set "all_files_exist=false")
if exist "backend\Dockerfile" (echo [OK] backend\Dockerfile) else (echo [ERROR] backend\Dockerfile is missing & set "all_files_exist=false")
if exist "backend\.dockerignore" (echo [OK] backend\.dockerignore) else (echo [ERROR] backend\.dockerignore is missing & set "all_files_exist=false")
if exist "backend\.env.example" (echo [OK] backend\.env.example) else (echo [ERROR] backend\.env.example is missing & set "all_files_exist=false")
if exist "python-ai\Dockerfile" (echo [OK] python-ai\Dockerfile) else (echo [ERROR] python-ai\Dockerfile is missing & set "all_files_exist=false")
if exist "python-ai\.dockerignore" (echo [OK] python-ai\.dockerignore) else (echo [ERROR] python-ai\.dockerignore is missing & set "all_files_exist=false")
if exist "python-ai\.env.example" (echo [OK] python-ai\.env.example) else (echo [ERROR] python-ai\.env.example is missing & set "all_files_exist=false")

if "%all_files_exist%"=="false" (
    echo.
    echo [ERROR] Some required files are missing
    exit /b 1
)

REM Check if .env files exist (warn if not)
echo.
echo Checking environment files...

if exist "frontend\.env" (echo [OK] frontend\.env exists) else (echo [WARN] frontend\.env not found ^(copy from .env.example^))
if exist "backend\.env" (echo [OK] backend\.env exists) else (echo [WARN] backend\.env not found ^(copy from .env.example^))
if exist "python-ai\.env" (echo [OK] python-ai\.env exists) else (echo [WARN] python-ai\.env not found ^(copy from .env.example^))

REM Check Docker daemon
echo.
echo Checking Docker daemon...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker daemon is not running
    echo         Please start Docker Desktop
    exit /b 1
)
echo [OK] Docker daemon is running

REM Display Docker Compose services
echo.
echo Docker Compose Services:
docker compose config --services

echo.
echo [OK] Docker setup validation complete!
echo.
echo Next steps:
echo 1. Copy .env.example files to .env for each service
echo 2. Update JWT_SECRET in backend\.env
echo 3. Run: docker compose up --build
