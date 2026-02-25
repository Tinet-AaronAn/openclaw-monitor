#!/bin/bash

# OpenClaw Monitor - Startup Script

echo "🦞 Starting OpenClaw Monitor..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  pnpm install
fi

# Start in development mode
echo "🚀 Starting development servers..."
pnpm dev
