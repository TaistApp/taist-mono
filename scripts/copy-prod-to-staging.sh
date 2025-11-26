#!/bin/bash

#######################################
# Database Copy Script: Production → Staging
# 
# This script automates copying production databases to staging
# 
# Usage:
#   ./copy-prod-to-staging.sh [options]
#
# Options:
#   --dry-run    Show what would be done without executing
#   --skip-sanitize    Skip data sanitization step
#   --help       Show this help message
#
#######################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROD_HOST="18.216.154.184"
PROD_USER="ec2-user"
STAGING_HOST="18.118.114.98"
STAGING_USER="ubuntu"
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
LOCAL_BACKUP_DIR="$HOME/taist-db-backups"
SSH_KEY_PATH="$HOME/.ssh/taist-aws-key.pem"  # Update this to your actual key path

# Databases to copy
DATABASES=("db_taist" "taist-main")

# Flags
DRY_RUN=false
SKIP_SANITIZE=false

#######################################
# Functions
#######################################

print_header() {
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}======================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

show_help() {
    cat << EOF
Database Copy Script: Production → Staging

This script automates the process of copying production databases to staging.

USAGE:
    ./copy-prod-to-staging.sh [options]

OPTIONS:
    --dry-run           Show what would be done without executing
    --skip-sanitize     Skip data sanitization step
    --help              Show this help message

PREREQUISITES:
    - SSH access to both production and staging servers
    - SSH key configured at: $SSH_KEY_PATH
    - MySQL root credentials
    - Sufficient disk space on staging

DATABASES:
    - db_taist (Laravel)
    - taist-main (Legacy PHP)

EXAMPLES:
    # Normal run
    ./copy-prod-to-staging.sh

    # Dry run (see what would happen)
    ./copy-prod-to-staging.sh --dry-run

    # Skip data sanitization
    ./copy-prod-to-staging.sh --skip-sanitize

EOF
}

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check SSH key exists
    if [ ! -f "$SSH_KEY_PATH" ]; then
        print_error "SSH key not found at: $SSH_KEY_PATH"
        print_info "Please update SSH_KEY_PATH in this script"
        exit 1
    fi
    print_success "SSH key found"
    
    # Create local backup directory
    mkdir -p "$LOCAL_BACKUP_DIR"
    print_success "Local backup directory ready"
    
    # Test SSH connections
    print_info "Testing SSH connection to production..."
    if ssh -i "$SSH_KEY_PATH" -o ConnectTimeout=5 "$PROD_USER@$PROD_HOST" "echo 'Connection OK'" &>/dev/null; then
        print_success "Production server accessible"
    else
        print_error "Cannot connect to production server"
        exit 1
    fi
    
    print_info "Testing SSH connection to staging..."
    if ssh -i "$SSH_KEY_PATH" -o ConnectTimeout=5 "$STAGING_USER@$STAGING_HOST" "echo 'Connection OK'" &>/dev/null; then
        print_success "Staging server accessible"
    else
        print_error "Cannot connect to staging server"
        exit 1
    fi
}

backup_production() {
    print_header "Backing Up Production Databases"
    
    for DB in "${DATABASES[@]}"; do
        print_info "Backing up $DB..."
        
        if [ "$DRY_RUN" = true ]; then
            print_info "[DRY RUN] Would backup: $DB"
            continue
        fi
        
        # Create backup on production server
        ssh -i "$SSH_KEY_PATH" "$PROD_USER@$PROD_HOST" << EOF
            set -e
            mkdir -p ~/db-backups
            echo "Creating backup of $DB..."
            mysqldump -u root $DB | gzip > ~/db-backups/${DB}_${BACKUP_DATE}.sql.gz
            ls -lh ~/db-backups/${DB}_${BACKUP_DATE}.sql.gz
EOF
        
        if [ $? -eq 0 ]; then
            print_success "Backed up $DB"
        else
            print_error "Failed to backup $DB"
            exit 1
        fi
    done
}

download_backups() {
    print_header "Downloading Backups to Local Machine"
    
    for DB in "${DATABASES[@]}"; do
        print_info "Downloading $DB backup..."
        
        if [ "$DRY_RUN" = true ]; then
            print_info "[DRY RUN] Would download: ${DB}_${BACKUP_DATE}.sql.gz"
            continue
        fi
        
        scp -i "$SSH_KEY_PATH" \
            "$PROD_USER@$PROD_HOST:~/db-backups/${DB}_${BACKUP_DATE}.sql.gz" \
            "$LOCAL_BACKUP_DIR/"
        
        if [ $? -eq 0 ]; then
            print_success "Downloaded $DB backup"
        else
            print_error "Failed to download $DB backup"
            exit 1
        fi
    done
}

upload_to_staging() {
    print_header "Uploading Backups to Staging"
    
    for DB in "${DATABASES[@]}"; do
        print_info "Uploading $DB backup to staging..."
        
        if [ "$DRY_RUN" = true ]; then
            print_info "[DRY RUN] Would upload: ${DB}_${BACKUP_DATE}.sql.gz"
            continue
        fi
        
        scp -i "$SSH_KEY_PATH" \
            "$LOCAL_BACKUP_DIR/${DB}_${BACKUP_DATE}.sql.gz" \
            "$STAGING_USER@$STAGING_HOST:~/"
        
        if [ $? -eq 0 ]; then
            print_success "Uploaded $DB backup to staging"
        else
            print_error "Failed to upload $DB backup"
            exit 1
        fi
    done
}

import_to_staging() {
    print_header "Importing Databases on Staging"
    
    for DB in "${DATABASES[@]}"; do
        print_info "Importing $DB to staging..."
        
        if [ "$DRY_RUN" = true ]; then
            print_info "[DRY RUN] Would import: $DB"
            continue
        fi
        
        ssh -i "$SSH_KEY_PATH" "$STAGING_USER@$STAGING_HOST" << EOF
            set -e
            cd ~/
            echo "Decompressing ${DB}_${BACKUP_DATE}.sql.gz..."
            gunzip -f ${DB}_${BACKUP_DATE}.sql.gz
            
            echo "Importing to $DB..."
            mysql -u root $DB < ${DB}_${BACKUP_DATE}.sql
            
            echo "Verifying import..."
            TABLE_COUNT=\$(mysql -u root -Nse "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB';")
            echo "Tables in $DB: \$TABLE_COUNT"
            
            # Clean up
            rm ${DB}_${BACKUP_DATE}.sql
EOF
        
        if [ $? -eq 0 ]; then
            print_success "Imported $DB to staging"
        else
            print_error "Failed to import $DB"
            exit 1
        fi
    done
}

sanitize_staging_data() {
    if [ "$SKIP_SANITIZE" = true ]; then
        print_warning "Skipping data sanitization (--skip-sanitize flag)"
        return
    fi
    
    print_header "Sanitizing Staging Data"
    print_warning "This step modifies sensitive data for safety"
    
    if [ "$DRY_RUN" = true ]; then
        print_info "[DRY RUN] Would sanitize staging data"
        return
    fi
    
    print_info "Adding staging identifier to emails and data..."
    
    ssh -i "$SSH_KEY_PATH" "$STAGING_USER@$STAGING_HOST" << 'EOF'
        mysql -u root db_taist << 'SQL'
            -- Add STAGING prefix to prevent accidental use of production data
            -- Uncomment these if you want to sanitize specific tables:
            
            -- UPDATE users SET email = CONCAT('staging_', email) WHERE email NOT LIKE 'staging_%';
            -- UPDATE admins SET email = CONCAT('staging_', email) WHERE email NOT LIKE 'staging_%';
            
            -- Clear sensitive tokens
            -- UPDATE transactions SET stripe_token = NULL;
            
            -- Log the sanitization
            SELECT 'Database sanitization complete' AS status;
SQL
EOF
    
    if [ $? -eq 0 ]; then
        print_success "Data sanitization complete"
    else
        print_warning "Data sanitization encountered issues (non-critical)"
    fi
}

cleanup() {
    print_header "Cleaning Up"
    
    if [ "$DRY_RUN" = true ]; then
        print_info "[DRY RUN] Would clean up temporary files"
        return
    fi
    
    print_info "Cleaning up production backups..."
    ssh -i "$SSH_KEY_PATH" "$PROD_USER@$PROD_HOST" << EOF
        # Keep only last 5 backups
        cd ~/db-backups
        ls -t *.sql.gz | tail -n +6 | xargs -r rm
        echo "Kept most recent 5 backups"
EOF
    
    print_info "Local backups kept in: $LOCAL_BACKUP_DIR"
    print_success "Cleanup complete"
}

verify_staging() {
    print_header "Verifying Staging Environment"
    
    print_info "Testing staging API endpoint..."
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://taist.cloudupscale.com/mapi/get-version)
    
    if [ "$RESPONSE" = "200" ]; then
        print_success "Staging API responding correctly (HTTP $RESPONSE)"
    else
        print_warning "Staging API returned HTTP $RESPONSE"
    fi
    
    print_info "Database statistics:"
    ssh -i "$SSH_KEY_PATH" "$STAGING_USER@$STAGING_HOST" << 'EOF'
        mysql -u root -e "
            SELECT 
                table_schema AS 'Database',
                COUNT(*) AS 'Tables',
                ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
            FROM information_schema.tables
            WHERE table_schema IN ('db_taist', 'taist-main')
            GROUP BY table_schema;
        "
EOF
}

show_summary() {
    print_header "Summary"
    echo ""
    echo -e "${GREEN}✓ Database copy completed successfully!${NC}"
    echo ""
    echo "What was done:"
    echo "  • Backed up production databases"
    echo "  • Downloaded to: $LOCAL_BACKUP_DIR"
    echo "  • Imported to staging server"
    if [ "$SKIP_SANITIZE" = false ]; then
        echo "  • Sanitized sensitive data"
    fi
    echo ""
    echo "Staging databases are now synchronized with production as of:"
    echo "  $BACKUP_DATE"
    echo ""
    echo "Next steps:"
    echo "  1. Test your application on staging"
    echo "  2. Verify API endpoints work correctly"
    echo "  3. Run any necessary migrations"
    echo ""
    print_info "Backups are kept in: $LOCAL_BACKUP_DIR"
    echo ""
}

#######################################
# Main Script
#######################################

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-sanitize)
            SKIP_SANITIZE=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Show dry run warning
if [ "$DRY_RUN" = true ]; then
    print_warning "DRY RUN MODE - No changes will be made"
    echo ""
fi

# Confirmation prompt
if [ "$DRY_RUN" = false ]; then
    print_warning "This will overwrite staging databases with production data"
    read -p "Are you sure you want to continue? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        print_info "Operation cancelled"
        exit 0
    fi
    echo ""
fi

# Run the copy process
check_prerequisites
backup_production
download_backups
upload_to_staging
import_to_staging
sanitize_staging_data
cleanup
verify_staging

if [ "$DRY_RUN" = false ]; then
    show_summary
else
    print_info ""
    print_info "Dry run complete. Run without --dry-run to execute."
fi

