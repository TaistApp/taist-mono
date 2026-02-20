#!/bin/bash

# ==============================================================================
# Taist - Start Local Development Environment
# ==============================================================================
# Quick script to start both backend and frontend in local mode
# ==============================================================================

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                 TAIST LOCAL DEVELOPMENT                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if backend .env exists
if [ ! -f "$SCRIPT_DIR/backend/.env" ]; then
    echo -e "${YELLOW}⚠  Backend not configured yet. Running setup script...${NC}"
    echo ""
    bash "$SCRIPT_DIR/backend/scripts/setup-local.sh"
    echo ""
fi

# Check if frontend node_modules exists
if [ ! -d "$SCRIPT_DIR/frontend/node_modules" ]; then
    echo -e "${YELLOW}⚠  Frontend dependencies not installed. Installing...${NC}"
    echo ""
    cd "$SCRIPT_DIR/frontend"
    npm install
    cd "$SCRIPT_DIR"
    echo ""
fi

echo ""
echo -e "${GREEN}✓ Starting development servers...${NC}"
echo ""
echo -e "${BLUE}Backend:${NC}  http://localhost:8005"
echo -e "${BLUE}Frontend:${NC} Will open in Expo"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""
echo "================================================================"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping all servers...${NC}"
    kill 0
}

trap cleanup EXIT INT TERM

# Start backend server
cd "$SCRIPT_DIR/backend"
echo -e "${BLUE}[BACKEND]${NC} Starting Laravel server..."
php artisan serve --host=127.0.0.1 --port=8005 &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
cd "$SCRIPT_DIR/frontend"
echo ""
echo -e "${BLUE}[FRONTEND]${NC} Starting Expo in local mode..."
echo ""
APP_ENV=local npm start

# Wait for any process to exit
wait

