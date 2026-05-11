# Georgetown Traffic AI - Makefile
# Convenience commands for Docker Compose operations

.PHONY: help build up down restart logs clean validate

# Default target
help:
	@echo "Georgetown Traffic AI - Available Commands"
	@echo ""
	@echo "  make build      - Build all Docker images"
	@echo "  make up         - Start all services"
	@echo "  make down       - Stop all services"
	@echo "  make restart    - Restart all services"
	@echo "  make logs       - View logs from all services"
	@echo "  make clean      - Stop services and remove volumes"
	@echo "  make validate   - Validate Docker setup"
	@echo "  make ps         - Show running containers"
	@echo "  make shell-backend    - Access backend shell"
	@echo "  make shell-python     - Access Python AI shell"
	@echo "  make shell-mongo      - Access MongoDB shell"
	@echo "  make shell-redis      - Access Redis CLI"

# Build all services
build:
	docker compose build

# Start all services
up:
	docker compose up -d

# Start all services with logs
up-logs:
	docker compose up

# Stop all services
down:
	docker compose down

# Restart all services
restart:
	docker compose restart

# View logs
logs:
	docker compose logs -f

# View logs for specific service
logs-frontend:
	docker compose logs -f frontend

logs-backend:
	docker compose logs -f backend

logs-python:
	docker compose logs -f python-ai

logs-mongo:
	docker compose logs -f mongodb

logs-redis:
	docker compose logs -f redis

# Clean up (remove volumes)
clean:
	docker compose down -v
	@echo "Warning: All data volumes have been removed"

# Validate Docker setup
validate:
	@bash scripts/validate-docker-setup.sh

# Show container status
ps:
	docker compose ps

# Access shells
shell-backend:
	docker compose exec backend sh

shell-python:
	docker compose exec python-ai bash

shell-mongo:
	docker compose exec mongodb mongosh georgetown-traffic-ai

shell-redis:
	docker compose exec redis redis-cli

# Rebuild specific service
rebuild-frontend:
	docker compose build --no-cache frontend
	docker compose up -d frontend

rebuild-backend:
	docker compose build --no-cache backend
	docker compose up -d backend

rebuild-python:
	docker compose build --no-cache python-ai
	docker compose up -d python-ai

# Install dependencies
install-frontend:
	docker compose exec frontend npm install

install-backend:
	docker compose exec backend npm install

install-python:
	docker compose exec python-ai pip install -r requirements.txt

# Run tests
test-backend:
	docker compose exec backend npm test

test-python:
	docker compose exec python-ai python -m pytest

# Database operations
db-backup:
	docker compose exec mongodb mongodump --out=/data/backup

db-restore:
	docker compose exec mongodb mongorestore /data/backup
