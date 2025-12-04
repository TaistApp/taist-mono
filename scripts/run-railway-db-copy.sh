#!/bin/bash

# Quick script to copy local database to Railway with pre-configured connection details

cd "$(dirname "$0")/.."

# Railway connection details (from Railway dashboard)
export RAILWAY_HOST="mainline.proxy.rlwy.net"
export RAILWAY_PORT="20323"
export RAILWAY_DB_NAME="railway"
export RAILWAY_DB_USER="root"
export RAILWAY_DB_PASS="FPFWmAogihfsrnuQjyyBWkdqPJTMaKQe"

# Local database - change this if your local DB has a different name
export LOCAL_DB_NAME="${LOCAL_DB_NAME:-taist_local}"
export LOCAL_DB_USER="${LOCAL_DB_USER:-root}"

echo "=========================================="
echo "  Railway Database Copy - Quick Start"
echo "=========================================="
echo ""
echo "Railway Connection:"
echo "  Host: $RAILWAY_HOST:$RAILWAY_PORT"
echo "  Database: $RAILWAY_DB_NAME"
echo ""
echo "Local Database:"
echo "  Name: $LOCAL_DB_NAME"
echo "  User: $LOCAL_DB_USER"
echo ""

# Check if local DB name should be changed
read -p "Is your local database name '$LOCAL_DB_NAME'? (Y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Nn]$ ]]; then
    read -p "Enter your local database name: " LOCAL_DB_NAME
    export LOCAL_DB_NAME
fi

# Run the direct connection script
./scripts/copy-local-to-railway-direct.sh


