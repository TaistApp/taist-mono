# TMA-016: Laravel Scheduler Setup for Automatic Refund Processing

## Overview
The automatic refund feature requires Laravel's scheduler to be running. This document explains how to set it up.

## Understanding Laravel Scheduler

Laravel's scheduler allows you to define scheduled tasks in code. The `ProcessExpiredOrders` command is scheduled to run every 5 minutes, but Laravel needs a single cron entry that runs every minute to check which tasks should execute.

## Setup Instructions

### Option 1: Standard Cron Job (Recommended for Production)

**1. Open crontab for editing:**
```bash
crontab -e
```

**2. Add this line:**
```cron
* * * * * cd /Users/williamgroble/taist-mono/backend && php artisan schedule:run >> /dev/null 2>&1
```

**For production servers, use full paths:**
```cron
* * * * * cd /var/www/taist-mono/backend && /usr/bin/php artisan schedule:run >> /dev/null 2>&1
```

**3. Save and exit**
- In vim: Press `ESC`, then type `:wq` and press `ENTER`
- In nano: Press `CTRL+X`, then `Y`, then `ENTER`

**4. Verify cron is set up:**
```bash
crontab -l
```

You should see your newly added line.

**5. Test it's working:**
```bash
# Wait 1 minute, then check logs
tail -f /Users/williamgroble/taist-mono/backend/storage/logs/laravel.log
```

You should see scheduler running every minute.

---

### Option 2: Supervisor Process Manager (Alternative)

If you prefer not to use cron, you can use Supervisor to keep the scheduler running continuously.

**1. Install Supervisor:**
```bash
# macOS
brew install supervisor

# Ubuntu/Debian
sudo apt-get install supervisor

# CentOS/RHEL
sudo yum install supervisor
```

**2. Create Supervisor config:**
```bash
sudo nano /etc/supervisor/conf.d/taist-scheduler.conf
```

**3. Add this configuration:**
```ini
[program:taist-scheduler]
process_name=%(program_name)s
command=/usr/bin/php /Users/williamgroble/taist-mono/backend/artisan schedule:work
autostart=true
autorestart=true
user=yourUsername
redirect_stderr=true
stdout_logfile=/Users/williamgroble/taist-mono/backend/storage/logs/scheduler.log
stopwaitsecs=3600
```

**For production, adjust paths:**
```ini
[program:taist-scheduler]
process_name=%(program_name)s
command=/usr/bin/php /var/www/taist-mono/backend/artisan schedule:work
autostart=true
autorestart=true
user=www-data
redirect_stderr=true
stdout_logfile=/var/www/taist-mono/backend/storage/logs/scheduler.log
stopwaitsecs=3600
```

**4. Update Supervisor and start:**
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start taist-scheduler
```

**5. Check status:**
```bash
sudo supervisorctl status taist-scheduler
```

---

### Option 3: Development/Local Testing

For local development, you can run the scheduler manually:

**Run once (for testing):**
```bash
cd /Users/williamgroble/taist-mono/backend
php artisan schedule:run
```

**Run continuously (simulates cron):**
```bash
cd /Users/williamgroble/taist-mono/backend
php artisan schedule:work
```

This will run the scheduler every minute. Keep this terminal open while developing.

---

## Verification

### Check Scheduled Tasks
```bash
cd /Users/williamgroble/taist-mono/backend
php artisan schedule:list
```

**Expected output:**
```
0 0/5 * * * *  php artisan orders:process-expired .... Next Due: X minutes from now
```

### Manual Test
```bash
# Run the scheduler manually
php artisan schedule:run

# Or run the command directly
php artisan orders:process-expired
```

### Check Logs
```bash
# Watch Laravel logs
tail -f /Users/williamgroble/taist-mono/backend/storage/logs/laravel.log

# Watch cron logs (macOS)
tail -f /var/log/system.log | grep cron

# Watch cron logs (Linux)
tail -f /var/log/cron
```

---

## Production Server Setup

### AWS EC2 / VPS

**1. SSH into server:**
```bash
ssh user@your-server-ip
```

**2. Set up cron as www-data user (web server user):**
```bash
sudo crontab -e -u www-data
```

**3. Add:**
```cron
* * * * * cd /var/www/taist-mono/backend && /usr/bin/php artisan schedule:run >> /dev/null 2>&1
```

**4. Restart cron service:**
```bash
# Ubuntu/Debian
sudo service cron restart

# CentOS/RHEL
sudo service crond restart
```

---

### Laravel Forge

Laravel Forge automatically sets up the scheduler. Just ensure:

1. Go to your site in Forge
2. Click "Scheduler" tab
3. Verify the schedule:run command is listed
4. Verify it's enabled

---

### Laravel Vapor

Vapor automatically handles scheduled tasks. No additional setup needed.

---

### Railway (Recommended Setup)

Railway supports scheduled tasks through its built-in cron feature. This is the most cost-effective approach.

**Step 1: Create a Scheduler Service**

1. In your Railway project, click **"+ New"**
2. Select **"Empty Service"**
3. Name it `scheduler`

**Step 2: Connect to Source Code**

1. Go to **Settings** → **Source**
2. Connect to your GitHub repo (same as backend)
3. Set **Root Directory** to `/backend`

**Step 3: Configure Cron Schedule**

1. Go to **Settings**
2. Find **"Cron Schedule"** field
3. Enter: `*/5 * * * *` (every 5 minutes - Railway minimum)

**Step 4: Set Start Command**

In Settings → Deploy → **Start Command**:
```bash
until php artisan tinker --execute="DB::connection()->getPdo();" 2>/dev/null; do echo "Waiting for database..."; sleep 5; done && php artisan schedule:run
```

Note: Use `schedule:run` (not `schedule:work`) for cron - it runs once and exits.

**Step 5: Share Environment Variables**

In the scheduler service **Variables** tab, reference your main backend service variables:
```
DATABASE_URL=${{taist-mono.DATABASE_URL}}
STRIPE_SECRET_KEY=${{taist-mono.STRIPE_SECRET_KEY}}
TWILIO_SID=${{taist-mono.TWILIO_SID}}
TWILIO_AUTH_TOKEN=${{taist-mono.TWILIO_AUTH_TOKEN}}
TWILIO_PHONE_NUMBER=${{taist-mono.TWILIO_PHONE_NUMBER}}
APP_KEY=${{taist-mono.APP_KEY}}
```

Or copy all variables from your main service.

**How It Works:**
- Railway wakes the scheduler service every 5 minutes
- Runs `php artisan schedule:run`
- Laravel checks which scheduled commands are due (based on Kernel.php)
- Commands run if due, then service exits
- Cost-effective: service only runs when triggered

**Current Scheduled Commands** (defined in `app/Console/Kernel.php`):
- `orders:process-expired` - Every 30 minutes - Auto-refunds for expired orders
- `orders:send-reminders` - Every 30 minutes - 24-hour order reminders
- `chef:send-confirmation-reminders` - Hourly - Chef availability confirmations
- `chef:cleanup-old-overrides` - Daily at 2am - Database cleanup

---

### Heroku

**1. Install Heroku Scheduler addon:**
```bash
heroku addons:create scheduler:standard
```

**2. Configure task:**
```bash
heroku addons:open scheduler
```

**3. Add new job:**
- Command: `php artisan schedule:run`
- Frequency: Every 10 minutes (closest to 5-minute intervals)

---

## Monitoring & Troubleshooting

### Is the Scheduler Running?

**Check recent scheduler activity:**
```bash
# Should show "schedule:run" entries every minute
grep "schedule:run" /Users/williamgroble/taist-mono/backend/storage/logs/laravel.log | tail -20
```

**Check when ProcessExpiredOrders last ran:**
```bash
grep "ProcessExpiredOrders" /Users/williamgroble/taist-mono/backend/storage/logs/laravel.log | tail -5
```

### Common Issues

**Issue: Cron job not running**

Check cron service is running:
```bash
# macOS
sudo launchctl list | grep cron

# Linux
sudo service cron status
```

Check cron has permission to access your directory:
```bash
ls -la /Users/williamgroble/taist-mono/backend
```

**Issue: "artisan: command not found"**

Use full PHP path:
```bash
which php
# Use output in cron, e.g., /usr/local/bin/php
```

**Issue: Scheduler runs but command doesn't execute**

Check command is registered:
```bash
php artisan schedule:list
```

Check for errors:
```bash
# Run with output to see errors
cd /Users/williamgroble/taist-mono/backend && php artisan schedule:run
```

---

## Log Rotation

Since the scheduler runs continuously, set up log rotation to prevent large log files:

**Create log rotation config:**
```bash
sudo nano /etc/logrotate.d/taist
```

**Add:**
```
/Users/williamgroble/taist-mono/backend/storage/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
```

---

## Alerting (Optional)

### Email on Failure

Modify cron to send email on error:
```cron
* * * * * cd /Users/williamgroble/taist-mono/backend && php artisan schedule:run 2>&1 | grep -i error && echo "Scheduler error detected" | mail -s "Taist Scheduler Error" admin@taist.com
```

### Slack/Discord Notifications

In Laravel, configure failed job notifications:

**config/logging.php:**
```php
'channels' => [
    'slack' => [
        'driver' => 'slack',
        'url' => env('LOG_SLACK_WEBHOOK_URL'),
        'username' => 'Taist Scheduler',
        'emoji' => ':boom:',
        'level' => 'error',
    ],
],
```

---

## Performance Optimization

### Adjust Scheduler Frequency

If you want to process expired orders more/less frequently:

**Edit: backend/app/Console/Kernel.php**
```php
// Current: Every 5 minutes
$schedule->command('orders:process-expired')
         ->everyFiveMinutes()

// More frequent: Every 1 minute
$schedule->command('orders:process-expired')
         ->everyMinute()

// Less frequent: Every 10 minutes
$schedule->command('orders:process-expired')
         ->everyTenMinutes()
```

**Trade-offs:**
- More frequent = Lower delay in refund processing, higher server load
- Less frequent = Higher delay (up to 10 min), lower server load

**Recommendation**: Keep at 5 minutes for good balance.

---

## Security Considerations

### File Permissions

Ensure proper permissions:
```bash
# Laravel logs directory
chmod 775 /Users/williamgroble/taist-mono/backend/storage/logs
chown -R www-data:www-data /Users/williamgroble/taist-mono/backend/storage

# Scheduler should run as web server user
sudo crontab -e -u www-data
```

### Environment Variables

Ensure cron has access to environment variables:

**Option 1: Source .env in cron**
```cron
* * * * * cd /var/www/taist-mono/backend && /usr/bin/php artisan schedule:run --env=production >> /dev/null 2>&1
```

**Option 2: Load .env in command**
```bash
php artisan schedule:run
# Laravel automatically loads .env
```

---

## Deployment Checklist

Before deploying to production:

- [ ] Set up cron job or Supervisor
- [ ] Test scheduler runs: `php artisan schedule:list`
- [ ] Test command manually: `php artisan orders:process-expired`
- [ ] Verify proper file permissions
- [ ] Set up log rotation
- [ ] Configure monitoring/alerting
- [ ] Document scheduler in deployment runbook
- [ ] Test failover/recovery procedures

---

## Need Help?

- Check Laravel docs: https://laravel.com/docs/scheduling
- View scheduler status: `php artisan schedule:list`
- Test scheduler: `php artisan schedule:run`
- View logs: `tail -f storage/logs/laravel.log`
- Check cron: `crontab -l`
