# Georgetown Traffic AI - Setup Checklist

Use this checklist to ensure your development environment is properly configured.

## ✅ Prerequisites

- [ ] Docker Engine 20.10+ installed
- [ ] Docker Compose 2.0+ installed
- [ ] At least 8GB RAM available for Docker
- [ ] At least 20GB free disk space
- [ ] Git installed (for version control)

## ✅ Initial Setup

### 1. Repository Setup
- [ ] Repository cloned to local machine
- [ ] Navigate to project root directory

### 2. Environment Configuration
- [ ] Copy `.env.example` to `.env` in root directory
- [ ] Copy `frontend/.env.example` to `frontend/.env`
- [ ] Copy `backend/.env.example` to `backend/.env`
- [ ] Copy `python-ai/.env.example` to `python-ai/.env`

### 3. Environment Variables Configuration

#### Backend (.env)
- [ ] Update `JWT_SECRET` with a secure random string (min 32 characters)
- [ ] Review `MONGODB_URI` (default: mongodb://mongodb:27017/georgetown-traffic-ai)
- [ ] Review `REDIS_URL` (default: redis://redis:6379)
- [ ] Review `CORS_ORIGIN` (default: http://localhost:3000)

#### Frontend (.env)
- [ ] Verify `VITE_API_URL` points to backend (default: http://localhost:5000)
- [ ] Verify `VITE_WS_URL` points to WebSocket (default: ws://localhost:5000)

#### Python AI (.env)
- [ ] Verify `MONGODB_URI` matches backend configuration
- [ ] Review `SUMO_HOME` path (default: /usr/share/sumo)
- [ ] Review `MODEL_STORAGE_PATH` (default: ./models)

## ✅ Docker Configuration Verification

### 1. File Structure Check
- [ ] `docker-compose.yml` exists in root
- [ ] `frontend/Dockerfile` exists
- [ ] `frontend/.dockerignore` exists
- [ ] `backend/Dockerfile` exists
- [ ] `backend/.dockerignore` exists
- [ ] `python-ai/Dockerfile` exists
- [ ] `python-ai/.dockerignore` exists

### 2. Validate Configuration
Run validation script:
```bash
# Linux/Mac
bash scripts/validate-docker-setup.sh

# Windows
scripts\validate-docker-setup.bat
```

- [ ] All validation checks pass
- [ ] Docker daemon is running
- [ ] docker-compose.yml syntax is valid

## ✅ Build and Start Services

### 1. Build Docker Images
```bash
docker compose build
```
- [ ] Frontend image builds successfully
- [ ] Backend image builds successfully
- [ ] Python AI image builds successfully
- [ ] No build errors reported

### 2. Start Services
```bash
docker compose up -d
```
- [ ] All 5 services start (frontend, backend, python-ai, mongodb, redis)
- [ ] No startup errors in logs

### 3. Verify Services
```bash
docker compose ps
```
- [ ] All services show "running" status
- [ ] Health checks pass for mongodb and redis

## ✅ Access Verification

### 1. Frontend
- [ ] Open http://localhost:3000 in browser
- [ ] Page loads without errors
- [ ] No console errors in browser DevTools

### 2. Backend API
- [ ] Open http://localhost:5000 in browser or API client
- [ ] API responds (may show "Cannot GET /" - this is normal)
- [ ] Check health endpoint if available

### 3. Python AI Service
- [ ] Open http://localhost:8000/docs in browser
- [ ] FastAPI Swagger documentation loads
- [ ] API endpoints are listed

### 4. Database Connections
```bash
# MongoDB
docker compose exec mongodb mongosh georgetown-traffic-ai

# Redis
docker compose exec redis redis-cli ping
```
- [ ] MongoDB shell connects successfully
- [ ] Redis responds with "PONG"

## ✅ Hot Reload Verification

### 1. Frontend Hot Reload
- [ ] Make a small change to a React component
- [ ] Save the file
- [ ] Browser automatically refreshes with changes

### 2. Backend Hot Reload
- [ ] Make a small change to a backend file
- [ ] Save the file
- [ ] Check logs: `docker compose logs -f backend`
- [ ] Server restarts automatically

### 3. Python AI Hot Reload
- [ ] Make a small change to a Python file
- [ ] Save the file
- [ ] Check logs: `docker compose logs -f python-ai`
- [ ] Server reloads automatically

## ✅ Volume Mounts Verification

### 1. Check Volume Mounts
```bash
docker compose config
```
- [ ] Frontend source code mounted to `/app`
- [ ] Backend source code mounted to `/app`
- [ ] Python AI source code mounted to `/app`
- [ ] Persistent volumes configured for mongodb, redis, sumo-data

### 2. Verify Data Persistence
- [ ] Stop services: `docker compose down`
- [ ] Start services: `docker compose up -d`
- [ ] Database data persists after restart

## ✅ Network Configuration

### 1. Service Communication
- [ ] Backend can connect to MongoDB
- [ ] Backend can connect to Redis
- [ ] Backend can connect to Python AI service
- [ ] Frontend can connect to Backend API

### 2. Port Accessibility
- [ ] Port 3000 accessible (Frontend)
- [ ] Port 5000 accessible (Backend)
- [ ] Port 8000 accessible (Python AI)
- [ ] Port 27017 accessible (MongoDB)
- [ ] Port 6379 accessible (Redis)

## ✅ Development Workflow

### 1. View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
```
- [ ] Can view logs for all services
- [ ] Logs update in real-time

### 2. Execute Commands
```bash
# Backend shell
docker compose exec backend sh

# Python AI shell
docker compose exec python-ai bash
```
- [ ] Can access service shells
- [ ] Can run commands inside containers

### 3. Install Dependencies
```bash
# Backend
docker compose exec backend npm install <package>

# Python AI
docker compose exec python-ai pip install <package>
```
- [ ] Can install new dependencies
- [ ] Dependencies persist after container restart

## ✅ Troubleshooting

### Common Issues Checklist
- [ ] If ports conflict, update port mappings in docker-compose.yml
- [ ] If build fails, check Dockerfile syntax
- [ ] If services won't start, check logs: `docker compose logs <service>`
- [ ] If hot reload doesn't work, verify volume mounts
- [ ] If out of disk space, run: `docker system prune`
- [ ] If permission issues (Linux), run: `sudo chown -R $USER:$USER .`

## ✅ Optional Enhancements

### 1. Convenience Commands
- [ ] Review Makefile commands (Linux/Mac)
- [ ] Review docker-commands.bat (Windows)
- [ ] Test convenience commands

### 2. IDE Configuration
- [ ] Configure IDE for Docker development
- [ ] Set up remote debugging if needed
- [ ] Configure linting and formatting

### 3. Git Configuration
- [ ] Ensure .env files are in .gitignore
- [ ] Commit docker-compose.yml and Dockerfiles
- [ ] Commit .env.example files

## 🎉 Setup Complete!

If all items are checked, your development environment is ready!

### Next Steps:
1. Review the [DOCKER_SETUP.md](./DOCKER_SETUP.md) for detailed Docker usage
2. Check service-specific READMEs:
   - [Frontend README](./frontend/README.md)
   - [Backend README](./backend/README.md)
   - [Python AI README](./python-ai/README.md)
3. Start implementing features from the task list
4. Review the [Design Document](./.kiro/specs/georgetown-traffic-ai/design.md)

### Useful Commands:
```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Rebuild after changes
docker compose up --build

# Clean everything
docker compose down -v
```

Happy coding! 🚀
