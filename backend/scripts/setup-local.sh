#!/bin/bash

# ==============================================================================
# Taist Backend - Local Development Setup Script
# ==============================================================================
# This script automates the setup of the Taist backend for local development
# ==============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo ""
    echo -e "${BLUE}============================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}============================================================${NC}"
    echo ""
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

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# ==============================================================================
# PRE-FLIGHT CHECKS
# ==============================================================================

print_header "Taist Backend Local Setup"

print_info "Checking prerequisites..."

# Check PHP
if ! command_exists php; then
    print_error "PHP is not installed. Please install PHP 7.2.5 or higher."
    exit 1
fi

PHP_VERSION=$(php -r 'echo PHP_VERSION;')
print_success "PHP $PHP_VERSION found"

# Check Composer
if ! command_exists composer; then
    print_error "Composer is not installed. Please install from https://getcomposer.org/"
    exit 1
fi
print_success "Composer found"

# Check MySQL
if ! command_exists mysql; then
    print_warning "MySQL command not found. Make sure MySQL is installed and running."
else
    print_success "MySQL found"
fi

# ==============================================================================
# NAVIGATE TO BACKEND DIRECTORY
# ==============================================================================

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
cd "$BACKEND_DIR"

print_info "Working directory: $BACKEND_DIR"

# ==============================================================================
# COMPOSER DEPENDENCIES
# ==============================================================================

print_header "Installing Composer Dependencies"

if [ -d "vendor" ]; then
    print_warning "vendor/ directory exists. Updating dependencies..."
    composer update
else
    composer install
fi

print_success "Dependencies installed"

# ==============================================================================
# ENVIRONMENT CONFIGURATION
# ==============================================================================

print_header "Environment Configuration"

if [ -f ".env" ]; then
    print_warning ".env file already exists. Skipping creation."
    print_info "To reconfigure, delete .env and run this script again."
else
    print_info "Creating .env file from template..."
    
    # Create .env file
    cat > .env << 'EOF'
APP_NAME=Taist
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8005

LOG_CHANNEL=stack

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=taist_local
DB_USERNAME=root
DB_PASSWORD=

BROADCAST_DRIVER=log
CACHE_DRIVER=file
QUEUE_CONNECTION=sync
SESSION_DRIVER=file
SESSION_LIFETIME=120

MAIL_MAILER=log
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS=hello@taist.local
MAIL_FROM_NAME="${APP_NAME}"

STRIPE_KEY=
STRIPE_SECRET=
TWILIO_SID=
TWILIO_TOKEN=
TWILIO_FROM=
GOOGLE_MAPS_API_KEY=
FIREBASE_CREDENTIALS=firebase_credentials.json
EOF

    print_success ".env file created"
    
    # Generate application key
    print_info "Generating application key..."
    php artisan key:generate
    print_success "Application key generated"
fi

# ==============================================================================
# DATABASE SETUP
# ==============================================================================

print_header "Database Configuration"

print_info "Please configure your database settings:"
echo ""

read -p "MySQL Host [127.0.0.1]: " DB_HOST
DB_HOST=${DB_HOST:-127.0.0.1}

read -p "MySQL Port [3306]: " DB_PORT
DB_PORT=${DB_PORT:-3306}

read -p "Database Name [taist_local]: " DB_DATABASE
DB_DATABASE=${DB_DATABASE:-taist_local}

read -p "MySQL Username [root]: " DB_USERNAME
DB_USERNAME=${DB_USERNAME:-root}

read -sp "MySQL Password (leave blank if none): " DB_PASSWORD
echo ""

# Update .env with database credentials
sed -i.bak "s/DB_HOST=.*/DB_HOST=$DB_HOST/" .env
sed -i.bak "s/DB_PORT=.*/DB_PORT=$DB_PORT/" .env
sed -i.bak "s/DB_DATABASE=.*/DB_DATABASE=$DB_DATABASE/" .env
sed -i.bak "s/DB_USERNAME=.*/DB_USERNAME=$DB_USERNAME/" .env
sed -i.bak "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env
rm .env.bak 2>/dev/null || true

print_success "Database credentials configured"

# Test database connection
print_info "Testing database connection..."

if php artisan db:show >/dev/null 2>&1; then
    print_success "Database connection successful"
else
    print_warning "Could not connect to database. Please verify your credentials."
    print_info "You can manually edit .env and run: php artisan migrate"
fi

# ==============================================================================
# DATABASE MIGRATIONS
# ==============================================================================

print_header "Database Migrations"

read -p "Run database migrations now? (y/n) [y]: " RUN_MIGRATIONS
RUN_MIGRATIONS=${RUN_MIGRATIONS:-y}

if [[ $RUN_MIGRATIONS =~ ^[Yy]$ ]]; then
    php artisan migrate --force
    print_success "Database migrations completed"
    
    read -p "Seed database with test data? (y/n) [n]: " RUN_SEEDER
    RUN_SEEDER=${RUN_SEEDER:-n}
    
    if [[ $RUN_SEEDER =~ ^[Yy]$ ]]; then
        php artisan db:seed
        print_success "Database seeded with test data"
    fi
else
    print_info "Skipping migrations. Run manually with: php artisan migrate"
fi

# ==============================================================================
# LARAVEL PASSPORT
# ==============================================================================

print_header "Laravel Passport (API Authentication)"

if [ ! -f "storage/oauth-private.key" ]; then
    print_info "Installing Laravel Passport..."
    php artisan passport:install
    print_success "Passport installed"
else
    print_warning "Passport keys already exist. Skipping installation."
fi

# ==============================================================================
# STORAGE SYMLINK
# ==============================================================================

print_header "Storage Configuration"

if [ ! -L "public/storage" ]; then
    php artisan storage:link
    print_success "Storage symlink created"
else
    print_warning "Storage symlink already exists"
fi

# ==============================================================================
# PERMISSIONS
# ==============================================================================

print_header "Setting Permissions"

chmod -R 775 storage bootstrap/cache
print_success "Permissions set for storage and cache directories"

# ==============================================================================
# SETUP COMPLETE
# ==============================================================================

print_header "Setup Complete! 🎉"

echo ""
print_success "Backend is ready for local development!"
echo ""
print_info "Next steps:"
echo "  1. Start the backend server:"
echo "     ${GREEN}php artisan serve --host=127.0.0.1 --port=8005${NC}"
echo ""
echo "  2. Backend will be available at:"
echo "     ${GREEN}http://localhost:8005${NC}"
echo ""
echo "  3. Test the API:"
echo "     ${GREEN}curl http://localhost:8005/api/get-version${NC}"
echo ""
print_info "Optional Configuration:"
echo "  • Edit .env to add Stripe, Twilio, Google Maps API keys"
echo "  • View logs: tail -f storage/logs/laravel.log"
echo "  • Access database: mysql -u $DB_USERNAME -p $DB_DATABASE"
echo ""
print_info "Frontend Setup:"
echo "  • Run: ${GREEN}cd ../frontend && npm run dev:local${NC}"
echo ""
print_warning "Remember: Keep the backend server running while developing!"
echo ""
