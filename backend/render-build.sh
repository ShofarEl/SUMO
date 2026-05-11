#!/usr/bin/env bash
# Render build script for backend

set -e

echo "Installing dependencies..."
npm install --production=false

echo "Build completed successfully!"
