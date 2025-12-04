#!/bin/bash

# Copy Local MySQL Database to Railway Staging (Direct Connection)
# This version uses direct connection details without Railway CLI proxy

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LOCAL_DB_NAME="${LOCAL_DB_NAME:-taist_local}"
LOCAL_DB_USER="${LOCAL_DB_USER:-root}"
LOCAL_DB_PASS="${LOCAL_DB_PASS:-}"
BACKUP_DIR="${BACKUP_DIR:-./db-backups}"

# Railway MySQL credentials (from your provided values)
RAILWAY_DB_NAME="${RAILWAY_DB_NAME:-railway}"
RAILWAY_DB_USER="${RAILWAY_DB_USER:-root}"
RAILWAY_DB_PASS="${RAILWAY_DB_PASS:-FPFWmAogihfsrnuQjyyBWkdqPJTMaKQe}"

# Railway connection details - SET THESE FROM RAILWAY DASHBOARD
# Option 1: Use TCP Proxy (public connection)
RAILWAY_HOST="${RAILWAY_HOST:-}"
RAILWAY_PORT="${RAILWAY_PORT:-}"

# Option 2: Use Private Domain (if available)
RAILWAY_PRIVATE_HOST="${RAILWAY_PRIVATE_HOST:-}"

# Function to print colored output
info() { echo -e "${BLUE}ℹ${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
warning() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to get Railway connection details
get_railway_connection() {
    info "Getting Railway MySQL connection details..."
    
    # Try Option 1: TCP Proxy (public)
    if [ -n "$RAILWAY_HOST" ] && [ -n "$RAILWAY_PORT" ]; then
        success "Using TCP Proxy: $RAILWAY_HOST:$RAILWAY_PORT"
        return 0
    fi
    
    # Try Option 2: Private Domain
    if [ -n "$RAILWAY_PRIVATE_HOST" ]; then
        RAILWAY_HOST="$RAILWAY_PRIVATE_HOST"
        RAILWAY_PORT="3306"
        success "Using Private Domain: $RAILWAY_HOST:$RAILWAY_PORT"
        return 0
    fi
    
    # Prompt user for connection details
    echo ""
    warning "Railway connection details not set!"
    echo ""
    info "You need to get these from Railway Dashboard:"
    echo "  1. Go to Railway Dashboard → Your Project → MySQL Service"
    echo "  2. Go to 'Variables' tab"
    echo "  3. Look for one of these:"
    echo "     - RAILWAY_TCP_PROXY_DOMAIN (use this with RAILWAY_TCP_PROXY_PORT)"
    echo "     - RAILWAY_PRIVATE_DOMAIN (use this with port 3306)"
    echo ""
    echo "Or use the MYSQL_PUBLIC_URL value and extract host/port from it"
    echo ""
    
    read -p "Enter Railway MySQL host: " RAILWAY_HOST
    if [ -z "$RAILWAY_HOST" ]; then
        error "Host is required"
        exit 1
    fi
    
    read -p "Enter Railway MySQL port [3306]: " RAILWAY_PORT
    RAILWAY_PORT="${RAILWAY_PORT:-3306}"
    
    success "Using: $RAILWAY_HOST:$RAILWAY_PORT"
    return 0
}

# Function to test MySQL connection
test_mysql_connection() {
    local host=$1
    local port=$2
    local user=$3
    local pass=$4
    local db=$5
    
    info "Testing MySQL connection to $host:$port..."
    
    mysql -h "$host" -P "$port" -u "$user" -p"$pass" "$db" -e "SELECT 1 as test;" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        success "MySQL connection successful"
        return 0
    else
        error "MySQL connection failed"
        return 1
    fi
}

# Function to export local database
export_local_db() {
    info "Exporting local database: $LOCAL_DB_NAME"
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Generate backup filename with timestamp
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/local_db_backup_${TIMESTAMP}.sql"
    
    # Export database
    if [ -z "$LOCAL_DB_PASS" ]; then
        mysqldump -u "$LOCAL_DB_USER" \
            --single-transaction \
            --routines \
            --triggers \
            --add-drop-table \
            "$LOCAL_DB_NAME" > "$BACKUP_FILE"
    else
        mysqldump -u "$LOCAL_DB_USER" -p"$LOCAL_DB_PASS" \
            --single-transaction \
            --routines \
            --triggers \
            --add-drop-table \
            "$LOCAL_DB_NAME" > "$BACKUP_FILE"
    fi
    
    if [ $? -eq 0 ]; then
        success "Database exported to: $BACKUP_FILE"
        
        # Compress backup
        info "Compressing backup..."
        gzip "$BACKUP_FILE"
        BACKUP_FILE="${BACKUP_FILE}.gz"
        success "Backup compressed: $BACKUP_FILE"
        
        # Verify migrations table is included
        info "Verifying migrations table is included in backup..."
        if gunzip -c "$BACKUP_FILE" | grep -qi "CREATE TABLE.*migrations"; then
            success "Migrations table found in backup"
        else
            error "WARNING: Migrations table not found in backup!"
            warning "This may cause migration conflicts after import"
            read -p "Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                error "Aborted by user"
                exit 1
            fi
        fi
        
        echo "$BACKUP_FILE"
        return 0
    else
        error "Failed to export local database"
        return 1
    fi
}

# Function to backup Railway database before import
backup_railway_db() {
    info "Backing up Railway staging database before import..."
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    RAILWAY_BACKUP="$BACKUP_DIR/railway_staging_backup_before_import_${TIMESTAMP}.sql"
    
    mysqldump -h "$RAILWAY_HOST" -P "$RAILWAY_PORT" -u "$RAILWAY_DB_USER" -p"$RAILWAY_DB_PASS" \
        --single-transaction \
        "$RAILWAY_DB_NAME" > "$RAILWAY_BACKUP" 2>/dev/null || {
        warning "Could not create Railway backup (database might be empty)"
        return 0
    }
    
    if [ -f "$RAILWAY_BACKUP" ] && [ -s "$RAILWAY_BACKUP" ]; then
        gzip "$RAILWAY_BACKUP"
        success "Railway backup saved: ${RAILWAY_BACKUP}.gz"
    fi
}

# Function to import database to Railway
import_to_railway() {
    local backup_file=$1
    
    info "Importing database to Railway staging..."
    info "Host: $RAILWAY_HOST:$RAILWAY_PORT"
    info "Database: $RAILWAY_DB_NAME"
    
    # Uncompress and import
    gunzip -c "$backup_file" | \
        mysql -h "$RAILWAY_HOST" -P "$RAILWAY_PORT" -u "$RAILWAY_DB_USER" -p"$RAILWAY_DB_PASS" \
            --max_allowed_packet=1G \
            "$RAILWAY_DB_NAME"
    
    if [ $? -eq 0 ]; then
        success "Database imported successfully to Railway"
        return 0
    else
        error "Failed to import database to Railway"
        return 1
    fi
}

# Function to verify migrations table
verify_migrations() {
    info "Verifying migrations table in Railway database..."
    
    # Get migration count
    MIGRATION_COUNT=$(mysql -h "$RAILWAY_HOST" -P "$RAILWAY_PORT" -u "$RAILWAY_DB_USER" -p"$RAILWAY_DB_PASS" \
        "$RAILWAY_DB_NAME" -Nse "SELECT COUNT(*) FROM migrations;" 2>/dev/null)
    
    if [ -n "$MIGRATION_COUNT" ] && [ "$MIGRATION_COUNT" -gt 0 ]; then
        success "Migrations table verified: $MIGRATION_COUNT migrations found"
        
        # Show some migrations
        info "Sample migrations:"
        mysql -h "$RAILWAY_HOST" -P "$RAILWAY_PORT" -u "$RAILWAY_DB_USER" -p"$RAILWAY_DB_PASS" \
            "$RAILWAY_DB_NAME" -e "SELECT migration, batch FROM migrations ORDER BY batch, id LIMIT 10;" 2>/dev/null
        
        return 0
    else
        error "Migrations table is empty or missing!"
        warning "Future migrations may fail. Consider running: railway run --environment staging php artisan railway:fix-migrations"
        return 1
    fi
}

# Main execution
main() {
    echo "=========================================="
    echo "  Local → Railway Database Copy Script"
    echo "  (Direct Connection Method)"
    echo "=========================================="
    echo ""
    
    # Check prerequisites
    if ! command_exists mysql; then
        error "MySQL client not found. Please install mysql-client."
        exit 1
    fi
    
    if ! command_exists mysqldump; then
        error "mysqldump not found. Please install mysql-client."
        exit 1
    fi
    
    # Get local database password if not set
    if [ -z "$LOCAL_DB_PASS" ]; then
        read -sp "Enter local MySQL password for user '$LOCAL_DB_USER' (press Enter if no password): " LOCAL_DB_PASS
        echo
    fi
    
    # Get Railway connection details
    get_railway_connection
    
    # Test local connection
    info "Testing local MySQL connection..."
    if [ -z "$LOCAL_DB_PASS" ]; then
        mysql -h "127.0.0.1" -P "3306" -u "$LOCAL_DB_USER" "$LOCAL_DB_NAME" -e "SELECT 1 as test;" > /dev/null 2>&1
    else
        mysql -h "127.0.0.1" -P "3306" -u "$LOCAL_DB_USER" -p"$LOCAL_DB_PASS" "$LOCAL_DB_NAME" -e "SELECT 1 as test;" > /dev/null 2>&1
    fi
    
    if [ $? -ne 0 ]; then
        error "Cannot connect to local database"
        exit 1
    fi
    success "Local MySQL connection successful"
    
    # Test Railway connection
    info "Testing Railway MySQL connection..."
    if ! test_mysql_connection "$RAILWAY_HOST" "$RAILWAY_PORT" "$RAILWAY_DB_USER" "$RAILWAY_DB_PASS" "$RAILWAY_DB_NAME"; then
        error "Cannot connect to Railway database"
        error "Please check:"
        error "  1. Railway MySQL service is running"
        error "  2. Host and port are correct"
        error "  3. Credentials are correct"
        error "  4. Your IP is allowed (if using TCP proxy)"
        exit 1
    fi
    
    # Confirm before proceeding
    echo ""
    warning "This will overwrite the Railway staging database!"
    echo "  Local DB: $LOCAL_DB_NAME"
    echo "  Railway DB: $RAILWAY_DB_NAME @ $RAILWAY_HOST:$RAILWAY_PORT"
    echo ""
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "Aborted by user"
        exit 0
    fi
    
    # Step 1: Export local database
    echo ""
    info "Step 1: Exporting local database..."
    BACKUP_FILE=$(export_local_db)
    if [ $? -ne 0 ]; then
        exit 1
    fi
    
    # Step 2: Backup Railway database
    echo ""
    info "Step 2: Backing up Railway database..."
    backup_railway_db
    
    # Step 3: Import to Railway
    echo ""
    info "Step 3: Importing to Railway..."
    if ! import_to_railway "$BACKUP_FILE"; then
        exit 1
    fi
    
    # Step 4: Verify migrations table
    echo ""
    info "Step 4: Verifying migrations table..."
    verify_migrations
    
    # Summary
    echo ""
    echo "=========================================="
    success "Database copy completed successfully!"
    echo "=========================================="
    echo ""
    info "Next steps:"
    echo "  1. Verify application works"
    echo "  2. Test migrations: railway run --environment staging php artisan migrate:status"
    echo "  3. Future migrations will work automatically!"
    echo ""
    info "Backup files saved in: $BACKUP_DIR"
    echo ""
}

# Run main function
main


