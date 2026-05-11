# Docker Development Environment Setup

This guide explains how to set up and run the Georgetown Traffic AI system using Docker Compose.

## Prerequisites

- Docker Engine 20.10+ ([Install Docker](https://docs.docker.com/get-docker/))
- Docker Compose 2.0+ (included with Docker Desktop)
- At least 8GB RAM available for Docker
- 20GB free disk space

## Quick Start

1. **Clone the repository** (if not already done)
   ```bash
   git clone <repository-url>
   cd georgetown-traffic-ai
   ```

2. **Set up environment variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Copy service-specific environment files
   cp frontend/.env.example frontend/.env
   cp backend/.env.example backend/.env
   cp python-ai/.env.example python-ai/.env
   ```

3. **Update environment variables**
   - Edit `.env` and update `JWT_SECRET` with a secure random string
   - Review other settings and adjust as needed

4. **Build and start all services**
   ```bash
   docker-compose up --build
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Python AI Service: http://localhost:8000
   - MongoDB: localhost:27017
   - Redis: localhost:6379

## Services Overview

### Frontend (React + Vite)
- **Port**: 3000
- **Hot Reload**: Enabled via volume mount
- **Build Context**: `./frontend`

### Backend (Node.js + Express)
- **Port**: 5000
- **Hot Reload**: Enabled via nodemon and volume mount
- **Build Context**: `./backend`
- **Dependencies**: MongoDB, Redis, Python AI Service

### Python AI Service (FastAPI + SUMO)
- **Port**: 8000
- **Hot Reload**: Enabled via uvicorn --reload and volume mount
- **Build Context**: `./python-ai`
- **Dependencies**: MongoDB, SUMO

### MongoDB
- **Port**: 27017
- **Version**: 6
- **Data Persistence**: Named volume `mongodb-data`

### Redis
- **Port**: 6379
- **Version**: 7-alpine
- **Data Persistence**: Named volume `redis-data`

## Common Commands

### Start services
```bash
# Start all services in foreground
docker-compose up

# Start all services in background
docker-compose up -d

# Start specific service
docker-compose up frontend
```

### Stop services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

### View logs
```bash
# View all logs
docker-compose logs

# View logs for specific service
docker-compose logs frontend
docker-compose logs backend
docker-compose logs python-ai

# Follow logs in real-time
docker-compose logs -f backend
```

### Rebuild services
```bash
# Rebuild all services
docker-compose build

# Rebuild specific service
docker-compose build backend

# Rebuild and restart
docker-compose up --build
```

### Execute commands in containers
```bash
# Access backend shell
docker-compose exec backend sh

# Access Python AI shell
docker-compose exec python-ai bash

# Run npm commands in backend
docker-compose exec backend npm install <package>

# Run Python commands
docker-compose exec python-ai python -m pytest
```

### Database operations
```bash
# Access MongoDB shell
docker-compose exec mongodb mongosh georgetown-traffic-ai

# Access Redis CLI
docker-compose exec redis redis-cli
```

## Volume Mounts

### Hot Reload Configuration

All services are configured with volume mounts for hot-reload development:

**Frontend:**
- `./frontend:/app` - Source code mount
- `/app/node_modules` - Anonymous volume to prevent overwriting

**Backend:**
- `./backend:/app` - Source code mount
- `/app/node_modules` - Anonymous volume to prevent overwriting
- `./backend/logs:/app/logs` - Persistent logs

**Python AI:**
- `./python-ai:/app` - Source code mount
- `sumo-data:/app/sumo_data` - SUMO simulation data
- `./python-ai/models:/app/models` - ML model storage
- `./python-ai/logs:/app/logs` - Persistent logs

## Troubleshooting

### Port conflicts
If ports are already in use, you can change them in `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Change host port (left side)
```

### Permission issues
On Linux, you may need to fix file permissions:
```bash
sudo chown -R $USER:$USER .
```

### Container won't start
Check logs for errors:
```bash
docker-compose logs <service-name>
```

### Database connection issues
Ensure MongoDB is healthy:
```bash
docker-compose ps
docker-compose logs mongodb
```

### Hot reload not working
1. Ensure volume mounts are correct in `docker-compose.yml`
2. Restart the service:
   ```bash
   docker-compose restart <service-name>
   ```

### Out of disk space
Clean up Docker resources:
```bash
# Remove unused containers, networks, images
docker system prune

# Remove unused volumes (WARNING: deletes data)
docker volume prune
```

### Build cache issues
Force rebuild without cache:
```bash
docker-compose build --no-cache
```

## Development Workflow

1. **Make code changes** in your local files
2. **Changes auto-reload** in the running containers
3. **View logs** to see updates: `docker-compose logs -f <service>`
4. **Test changes** in the browser or via API

## Production Deployment

For production deployment:
1. Create separate `docker-compose.prod.yml`
2. Use multi-stage builds in Dockerfiles
3. Set `NODE_ENV=production`
4. Use proper secrets management
5. Configure reverse proxy (Nginx)
6. Set up SSL/TLS certificates
7. Configure monitoring and logging

## Network Architecture

All services communicate via the `georgetown-network` bridge network:
- Services can reference each other by service name
- Example: Backend connects to `mongodb://mongodb:27017`
- Frontend connects to backend via `http://localhost:5000` (from host)

## Health Checks

MongoDB and Redis have health checks configured:
- **MongoDB**: Checks database ping every 10s
- **Redis**: Checks redis-cli ping every 10s

View health status:
```bash
docker-compose ps
```

## Resource Limits

To set resource limits, add to service configuration:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [SUMO Documentation](https://sumo.dlr.de/docs/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React + Vite Documentation](https://vitejs.dev/)
