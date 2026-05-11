#!/bin/bash

# Georgetown Traffic AI - Docker Setup Validation Script
# This script validates the Docker Compose configuration

set -e

echo "🔍 Validating Docker Setup..."
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    echo "   Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi
echo "✅ Docker is installed"

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available"
    echo "   Please install Docker Compose v2+"
    exit 1
fi
echo "✅ Docker Compose is available"

# Validate docker-compose.yml syntax
if docker compose config > /dev/null 2>&1; then
    echo "✅ docker-compose.yml syntax is valid"
else
    echo "❌ docker-compose.yml has syntax errors"
    docker compose config
    exit 1
fi

# Check if required files exist
echo ""
echo "📁 Checking required files..."

required_files=(
    "docker-compose.yml"
    "frontend/Dockerfile"
    "frontend/.dockerignore"
    "frontend/.env.example"
    "backend/Dockerfile"
    "backend/.dockerignore"
    "backend/.env.example"
    "python-ai/Dockerfile"
    "python-ai/.dockerignore"
    "python-ai/.env.example"
)

all_files_exist=true
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file is missing"
        all_files_exist=false
    fi
done

if [ "$all_files_exist" = false ]; then
    echo ""
    echo "❌ Some required files are missing"
    exit 1
fi

# Check if .env files exist (warn if not)
echo ""
echo "🔐 Checking environment files..."

env_files=(
    "frontend/.env"
    "backend/.env"
    "python-ai/.env"
)

for file in "${env_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "⚠️  $file not found (copy from .env.example)"
    fi
done

# Check Docker daemon
echo ""
echo "🐳 Checking Docker daemon..."
if docker info > /dev/null 2>&1; then
    echo "✅ Docker daemon is running"
else
    echo "❌ Docker daemon is not running"
    echo "   Please start Docker Desktop or Docker service"
    exit 1
fi

# Display Docker Compose services
echo ""
echo "📋 Docker Compose Services:"
docker compose config --services

echo ""
echo "✅ Docker setup validation complete!"
echo ""
echo "Next steps:"
echo "1. Copy .env.example files to .env for each service"
echo "2. Update JWT_SECRET in backend/.env"
echo "3. Run: docker compose up --build"
