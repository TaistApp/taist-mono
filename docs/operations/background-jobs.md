# Background Jobs & Scheduled Tasks

Documentation of console commands, scheduled tasks, and background processing.

---

## Table of Contents

1. [Overview](#overview)
2. [Console Commands](#console-commands)
3. [Scheduled Tasks](#scheduled-tasks)
4. [Running Commands](#running-commands)
5. [Monitoring](#monitoring)

---

## Overview

Background jobs handle tasks that shouldn't block user requests:
- Expired order processing
- Chef confirmation reminders
- Data cleanup
- Maintenance tasks

**Directory:** `backend/app/Console/Commands/`

---

## Console Commands

### ProcessExpiredOrders

**File:** `backend/app/Console/Commands/ProcessExpiredOrders.php`

Automatically cancels orders that exceed the 30-minute chef acceptance deadline.

```bash
php artisan orders:process-expired
```

**What it does:**
1. Finds orders with status=1 (Requested) past deadline
2. Issues full Stripe refund
3. Updates order status to Cancelled
4. Sends push notification to customer

```php
protected $signature = 'orders:process-expired';
protected $description = 'Process orders that have exceeded the 30-minute chef acceptance deadline';

public function handle()
{
    $expiredOrders = Orders::where('status', 1)
        ->whereNotNull('acceptance_deadline')
        ->where('acceptance_deadline', '<', (string)time())
        ->get();

    foreach ($expiredOrders as $order) {
        $this->processExpiredOrder($order);
    }
}
```

---

### SendConfirmationReminders

**File:** `backend/app/Console/Commands/SendConfirmationReminders.php`

Sends 24-hour advance reminders to chefs to confirm availability.

```bash
php artisan reminders:send-confirmations
```

**What it does:**
1. Finds chefs with availability tomorrow
2. Checks if reminder already sent
3. Sends push notification + SMS
4. Records reminder sent timestamp

```php
protected $signature = 'reminders:send-confirmations';
protected $description = 'Send 24-hour confirmation reminders to chefs';

public function handle()
{
    $tomorrow = Carbon::tomorrow()->format('Y-m-d');
    $dayName = strtolower(Carbon::tomorrow()->format('l'));

    // Find chefs available tomorrow
    $chefs = Listener::where('user_type', 2)
        ->where('is_pending', 0)
        ->whereHas('availability', function($q) use ($dayName) {
            $q->whereNotNull($dayName . '_start');
        })
        ->get();

    foreach ($chefs as $chef) {
        $this->sendReminder($chef, $tomorrow);
    }
}
```

---

### SendOrderReminders

**File:** `backend/app/Console/Commands/SendOrderReminders.php`

Sends reminders for upcoming orders.

```bash
php artisan reminders:send-orders
```

---

### CleanupOldOverrides

**File:** `backend/app/Console/Commands/CleanupOldOverrides.php`

Removes expired availability overrides.

```bash
php artisan cleanup:old-overrides
```

**What it does:**
- Deletes overrides older than 30 days
- Keeps database clean

```php
public function handle()
{
    $cutoff = Carbon::now()->subDays(30);

    $deleted = AvailabilityOverride::where('override_date', '<', $cutoff)->delete();

    $this->info("Deleted {$deleted} old overrides");
}
```

---

### CreateAdminUser

**File:** `backend/app/Console/Commands/CreateAdminUser.php`

Creates a new admin user.

```bash
php artisan admin:create
```

**Interactive prompts:**
- Name
- Email
- Password

```php
public function handle()
{
    $name = $this->ask('Admin name?');
    $email = $this->ask('Admin email?');
    $password = $this->secret('Password?');

    Admins::create([
        'name' => $name,
        'email' => $email,
        'password' => bcrypt($password),
    ]);

    $this->info('Admin created successfully');
}
```

---

### BackfillChefCoordinates

**File:** `backend/app/Console/Commands/BackfillChefCoordinates.php`

Backfills missing latitude/longitude for chef addresses.

```bash
php artisan chefs:backfill-coordinates
```

---

### CleanupNullCoordinates

**File:** `backend/app/Console/Commands/CleanupNullCoordinates.php`

Handles records with null coordinates.

```bash
php artisan cleanup:null-coordinates
```

---

### SyncVersion

**File:** `backend/app/Console/Commands/SyncVersion.php`

Syncs app version information.

```bash
php artisan version:sync
```

---

### FixRailwayMigrations

**File:** `backend/app/Console/Commands/FixRailwayMigrations.php`

Database migration utilities for Railway deployment.

```bash
php artisan railway:fix-migrations
```

---

## Scheduled Tasks

### Kernel Configuration

**File:** `backend/app/Console/Kernel.php`

```php
protected function schedule(Schedule $schedule)
{
    // Process expired orders every 5 minutes
    $schedule->command('orders:process-expired')
        ->everyFiveMinutes()
        ->withoutOverlapping()
        ->runInBackground();

    // Send confirmation reminders hourly (between 8am-8pm)
    $schedule->command('reminders:send-confirmations')
        ->hourly()
        ->between('8:00', '20:00')
        ->withoutOverlapping();

    // Cleanup old overrides daily at 3am
    $schedule->command('cleanup:old-overrides')
        ->dailyAt('03:00');

    // Send order reminders every 15 minutes
    $schedule->command('reminders:send-orders')
        ->everyFifteenMinutes()
        ->withoutOverlapping();
}
```

### Schedule Frequency Options

| Method | Frequency |
|--------|-----------|
| `everyMinute()` | Every minute |
| `everyFiveMinutes()` | Every 5 minutes |
| `everyFifteenMinutes()` | Every 15 minutes |
| `everyThirtyMinutes()` | Every 30 minutes |
| `hourly()` | Every hour |
| `daily()` | Midnight |
| `dailyAt('13:00')` | Specific time |
| `weekly()` | Sunday at midnight |
| `monthly()` | First of month |

---

## Running Commands

### Manual Execution

```bash
# Run a command manually
php artisan orders:process-expired

# With verbose output
php artisan orders:process-expired -v

# List all commands
php artisan list
```

### Scheduler Daemon

**Development:**
```bash
# Run scheduler once
php artisan schedule:run

# Run scheduler continuously (for dev)
php artisan schedule:work
```

**Production (cron):**
```bash
# Add to crontab
* * * * * cd /path-to-project && php artisan schedule:run >> /dev/null 2>&1
```

### Railway Deployment

Railway uses a worker process for scheduled tasks:

```json
// railway.json or Procfile
{
  "worker": "php artisan schedule:work"
}
```

---

## Monitoring

### Logging

Commands log to Laravel's log files:

```php
Log::info('ProcessExpiredOrders: Found ' . count($orders) . ' expired orders');
Log::error('ProcessExpiredOrders: Failed to process order', ['order_id' => $id]);
```

**Log location:** `backend/storage/logs/laravel.log`

### Command Output

Use `$this->info()` and `$this->error()` for console output:

```php
$this->info('Processing 5 orders...');
$this->error('Failed to refund order #123');
$this->warn('No orders found');
$this->line('Done.');
```

### Preventing Overlap

Use `withoutOverlapping()` to prevent concurrent execution:

```php
$schedule->command('orders:process-expired')
    ->everyFiveMinutes()
    ->withoutOverlapping();
```

### Notifications on Failure

```php
$schedule->command('orders:process-expired')
    ->everyFiveMinutes()
    ->onFailure(function () {
        // Send alert to admin
        Log::error('ProcessExpiredOrders failed');
    });
```

---

## Creating New Commands

### Generate Command

```bash
php artisan make:command MyNewCommand
```

### Command Structure

```php
namespace App\Console\Commands;

use Illuminate\Console\Command;

class MyNewCommand extends Command
{
    protected $signature = 'mycommand:run {--force}';
    protected $description = 'Description of what this command does';

    public function handle()
    {
        if ($this->option('force')) {
            $this->info('Running with --force');
        }

        // Command logic here

        return 0; // Success
    }
}
```

### Register Command

Commands in `app/Console/Commands/` are auto-registered.

For custom registration:

```php
// In Kernel.php
protected $commands = [
    Commands\MyNewCommand::class,
];
```
