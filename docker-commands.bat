@echo off
REM Georgetown Traffic AI - Docker Commands (Windows)
REM Convenience commands for Docker Compose operations

if "%1"=="" goto help
if "%1"=="help" goto help
if "%1"=="build" goto build
if "%1"=="up" goto up
if "%1"=="down" goto down
if "%1"=="restart" goto restart
if "%1"=="logs" goto logs
if "%1"=="clean" goto clean
if "%1"=="validate" goto validate
if "%1"=="ps" goto ps
goto help

:help
echo Georgetown Traffic AI - Available Commands
echo.
echo   docker-commands.bat build      - Build all Docker images
echo   docker-commands.bat up         - Start all services
echo   docker-commands.bat down       - Stop all services
echo   docker-commands.bat restart    - Restart all services
echo   docker-commands.bat logs       - View logs from all services
echo   docker-commands.bat clean      - Stop services and remove volumes
echo   docker-commands.bat validate   - Validate Docker setup
echo   docker-commands.bat ps         - Show running containers
echo.
goto end

:build
echo Building all services...
docker compose build
goto end

:up
echo Starting all services...
docker compose up -d
echo.
echo Services started! Access:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:5000
echo   Python:   http://localhost:8000
goto end

:down
echo Stopping all services...
docker compose down
goto end

:restart
echo Restarting all services...
docker compose restart
goto end

:logs
echo Viewing logs (Ctrl+C to exit)...
docker compose logs -f
goto end

:clean
echo WARNING: This will remove all data volumes!
set /p confirm="Are you sure? (y/N): "
if /i "%confirm%"=="y" (
    docker compose down -v
    echo All services stopped and volumes removed
) else (
    echo Operation cancelled
)
goto end

:validate
echo Validating Docker setup...
call scripts\validate-docker-setup.bat
goto end

:ps
docker compose ps
goto end

:end
