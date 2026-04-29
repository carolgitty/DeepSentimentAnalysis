#!/bin/bash

# Text Analyzer UI - Setup & Run Script
# This script helps set up and run the Angular application

echo "=================================================="
echo "Text Analyzer UI - Angular Application"
echo "=================================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Node.js installation
echo -e "${YELLOW}Checking prerequisites...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js v18+ from https://nodejs.org/${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed. Please install npm.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)

echo -e "${GREEN}✓ Node.js ${NODE_VERSION} found${NC}"
echo -e "${GREEN}✓ npm ${NPM_VERSION} found${NC}"
echo ""

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencies installed successfully${NC}"
else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi

echo ""
echo "=================================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "=================================================="
echo ""
echo "Available commands:"
echo -e "${YELLOW}npm start${NC}          - Start development server (http://localhost:4200)"
echo -e "${YELLOW}npm run build${NC}      - Build for production"
echo -e "${YELLOW}npm test${NC}           - Run unit tests"
echo -e "${YELLOW}npm run watch${NC}      - Watch mode for development"
echo ""
echo "Quick start:"
echo "  1. Run: npm start"
echo "  2. Open: http://localhost:4200"
echo ""
