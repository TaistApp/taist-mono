#!/bin/bash

# Copy Local MySQL Database to Railway Staging
# Safely preserves migrations table to prevent migration conflicts

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
RAILWAY_ENV="${RAILWAY_ENV:-staging}"
BACKUP_DIR="${BACKUP_DIR:-./db-backups}"

# Railway MySQL credentials (from user-provided values)
RAILWAY_DB_NAME="${RAILWAY_DB_NAME:-railway}"
RAILWAY_DB_USER="${RAILWAY_DB_USER:-root}"
RAILWAY_DB_PASS="${RAILWAY_DB_PASS:-FPFWmAogihfsrnuQjyyBWkdqPJTMaKQe}"

# Function to print colored output
info() { echo -e "${BLUE}ℹ${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
warning() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to get Railway MySQL connection details
get_railway_connection() {
    info "Getting Railway MySQL connection details..."
    
    if command_exists railway; then
        info "Using Railway CLI to get connection details..."
        
        # Try to get Railway variables
        if railway variables --environment "$RAILWAY_ENV" > /dev/null 2>&1; then
            RAILWAY_HOST=$(railway variables --environment "$RAILWAY_ENV" | grep RAILWAY_PRIVATE_DOMAIN | cut -d'=' -f2 | tr -d ' ')
            RAILWAY_PORT="3306"
            
            if [ -z "$RAILWAY_HOST" ]; then
                warning "Could not get RAILWAY_PRIVATE_DOMAIN, trying TCP proxy..."
                RAILWAY_HOST=$(railway variables --environment "$RAILWAY_ENV" | grep RAILWAY_TCP_PROXY_DOMAIN | cut -d'=' -f2 | tr -d ' ')
                RAILWAY_PORT=$(railway variables --environment "$RAILWAY_ENV" | grep RAILWAY_TCP_PROXY_PORT | cut -d'=' -f2 | tr -d ' ')
            fi
            
            if [ -n "$RAILWAY_HOST" ]; then
                success "Found Railway host: $RAILWAY_HOST:$RAILWAY_PORT"
                return 0
            fi
        fi
    fi
    
    # Fallback: Use Railway proxy connection
    warning "Railway CLI variables not available. Using Railway proxy connection..."
    info "You'll need to run: railway connect mysql --environment $RAILWAY_ENV"
    info "Then use the provided connection string in a separate terminal"
    read -p "Enter Railway MySQL host (or press Enter to use Railway proxy): " RAILWAY_HOST
    if [ -z "$RAILWAY_HOST" ]; then
        RAILWAY_HOST="127.0.0.1"
        RAILWAY_PORT="3306"
        warning "Assuming Railway proxy is running on localhost:3306"
        warning "Make sure to run 'railway connect mysql' in another terminal first!"
    else
        read -p "Enter Railway MySQL port [3306]: " RAILWAY_PORT
        RAILWAY_PORT="${RAILWAY_PORT:-3306}"
    fi
    
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
    
    if [ -z "$pass" ]; then
        mysql -h "$host" -P "$port" -u "$user" "$db" -e "SELECT 1 as test;" > /dev/null 2>&1
    else
        mysql -h "$host" -P "$port" -u "$user" -p"$pass" "$db" -e "SELECT 1 as test;" > /dev/null 2>&1
    fi
    
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
    
    if [ -z "$RAILWAY_DB_PASS" ]; then
        mysqldump -h "$RAILWAY_HOST" -P "$RAILWAY_PORT" -u "$RAILWAY_DB_USER" \
            --single-transaction \
            "$RAILWAY_DB_NAME" > "$RAILWAY_BACKUP" 2>/dev/null || {
            warning "Could not create Railway backup (database might be empty)"
            return 0
        }
    else
        mysqldump -h "$RAILWAY_HOST" -P "$RAILWAY_PORT" -u "$RAILWAY_DB_USER" -p"$RAILWAY_DB_PASS" \
            --single-transaction \
            "$RAILWAY_DB_NAME" > "$RAILWAY_BACKUP" 2>/dev/null || {
            warning "Could not create Railway backup (database might be empty)"
            return 0
        }
    fi
    
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
    if [ -z "$RAILWAY_DB_PASS" ]; then
        gunzip -c "$backup_file" | \
            mysql -h "$RAILWAY_HOST" -P "$RAILWAY_PORT" -u "$RAILWAY_DB_USER" \
                --max_allowed_packet=1G \
                "$RAILWAY_DB_NAME"
    else
        gunzip -c "$backup_file" | \
            mysql -h "$RAILWAY_HOST" -P "$RAILWAY_PORT" -u "$RAILWAY_DB_USER" -p"$RAILWAY_DB_PASS" \
                --max_allowed_packet=1G \
                "$RAILWAY_DB_NAME"
    fi
    
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
    if [ -z "$RAILWAY_DB_PASS" ]; then
        MIGRATION_COUNT=$(mysql -h "$RAILWAY_HOST" -P "$RAILWAY_PORT" -u "$RAILWAY_DB_USER" \
            "$RAILWAY_DB_NAME" -Nse "SELECT COUNT(*) FROM migrations;" 2>/dev/null)
    else
        MIGRATION_COUNT=$(mysql -h "$RAILWAY_HOST" -P "$RAILWAY_PORT" -u "$RAILWAY_DB_USER" -p"$RAILWAY_DB_PASS" \
            "$RAILWAY_DB_NAME" -Nse "SELECT COUNT(*) FROM migrations;" 2>/dev/null)
    fi
    
    if [ -n "$MIGRATION_COUNT" ] && [ "$MIGRATION_COUNT" -gt 0 ]; then
        success "Migrations table verified: $MIGRATION_COUNT migrations found"
        
        # Show some migrations
        info "Sample migrations:"
        if [ -z "$RAILWAY_DB_PASS" ]; then
            mysql -h "$RAILWAY_HOST" -P "$RAILWAY_PORT" -u "$RAILWAY_DB_USER" \
                "$RAILWAY_DB_NAME" -e "SELECT migration, batch FROM migrations ORDER BY batch, id LIMIT 10;" 2>/dev/null
        else
            mysql -h "$RAILWAY_HOST" -P "$RAILWAY_PORT" -u "$RAILWAY_DB_USER" -p"$RAILWAY_DB_PASS" \
                "$RAILWAY_DB_NAME" -e "SELECT migration, batch FROM migrations ORDER BY batch, id LIMIT 10;" 2>/dev/null
        fi
        
        return 0
    else
        error "Migrations table is empty or missing!"
        warning "Future migrations may fail. Consider running: railway run --environment $RAILWAY_ENV php artisan railway:fix-migrations"
        return 1
    fi
}

# Function to test migrations status
test_migrations_status() {
    info "Testing migrations status via Railway CLI..."
    
    if command_exists railway; then
        railway run --environment "$RAILWAY_ENV" php artisan migrate:status
        if [ $? -eq 0 ]; then
            success "Migrations status check completed"
            return 0
        else
            warning "Could not check migrations status (this is okay if Railway CLI is not configured)"
            return 1
        fi
    else
        warning "Railway CLI not installed. Skipping migrations status check."
        info "You can manually check by running: railway run --environment $RAILWAY_ENV php artisan migrate:status"
        return 1
    fi
}

# Main execution
main() {
    echo "=========================================="
    echo "  Local → Railway Database Copy Script"
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
    if ! test_mysql_connection "127.0.0.1" "3306" "$LOCAL_DB_USER" "$LOCAL_DB_PASS" "$LOCAL_DB_NAME"; then
        error "Cannot connect to local database"
        exit 1
    fi
    
    # Test Railway connection
    info "Testing Railway MySQL connection..."
    if ! test_mysql_connection "$RAILWAY_HOST" "$RAILWAY_PORT" "$RAILWAY_DB_USER" "$RAILWAY_DB_PASS" "$RAILWAY_DB_NAME"; then
        error "Cannot connect to Railway database"
        error "Make sure Railway MySQL service is running and accessible"
        error "If using Railway proxy, run: railway connect mysql --environment $RAILWAY_ENV"
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
    
    # Step 5: Test migrations status
    echo ""
    info "Step 5: Testing migrations status..."
    test_migrations_status
    
    # Summary
    echo ""
    echo "=========================================="
    success "Database copy completed successfully!"
    echo "=========================================="
    echo ""
    info "Next steps:"
    echo "  1. Verify application works: curl https://your-railway-app.up.railway.app/mapi/get-version"
    echo "  2. Test migrations: railway run --environment $RAILWAY_ENV php artisan migrate:status"
    echo "  3. Future migrations will work automatically!"
    echo ""
    info "Backup files saved in: $BACKUP_DIR"
    echo ""
}

# Run main function
main


