# Taist Backend

Laravel-based RESTful API backend for the Taist food marketplace platform. Connects local chefs with customers through a robust API, payment processing, and real-time notifications.

## Overview

The Taist backend provides:
- RESTful API for mobile applications (iOS & Android)
- Admin panel for platform management
- Payment processing via Stripe
- Real-time notifications via Firebase
- Chef payout management with Stripe Connect
- Geolocation-based chef discovery
- Order management and tracking
- Messaging system between users

## Technology Stack

### Core Framework
- **Laravel 8.x** - PHP web application framework
- **PHP 8.2+** - Programming language

### Database
- **MySQL/MariaDB** - Primary database
- **Redis** - Caching and session storage (optional)

### Authentication & Security
- **Laravel Passport** - OAuth2 API authentication
- **JWT Tokens** - Stateless authentication
- **Bcrypt** - Password hashing

### External Services
- **Stripe** - Payment processing and Connect for payouts
- **Firebase Cloud Messaging** - Push notifications
- **Twilio** - SMS notifications
- **SendGrid** - Email delivery
- **Google Maps API** - Geocoding and distance calculations

### Development Tools
- **Composer** - Dependency management
- **PHPUnit** - Testing framework
- **Laravel Tinker** - Interactive REPL
- **Laravel Mix** - Asset compilation

## Project Structure

```
backend/
├── app/                    # Application core
│   ├── Console/            # Artisan commands
│   ├── Exceptions/         # Exception handling
│   ├── Helpers/            # Helper functions
│   ├── Http/               # Controllers, middleware, requests
│   ├── Models/             # Eloquent models
│   ├── Providers/          # Service providers
│   └── README.md           # App directory documentation
├── bootstrap/              # Framework bootstrap
├── config/                 # Configuration files
├── database/               # Migrations, seeds, factories
│   ├── migrations/         # Database schema migrations
│   ├── seeds/              # Database seeders
│   └── README.md           # Database documentation
├── public/                 # Public web root
│   ├── api/                # Legacy API endpoints
│   └── index.php           # Entry point
├── resources/              # Views, assets, lang files
│   ├── views/              # Blade templates (admin panel)
│   ├── js/                 # JavaScript assets
│   └── sass/               # Styles
├── routes/                 # Route definitions
│   ├── api.php             # Mobile API routes
│   ├── mapi.php            # Mobile-specific routes
│   ├── admin.php           # Admin routes
│   ├── adminapi.php        # Admin API routes
│   ├── web.php             # Web routes
│   ├── channels.php        # Broadcasting channels
│   └── README.md           # Routes documentation
├── storage/                # Logs, cache, uploads
│   ├── app/                # Application storage
│   ├── framework/          # Framework cache
│   └── logs/               # Application logs
├── tests/                  # Automated tests
│   ├── Feature/            # Feature tests
│   └── Unit/               # Unit tests
├── .env                    # Environment configuration
├── artisan                 # Artisan CLI
├── composer.json           # PHP dependencies
└── README.md               # This file
```

## Installation

### Prerequisites

Ensure you have the following installed:
- PHP >= 8.2
- Composer
- MySQL or MariaDB
- Redis (optional, for caching)
- Node.js & npm (for asset compilation)

### Setup Steps

1. **Clone the repository** (if not already in monorepo):
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   composer install
   ```

3. **Environment configuration**:
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

4. **Configure database** (edit `.env`):
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=taist
   DB_USERNAME=root
   DB_PASSWORD=your_password
   ```

5. **Configure external services** (edit `.env`):
   ```env
   # Stripe
   STRIPE_KEY=your_stripe_key
   STRIPE_SECRET=your_stripe_secret
   
   # Firebase
   FIREBASE_CREDENTIALS=firebase_credentials.json
   
   # SendGrid
   SENDGRID_API_KEY=your_sendgrid_key
   
   # Twilio
   TWILIO_SID=your_twilio_sid
   TWILIO_TOKEN=your_twilio_token
   TWILIO_FROM=your_twilio_phone
   
   # Google Maps
   GOOGLE_MAPS_API_KEY=your_google_maps_key
   ```

6. **Run migrations**:
   ```bash
   php artisan migrate
   ```

7. **Seed database** (optional, for development):
   ```bash
   php artisan db:seed
   ```

8. **Install Passport** (API authentication):
   ```bash
   php artisan passport:install
   ```

9. **Generate storage symlink**:
   ```bash
   php artisan storage:link
   ```

10. **Compile assets** (if using admin panel):
    ```bash
    npm install
    npm run dev
    ```

## Running the Application

### Development Server

```bash
# Start Laravel development server
php artisan serve
```

The API will be available at `http://localhost:8000`

### Production Deployment

For production, configure your web server (Apache/Nginx) to point to the `public/` directory.

**Nginx Configuration Example:**
```nginx
server {
    listen 80;
    server_name api.taist.app;
    root /path/to/taist-mono/backend/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php7.4-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

## API Documentation

### Base URL
- Development: `http://localhost:8000/api`
- Production: `https://api.taist.app/api`

### Authentication

Most endpoints require authentication. Include the bearer token in the Authorization header:

```
Authorization: Bearer {your_access_token}
```

### Key Endpoints

#### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/password/email` - Request password reset
- `POST /api/password/reset` - Reset password

#### Customer Endpoints
- `GET /api/chefs` - Browse available chefs
- `GET /api/chefs/{id}` - Chef profile and menu
- `POST /api/orders` - Place new order
- `GET /api/orders` - Order history
- `POST /api/reviews` - Submit review

#### Chef Endpoints
- `POST /api/chef/menu` - Add menu item
- `PUT /api/chef/menu/{id}` - Update menu item
- `GET /api/chef/orders` - Chef's orders
- `PUT /api/chef/orders/{id}/status` - Update order status
- `POST /api/chef/availability` - Set availability
- `GET /api/chef/earnings` - Earnings summary

#### Common Endpoints
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update profile
- `GET /api/notifications` - Get notifications
- `GET /api/conversations` - Message inbox

See [routes/README.md](./routes/README.md) for complete API documentation.

## Database

### Schema Overview

**Main Tables:**
- `users` - Customers, chefs, and admins
- `menus` - Chef menu items
- `orders` - Customer orders
- `order_items` - Items within orders
- `transactions` - Payment records
- `reviews` - Customer reviews
- `conversations` & `messages` - Chat system
- `notifications` - Push notifications
- `availabilities` - Chef schedules

See [database/README.md](./database/README.md) for detailed schema documentation.

### Migrations

```bash
# Run pending migrations
php artisan migrate

# Rollback last migration
php artisan migrate:rollback

# Reset database
php artisan migrate:fresh

# Reset and seed
php artisan migrate:fresh --seed
```

## Artisan Commands

### Common Commands

```bash
# Application
php artisan serve              # Start development server
php artisan tinker             # Interactive REPL
php artisan route:list         # List all routes
php artisan config:cache       # Cache configuration
php artisan cache:clear        # Clear application cache

# Database
php artisan migrate            # Run migrations
php artisan db:seed            # Run seeders

# Queue
php artisan queue:work         # Process queue jobs
php artisan queue:listen       # Listen for queue jobs

# Scheduled Tasks
php artisan schedule:run       # Run scheduled tasks
```

### Custom Commands

```bash
# Order management
php artisan orders:cancel-pending     # Cancel abandoned orders

# Earnings
php artisan earnings:calculate        # Calculate daily earnings

# Notifications
php artisan notifications:send-reminders  # Send order reminders
```

## Background Jobs & Queues

The application uses Laravel queues for time-intensive tasks:

### Queue Configuration

Configure queue driver in `.env`:
```env
QUEUE_CONNECTION=redis  # or database, sync
```

### Jobs

- **SendNotification** - Send push notifications
- **SendEmail** - Send email notifications
- **ProcessPayment** - Process payment transactions
- **CalculateEarnings** - Calculate chef earnings
- **GenerateReport** - Generate analytics reports

### Running Queue Worker

```bash
# Process queue jobs
php artisan queue:work

# Process specific queue
php artisan queue:work --queue=high,default

# Restart workers after code changes
php artisan queue:restart
```

### Supervisor Configuration (Production)

```ini
[program:taist-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /path/to/artisan queue:work --sleep=3 --tries=3
autostart=true
autorestart=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/path/to/worker.log
```

## Scheduled Tasks

Tasks are scheduled in `app/Console/Kernel.php`:

```php
protected function schedule(Schedule $schedule)
{
    $schedule->command('orders:cancel-pending')->everyFifteenMinutes();
    $schedule->command('earnings:calculate')->daily();
    $schedule->command('notifications:send-reminders')->hourly();
}
```

### Running Scheduler

Add to crontab:
```cron
* * * * * cd /path/to/backend && php artisan schedule:run >> /dev/null 2>&1
```

## Testing

### Running Tests

```bash
# Run all tests
php artisan test
# or
./vendor/bin/phpunit

# Run specific test file
php artisan test tests/Feature/OrderTest.php

# Run with coverage
./vendor/bin/phpunit --coverage-html coverage
```

### Test Structure

- **Unit Tests** (`tests/Unit/`) - Test individual classes and methods
- **Feature Tests** (`tests/Feature/`) - Test complete features and API endpoints

### Writing Tests

```php
public function testCustomerCanPlaceOrder()
{
    $customer = factory(User::class)->create(['user_type' => 'customer']);
    
    $response = $this->actingAs($customer, 'api')
        ->postJson('/api/orders', [
            'chef_id' => 1,
            'items' => [/* ... */]
        ]);
    
    $response->assertStatus(201)
        ->assertJsonStructure(['success', 'data']);
}
```

## Logging

### Log Files

Logs are stored in `storage/logs/`:
- `laravel.log` - Application logs
- `laravel-{date}.log` - Daily logs

### Logging in Code

```php
use Illuminate\Support\Facades\Log;

Log::info('Order created', ['order_id' => $order->id]);
Log::warning('Low stock alert', ['item' => $item]);
Log::error('Payment failed', ['error' => $e->getMessage()]);
```

### Log Levels
- `emergency` - System unusable
- `alert` - Immediate action required
- `critical` - Critical conditions
- `error` - Error conditions
- `warning` - Warning conditions
- `notice` - Normal but significant
- `info` - Informational messages
- `debug` - Debug-level messages

## Security

### Best Practices Implemented

- **Authentication**: Passport OAuth2 tokens
- **Password Hashing**: Bcrypt with proper salt
- **SQL Injection Prevention**: Eloquent ORM with prepared statements
- **CSRF Protection**: Token validation on state-changing requests
- **XSS Prevention**: Output escaping in Blade templates
- **Rate Limiting**: Throttle middleware on API routes
- **Input Validation**: Comprehensive validation rules
- **HTTPS**: Enforced in production
- **Environment Variables**: Sensitive data in .env

### Security Checklist

- [ ] Update all dependencies regularly
- [ ] Use strong database passwords
- [ ] Enable HTTPS in production
- [ ] Restrict database access to localhost
- [ ] Set appropriate file permissions (755/644)
- [ ] Disable debug mode in production
- [ ] Implement proper CORS policies
- [ ] Regular security audits
- [ ] Monitor error logs

## Performance Optimization

### Caching

```bash
# Cache routes (production)
php artisan route:cache

# Cache config (production)
php artisan config:cache

# Cache views
php artisan view:cache

# Clear all caches
php artisan cache:clear
php artisan route:clear
php artisan config:clear
php artisan view:clear
```

### Database Optimization

- Proper indexing on frequently queried columns
- Eager loading to prevent N+1 queries
- Query result caching with Redis
- Database connection pooling

### Application Optimization

- Use queues for time-intensive tasks
- Optimize autoloader: `composer dump-autoload -o`
- Enable OPcache in PHP
- Use CDN for static assets
- Implement API response caching

## Troubleshooting

### Common Issues

**500 Internal Server Error:**
- Check `storage/logs/laravel.log`
- Verify file permissions (775 for storage and bootstrap/cache)
- Clear caches: `php artisan cache:clear`

**Database Connection Error:**
- Verify database credentials in `.env`
- Ensure MySQL is running
- Check database exists: `CREATE DATABASE taist;`

**Passport Token Issues:**
- Reinstall Passport: `php artisan passport:install`
- Clear config cache: `php artisan config:clear`

**Queue Jobs Not Processing:**
- Ensure queue worker is running: `php artisan queue:work`
- Check queue configuration in `.env`
- Verify Redis is running (if using Redis queue)

## Deployment

### Pre-Deployment Checklist

- [ ] Update `.env` with production values
- [ ] Set `APP_ENV=production`
- [ ] Set `APP_DEBUG=false`
- [ ] Run migrations: `php artisan migrate --force`
- [ ] Cache config: `php artisan config:cache`
- [ ] Cache routes: `php artisan route:cache`
- [ ] Optimize autoloader: `composer dump-autoload -o`
- [ ] Set proper file permissions
- [ ] Configure SSL certificate
- [ ] Set up supervisor for queue workers
- [ ] Configure cron for scheduler
- [ ] Enable log rotation

### Zero-Downtime Deployment

1. Pull latest code to a new directory
2. Install dependencies
3. Run migrations
4. Swap symbolic links
5. Reload PHP-FPM
6. Restart queue workers

## Documentation

- [App Directory](./app/README.md) - Application structure and architecture
- [Models](./app/Models/README.md) - Database models
- [Controllers](./app/Http/Controllers/README.md) - API controllers
- [Database](./database/README.md) - Database schema and migrations
- [Routes](./routes/README.md) - API endpoints and routing

## Contributing

1. Follow PSR-2 coding standards
2. Write tests for new features
3. Document all public methods
4. Update relevant README files
5. Follow Laravel best practices

## License

MIT

## Support

For issues and questions:
- Check documentation in relevant README files
- Review error logs in `storage/logs/`
- Contact development team
