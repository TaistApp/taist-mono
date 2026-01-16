# Railway Migration Guide - Taist Platform

**Sprint Task:** TMA-010 - Move from AWS to Railway  
**Created:** November 21, 2025  
**Status:** Planning Phase

---

## Table of Contents

- [Overview](#overview)
- [Why Railway?](#why-railway)
- [Current vs Target Architecture](#current-vs-target-architecture)
- [Cost Comparison](#cost-comparison)
- [Pre-Migration Checklist](#pre-migration-checklist)
- [Migration Strategy](#migration-strategy)
- [Step-by-Step Migration Plan](#step-by-step-migration-plan)
- [Database Migration](#database-migration)
- [Backend Deployment](#backend-deployment)
- [Frontend Updates](#frontend-updates)
- [DNS Changes](#dns-changes)
- [Testing & Validation](#testing--validation)
- [Rollback Plan](#rollback-plan)
- [Post-Migration Tasks](#post-migration-tasks)
- [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers the complete migration from AWS EC2 + Upscale managed infrastructure to Railway platform.

### Migration Scope

**What's Being Migrated:**
- ✅ Production Backend (taist-mono-production.up.railway.app)
- ✅ Staging Backend (taist-mono-staging.up.railway.app)
- ✅ MySQL Databases (both environments)
- ✅ File storage (uploads/images)
- ✅ Cron jobs (background checks)

**What Stays the Same:**
- Mobile app code (only API URLs change)
- Cloudflare CDN (recommended to keep)
- Domain names (same domains, new origins)

---

## Why Railway?

### Benefits

**Simplicity:**
- No server management (PaaS)
- Automatic SSL certificates
- Zero-downtime deployments
- Built-in monitoring

**Cost:**
- Predictable pricing
- Pay only for resources used
- No idle server costs
- Likely cheaper than AWS EC2

**Developer Experience:**
- Deploy from GitHub directly
- Easy rollbacks
- Environment variables management
- Staging & production separation

**Performance:**
- Global edge network
- Automatic scaling
- Fast deployments

### Potential Concerns

**Migration Effort:**
- One-time setup effort
- DNS propagation delay
- Database migration downtime

**Learning Curve:**
- New platform to learn
- Different deployment process

**Vendor Lock-in:**
- Moving to different platform structure
- But easier to migrate out than AWS

---

## Current vs Target Architecture

### Current Architecture (AWS + Upscale)

```
┌─────────────────────────────────────┐
│         Mobile App Users            │
└──────────────┬──────────────────────┘
               │
    ┌──────────┴─────────┐
    │                    │
    ▼                    ▼
STAGING               PRODUCTION
taist.cloudupscale    taist.codeupscale
    │                    │
    │                    ▼
    │              Cloudflare CDN
    ▼                    ▼
┌─────────────┐    ┌─────────────┐
│   AWS EC2   │    │   AWS EC2   │
│ t2.medium   │    │  t2.small   │
│ $33.87/mo   │    │ $16.79/mo   │
├─────────────┤    ├─────────────┤
│ Apache      │    │ Apache      │
│ PHP 7.2     │    │ PHP 7.2     │
│ Laravel     │    │ Laravel     │
│ MySQL       │    │ MySQL       │
└─────────────┘    └─────────────┘

Total: ~$50/month + management overhead
```

### Target Architecture (Railway)

```
┌─────────────────────────────────────┐
│         Mobile App Users            │
└──────────────┬──────────────────────┘
               │
    ┌──────────┴─────────┐
    │                    │
    ▼                    ▼
STAGING               PRODUCTION
taist.cloudupscale    taist.codeupscale
    │                    │
    │                    ▼
    │              Cloudflare CDN (optional)
    ▼                    ▼
┌──────────────────────────────────┐
│         Railway Platform         │
│                                  │
│  ┌─────────────┐  ┌────────────┐│
│  │  Staging    │  │Production  ││
│  │  Backend    │  │  Backend   ││
│  │  (PHP)      │  │  (PHP)     ││
│  └─────────────┘  └────────────┘│
│                                  │
│  ┌─────────────────────────────┐│
│  │     MySQL Database          ││
│  │  (Staging + Production)     ││
│  └─────────────────────────────┘│
└──────────────────────────────────┘

Estimated: $20-30/month
Auto-scaling, zero downtime, easier management
```

---

## Cost Comparison

### Current AWS Costs

| Item | Cost/Month | Annual |
|------|-----------|--------|
| Taist 2 (Production) - t2.small | $16.79 | $201.48 |
| taist-staging-n - t2.medium | $33.87 | $406.44 |
| Data transfer (estimate) | $5.00 | $60.00 |
| Elastic IPs | $0.00 | $0.00 |
| **Total AWS** | **$55.66** | **$667.92** |

**Plus:**
- Server maintenance time
- Security updates
- Upscale management fees (?)

### Railway Estimated Costs

Railway pricing: $5/month base + usage

| Item | Cost/Month | Annual |
|------|-----------|--------|
| Starter plan | $5.00 | $60.00 |
| Backend resources (est.) | $15.00 | $180.00 |
| Database (MySQL) | $10.00 | $120.00 |
| **Total Railway** | **$30.00** | **$360.00** |

### Savings

- **Monthly Savings:** ~$25.66
- **Annual Savings:** ~$307.92
- **Plus:** No server management, automatic scaling, better DevOps

---

## Pre-Migration Checklist

### 1. Railway Setup

- [ ] Create Railway account
- [ ] Set up payment method
- [ ] Create project: "taist-platform"
- [ ] Enable GitHub integration

### 2. Access & Permissions

- [ ] Admin access to Railway
- [ ] GitHub push access to repository
- [ ] Cloudflare API access (for DNS)
- [ ] AWS console access (for data export)

### 3. Code Preparation

- [ ] Ensure `backend/` is Railway-compatible
- [ ] Create `Procfile` or `railway.toml`
- [ ] Update `.env.example` with Railway variables
- [ ] Test local backend build

### 4. Data Backup

- [ ] **CRITICAL:** Full MySQL database backup
- [ ] Backup uploaded files/images
- [ ] Document current `.env` configurations
- [ ] Export cron job configurations

### 5. Communication

- [ ] Notify team of migration timeline
- [ ] Schedule maintenance window
- [ ] Prepare rollback communication

---

## Migration Strategy

### Recommended Approach: Parallel Migration

**Phase 1:** Set up Railway (Staging first)  
**Phase 2:** Migrate staging completely  
**Phase 3:** Test thoroughly on staging  
**Phase 4:** Migrate production with minimal downtime  
**Phase 5:** Monitor and optimize  
**Phase 6:** Decommission AWS  

### Timeline Estimate

| Phase | Duration | When |
|-------|----------|------|
| Planning & Setup | 2-3 days | Before migration |
| Staging Migration | 1 day | Week 1 |
| Staging Testing | 3-5 days | Week 1-2 |
| Production Migration | 4-6 hours | Weekend |
| Monitoring | 7 days | Week 2-3 |
| AWS Decommission | 1 day | Week 4 |
| **Total** | **2-3 weeks** | |

### Downtime Expectations

- **Staging:** 1-2 hours (acceptable)
- **Production:** Target <30 minutes
- **Database migration:** 10-20 minutes
- **DNS propagation:** 5-60 minutes

---

## Step-by-Step Migration Plan

### Phase 1: Railway Setup & Staging Migration

#### Step 1.1: Create Railway Project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init
# Project name: taist-backend
# Link to GitHub: yes → bgroble14/taist-mono
```

#### Step 1.2: Create Environments

In Railway dashboard:
1. Go to project settings
2. Create environments:
   - `staging`
   - `production`

#### Step 1.3: Set Up MySQL Database (Staging)

In Railway dashboard (staging environment):
1. Click "+ New"
2. Select "Database" → "MySQL"
3. Wait for provisioning
4. Note connection details:
   - `MYSQL_URL`
   - `MYSQL_HOST`
   - `MYSQL_PORT`
   - `MYSQL_DATABASE`
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`

#### Step 1.4: Configure Backend Service (Staging)

1. In Railway, click "+ New" → "GitHub Repo"
2. Select `taist-mono` repository
3. Configure service:
   - **Root directory:** `backend/`
   - **Build command:** `composer install --no-dev`
   - **Start command:** See below

**For Laravel on Railway, create `backend/Procfile`:**

```
web: vendor/bin/heroku-php-apache2 public/
```

Or create `backend/railway.toml`:

```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "php artisan serve --host=0.0.0.0 --port=$PORT"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10
```

#### Step 1.5: Configure Environment Variables (Staging)

In Railway dashboard → staging environment → backend service → Variables:

```bash
# Application
APP_NAME=Taist
APP_ENV=staging
APP_KEY=base64:... # Generate with: php artisan key:generate --show
APP_DEBUG=false
APP_URL=https://taist-staging-backend.up.railway.app

# Database (from Railway MySQL service)
DB_CONNECTION=mysql
DB_HOST=${MYSQL_HOST}
DB_PORT=${MYSQL_PORT}
DB_DATABASE=${MYSQL_DATABASE}
DB_USERNAME=${MYSQL_USER}
DB_PASSWORD=${MYSQL_PASSWORD}

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

# File Storage
FILESYSTEM_DISK=public
```

**Copy from current AWS instance:**

```bash
# SSH into current staging server
ssh ec2-user@18.118.114.98

# View current .env (on AWS)
cd /var/www/html
cat .env
```

#### Step 1.6: Deploy Backend (Staging)

Railway will auto-deploy on push, or trigger manually:

```bash
# From local machine
railway up
```

Or in Railway dashboard: Click "Deploy"

Wait for deployment to complete (~5-10 minutes first time).

#### Step 1.7: Run Database Migrations (Staging)

In Railway dashboard → backend service → "Terminal":

```bash
# Run migrations
php artisan migrate --force

# Or use Railway CLI
railway run php artisan migrate --force
```

---

### Phase 2: Database Migration (Staging)

#### Step 2.1: Backup Current Database

```bash
# SSH into AWS staging server
ssh ec2-user@18.118.114.98

# Create backup
sudo mysqldump -u root -p db_taist > /tmp/staging_backup_$(date +%Y%m%d).sql

# Compress
gzip /tmp/staging_backup_*.sql

# Download to local
exit
scp ec2-user@18.118.114.98:/tmp/staging_backup_*.sql.gz ~/Downloads/
```

#### Step 2.2: Import to Railway MySQL

**Option A: Via Railway CLI:**

```bash
# Uncompress
gunzip ~/Downloads/staging_backup_*.sql.gz

# Get Railway MySQL credentials
railway variables

# Import
mysql -h <MYSQL_HOST> \
      -u <MYSQL_USER> \
      -p<MYSQL_PASSWORD> \
      -P <MYSQL_PORT> \
      <MYSQL_DATABASE> < ~/Downloads/staging_backup_*.sql
```

**Option B: Via Railway Dashboard:**

1. Railway → MySQL service → "Data"
2. Use phpMyAdmin or similar
3. Import SQL file

#### Step 2.3: Migrate Uploaded Files

```bash
# On AWS server
cd /var/www/html/public/assets/uploads
tar -czf /tmp/uploads_staging.tar.gz .

# Download
scp ec2-user@18.118.114.98:/tmp/uploads_staging.tar.gz ~/Downloads/

# Upload to Railway volume (if using persistent storage)
# Or use cloud storage (S3/Cloudflare R2)
```

**Recommendation:** Use Cloudflare R2 or AWS S3 for file storage instead of Railway volumes.

---

### Phase 3: Update DNS (Staging)

#### Step 3.1: Get Railway URL

From Railway dashboard:
- Click staging backend service
- Go to "Settings" → "Networking"
- Note the Railway domain: `taist-backend-staging.up.railway.app`
- Or add custom domain

#### Step 3.2: Update DNS

**Option A: Direct to Railway (Simple)**

In your DNS provider (Cloudflare, Route 53, etc.):

Change `taist-mono-staging.up.railway.app`:
```
Type: CNAME
Name: taist.cloudupscale
Value: taist-backend-staging.up.railway.app
TTL: 300 (5 minutes)
```

**Option B: Keep Cloudflare Proxy (Recommended)**

1. In Cloudflare, update origin:
   - Go to DNS settings
   - Update A/CNAME record to point to Railway
   - Keep orange cloud (proxied)

2. Or update via Cloudflare API

#### Step 3.3: Add Custom Domain in Railway

1. Railway → Service → Settings → Networking
2. Click "Add Domain"
3. Enter: `taist-mono-staging.up.railway.app`
4. Follow verification steps

---

### Phase 4: Update Frontend (Staging URLs)

#### Step 4.1: Update API URLs

Edit `frontend/app/services/api.ts`:

```typescript
const getEnvironmentUrls = () => {
  if (APP_ENV === 'staging' || APP_ENV === 'development') {
    // NEW Railway staging
    return {
      BASE_URL: 'https://taist-mono-staging.up.railway.app/mapi/',
      // OR if using Railway domain directly:
      // BASE_URL: 'https://taist-backend-staging.up.railway.app/mapi/',
      Photo_URL: 'https://taist-mono-staging.up.railway.app/assets/uploads/images/',
      HTML_URL: 'https://taist-mono-staging.up.railway.app/assets/uploads/html/',
    };
  } else {
    // Production (unchanged for now)
    return {
      BASE_URL: 'https://taist-mono-production.up.railway.app/mapi/',
      Photo_URL: 'https://taist-mono-production.up.railway.app/assets/uploads/images/',
      HTML_URL: 'https://taist-mono-production.up.railway.app/assets/uploads/html/',
    };
  }
};
```

**Note:** Since domains stay the same, frontend code may not need changes!

#### Step 4.2: Build and Test

```bash
cd frontend

# Build staging app
npx eas-cli build --platform ios --profile preview
```

#### Step 4.3: Test Staging App

1. Install on test device via TestFlight
2. Test all critical flows:
   - Login
   - Chef search
   - Order placement
   - Image uploads
   - Push notifications

---

### Phase 5: Test Staging Thoroughly

#### Test Checklist

**Authentication:**
- [ ] User registration
- [ ] User login
- [ ] Password reset
- [ ] Token refresh

**Chef Functions:**
- [ ] Menu management
- [ ] Availability updates
- [ ] Order acceptance
- [ ] Stripe Connect

**Customer Functions:**
- [ ] Search chefs
- [ ] View menus
- [ ] Place orders
- [ ] Payment processing

**Common:**
- [ ] Image uploads
- [ ] Messages/conversations
- [ ] Push notifications
- [ ] Background check cron

**Performance:**
- [ ] Page load times
- [ ] API response times
- [ ] Image loading

**Monitoring:**
- [ ] Check Railway logs
- [ ] Check error rates
- [ ] Monitor database performance

#### Staging Sign-off

Before proceeding to production:
- [ ] All tests passing
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] Team approval

---

### Phase 6: Production Migration

**⚠️ CRITICAL: Schedule maintenance window (weekend recommended)**

#### Step 6.1: Pre-Migration Prep

**1 Week Before:**
- [ ] Announce maintenance window to users
- [ ] Complete staging testing
- [ ] Prepare rollback plan
- [ ] Brief entire team

**1 Day Before:**
- [ ] Final database backup
- [ ] Document all AWS configurations
- [ ] Verify Railway production environment ready
- [ ] Test rollback procedure

**Day Of (Start Early):**
- [ ] Team on standby
- [ ] Communication channels ready
- [ ] Monitoring tools prepared

#### Step 6.2: Set Up Production Environment

Repeat Phase 1 steps for **production** environment:

1. Railway → Switch to `production` environment
2. Create MySQL database
3. Configure backend service
4. Set environment variables (production values)
5. Do NOT deploy yet

#### Step 6.3: Production Database Migration

**Maintenance Mode ON:**

```bash
# SSH into AWS production (Taist 2)
ssh ec2-user@18.216.154.184

# Enable maintenance mode
cd /var/www/html
php artisan down --message="Upgrading servers. Back soon!" --retry=60

# Create database backup
sudo mysqldump -u root -p db_taist > /tmp/prod_backup_$(date +%Y%m%d_%H%M%S).sql
gzip /tmp/prod_backup_*.sql
```

**Download and Import:**

```bash
# Download from AWS
scp ec2-user@18.216.154.184:/tmp/prod_backup_*.sql.gz ~/Downloads/

# Uncompress
gunzip ~/Downloads/prod_backup_*.sql.gz

# Import to Railway MySQL (get credentials from Railway)
mysql -h <RAILWAY_MYSQL_HOST> \
      -u <RAILWAY_MYSQL_USER> \
      -p<RAILWAY_MYSQL_PASSWORD> \
      -P <RAILWAY_MYSQL_PORT> \
      <RAILWAY_MYSQL_DATABASE> < ~/Downloads/prod_backup_*.sql
```

**Estimated time:** 10-20 minutes depending on database size

#### Step 6.4: Migrate Uploaded Files

```bash
# On AWS production
cd /var/www/html/public/assets/uploads
tar -czf /tmp/uploads_prod.tar.gz .

# Download
scp ec2-user@18.216.154.184:/tmp/uploads_prod.tar.gz ~/Downloads/

# Upload to cloud storage (S3/R2) or Railway
```

#### Step 6.5: Deploy Production Backend

In Railway dashboard:
1. Switch to `production` environment
2. Backend service → "Deploy"
3. Wait for deployment (~5-10 minutes)
4. Verify: Check Railway logs for successful start

#### Step 6.6: Run Migrations

```bash
# In Railway production environment
railway run --environment production php artisan migrate --force
```

#### Step 6.7: Update DNS (Production)

**Critical Step - Triple Check Everything First!**

**In Cloudflare (or your DNS provider):**

Update `taist-mono-production.up.railway.app`:

```
# OLD (AWS):
Type: A
Name: taist.codeupscale
Value: (Cloudflare proxy to 18.216.154.184)

# NEW (Railway):
Type: CNAME
Name: taist.codeupscale
Value: taist-backend-production.up.railway.app
Proxied: Yes (orange cloud)
TTL: Auto/300
```

**Or add custom domain in Railway first:**
1. Railway → Production service → Settings → Networking
2. Add domain: `taist-mono-production.up.railway.app`
3. Update DNS as instructed by Railway

**DNS Propagation:** 5-60 minutes (usually <10 minutes)

#### Step 6.8: Verify Production

**Immediately after DNS change:**

```bash
# Test DNS propagation
nslookup taist-mono-production.up.railway.app
dig taist-mono-production.up.railway.app

# Test API
curl -I https://taist-mono-production.up.railway.app/mapi/get-version

# Expected: HTTP 200 OK
```

**Check Railway logs:**
- Look for incoming requests
- No errors in logs

**Test mobile app:**
- Production build
- Login
- Critical functions

#### Step 6.9: Monitor Closely

**First Hour:**
- [ ] Check every 5 minutes
- [ ] Monitor Railway logs
- [ ] Check error rates
- [ ] Test user flows
- [ ] Watch for user reports

**First 24 Hours:**
- [ ] Check hourly
- [ ] Monitor performance
- [ ] Database queries performance
- [ ] Response times

#### Step 6.10: Maintenance Mode OFF

**Only after confirming everything works:**

```bash
# In Railway production terminal
php artisan up
```

Or if you need to access old server:

```bash
# SSH to AWS (just in case)
ssh ec2-user@18.216.154.184
cd /var/www/html
php artisan up
```

---

## Rollback Plan

### If Things Go Wrong

**Symptoms requiring rollback:**
- API returning 500 errors
- Database connection issues
- Missing uploaded files
- Critical functionality broken

### Rollback Procedure

#### Quick Rollback (DNS Revert)

**Fastest method (5-10 minutes):**

1. **Revert DNS immediately:**
   ```
   In Cloudflare/DNS:
   Change taist-mono-production.up.railway.app back to old AWS IP
   ```

2. **Turn off Railway maintenance mode (if enabled):**
   ```bash
   # On AWS server
   ssh ec2-user@18.216.154.184
   php artisan up
   ```

3. **Monitor:**
   - Check if traffic returns to AWS
   - Verify API responds correctly

4. **Communicate:**
   - Notify team
   - Update users

#### Database Rollback

**If database issues:**

1. **Restore from backup:**
   ```bash
   # On AWS server
   sudo mysql -u root -p db_taist < /tmp/prod_backup_*.sql
   ```

2. **Verify data integrity**

3. **Note:** Any data created during migration window will be lost

### Post-Rollback

- [ ] Document what went wrong
- [ ] Fix issues
- [ ] Re-test in staging
- [ ] Schedule new migration attempt

---

## Post-Migration Tasks

### Immediate (First Week)

- [ ] **Monitor intensively:**
  - Railway logs
  - Error rates
  - Performance metrics
  - User feedback

- [ ] **Verify all functionality:**
  - Background cron jobs
  - Email notifications
  - SMS notifications
  - Payment processing
  - File uploads

- [ ] **Performance tuning:**
  - Database query optimization
  - Caching configuration
  - Resource allocation

### Short Term (2-4 Weeks)

- [ ] **Keep AWS running (parallel):**
  - As backup
  - In case rollback needed
  - Monitor costs

- [ ] **Optimize Railway:**
  - Right-size resources
  - Configure auto-scaling
  - Set up monitoring alerts

- [ ] **Documentation:**
  - Update all docs with new URLs
  - Update team wiki/knowledge base
  - Document Railway deployment process

### After Confirmation (4+ Weeks)

- [ ] **Decommission AWS:**
  - Final backup
  - Stop instances
  - Release Elastic IPs
  - Terminate instances
  - Cancel any services

- [ ] **Update DNS TTL:**
  - Increase TTL from 300s to 3600s
  - More stable now

- [ ] **Archive backups:**
  - Store final AWS backups safely
  - Document for compliance

---

## Railway-Specific Configuration

### backend/Procfile

Create this file in `backend/` directory:

```
web: vendor/bin/heroku-php-apache2 public/
```

Or for Laravel Octane (faster):

```
web: php artisan octane:start --host=0.0.0.0 --port=$PORT
```

### backend/railway.toml

Alternative configuration:

```toml
[build]
builder = "nixpacks"

[build.nixpacksSettings]
php = "7.2"

[deploy]
startCommand = "php artisan serve --host=0.0.0.0 --port=$PORT"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10
healthcheckPath = "/mapi/get-version"
healthcheckTimeout = 30
```

### Cron Jobs on Railway

Railway doesn't have built-in cron. Options:

**Option 1: Laravel Scheduler (Recommended)**

In Railway → Add new service → "Cron":

```yaml
# railway-cron.yaml
build:
  builder: nixpacks
  
deploy:
  startCommand: |
    while true; do
      php artisan schedule:run
      sleep 60
    done
```

**Option 2: External Cron Service**

Use service like:
- EasyCron.com
- Cron-job.org
- GitHub Actions

Configure to hit: `https://taist-mono-production.up.railway.app/mapi/background_check_order_status`

### File Storage

**Recommendation:** Use cloud storage instead of Railway volumes

**Option A: AWS S3**
```bash
composer require league/flysystem-aws-s3-v3
```

**Option B: Cloudflare R2**
```bash
composer require league/flysystem-aws-s3-v3
# R2 is S3-compatible
```

Configure in `.env`:
```bash
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_DEFAULT_REGION=auto
AWS_BUCKET=taist-uploads
AWS_ENDPOINT=https://account-id.r2.cloudflarestorage.com
```

---

## Testing & Validation

### Pre-Migration Tests

Run these tests on staging before production migration:

```bash
# API endpoints
curl https://taist-mono-staging.up.railway.app/mapi/get-version
curl https://taist-mono-staging.up.railway.app/mapi/get_search_chefs/947

# Database connection
railway run --environment staging php artisan tinker
>>> DB::connection()->getPdo();

# File uploads (via app)
# Try uploading chef profile photo

# Cron job
railway run --environment staging php artisan schedule:run
```

### Post-Migration Validation

```bash
# Production health check
curl https://taist-mono-production.up.railway.app/mapi/get-version

# Check logs
railway logs --environment production

# Monitor metrics
# Railway dashboard → Production → Metrics
```

### Load Testing (Optional but Recommended)

```bash
# Install Apache Bench
brew install apache-bench

# Load test
ab -n 1000 -c 10 https://taist-mono-production.up.railway.app/mapi/get-version
```

---

## Cost Monitoring

### Railway Billing

Monitor costs in Railway dashboard:
- Dashboard → Project → Usage
- Set budget alerts
- Review monthly usage

### Expected Usage

- **Starter Plan:** $5/month base
- **Backend Resources:** ~$10-15/month
- **Database:** ~$5-10/month
- **Total:** ~$20-30/month

Compare to AWS: $55.66/month → **~$25-35 savings per month**

---

## Troubleshooting

### Common Issues

#### Issue: 502 Bad Gateway

**Cause:** Backend not starting correctly

**Solution:**
```bash
# Check Railway logs
railway logs

# Common fixes:
# - Check PHP version compatibility
# - Verify all env variables set
# - Check composer dependencies installed
```

#### Issue: Database Connection Failed

**Cause:** Wrong credentials or network issue

**Solution:**
```bash
# Verify Railway MySQL service running
# Check environment variables match
# Test connection:
railway run php artisan tinker
>>> DB::connection()->getPdo();
```

#### Issue: Missing Files/Images

**Cause:** Files not migrated

**Solution:**
- Re-upload files to cloud storage
- Update FILESYSTEM_DISK in .env
- Verify S3/R2 credentials

#### Issue: Slow Performance

**Cause:** Under-resourced

**Solution:**
```bash
# In Railway dashboard:
# Service → Settings → Resources
# Increase memory/CPU allocation
```

#### Issue: Cron Jobs Not Running

**Cause:** No cron service set up

**Solution:**
- Set up Laravel scheduler service (see above)
- Or use external cron service

---

## Security Considerations

### SSL/TLS

- Railway provides automatic SSL
- Cloudflare provides additional SSL layer
- Ensure force HTTPS in Laravel:

```php
// In AppServiceProvider.php
if ($this->app->environment('production')) {
    URL::forceScheme('https');
}
```

### Environment Variables

- Never commit `.env` file
- Use Railway's environment variable system
- Rotate all secrets after migration

### Database Security

- Use Railway's private networking
- Don't expose database publicly
- Regular backups

### API Keys

After migration, consider rotating:
- Stripe keys
- Firebase credentials
- SendGrid keys
- Twilio credentials

---

## Support Resources

### Railway Documentation

- Main docs: https://docs.railway.app/
- Laravel guide: https://docs.railway.app/guides/laravel
- MySQL guide: https://docs.railway.app/databases/mysql
- CLI reference: https://docs.railway.app/develop/cli

### Community Support

- Railway Discord: https://discord.gg/railway
- Railway Community: https://help.railway.app/

### Team Communication

Create Slack/Discord channel: `#railway-migration`

---

## Migration Checklist Summary

### Pre-Migration
- [ ] Railway account created
- [ ] GitHub integration set up
- [ ] Database backups taken
- [ ] Files backed up
- [ ] Team notified

### Staging Migration
- [ ] Railway staging environment created
- [ ] Database migrated
- [ ] Files migrated
- [ ] DNS updated
- [ ] Frontend tested
- [ ] All tests passing

### Production Migration
- [ ] Maintenance window scheduled
- [ ] Production environment created
- [ ] Maintenance mode enabled
- [ ] Database migrated
- [ ] Files migrated
- [ ] Backend deployed
- [ ] DNS updated
- [ ] Verified working
- [ ] Maintenance mode disabled
- [ ] Monitoring active

### Post-Migration
- [ ] AWS running as backup (4 weeks)
- [ ] Performance optimized
- [ ] Documentation updated
- [ ] AWS decommissioned
- [ ] Backups archived

---

## Timeline & Milestones

| Milestone | Target Date | Status |
|-----------|------------|--------|
| Planning Complete | Week 1, Day 1 | 📝 |
| Railway Setup | Week 1, Day 2-3 | ⏳ |
| Staging Migration | Week 1, Day 4-5 | ⏳ |
| Staging Testing | Week 2, Day 1-5 | ⏳ |
| Production Migration | Week 3, Weekend | ⏳ |
| Monitoring Period | Week 3-4 | ⏳ |
| AWS Decommission | Week 5 | ⏳ |

---

## Success Criteria

Migration considered successful when:

- ✅ All API endpoints responding correctly
- ✅ Database queries performing well
- ✅ Mobile app fully functional
- ✅ No increase in error rates
- ✅ Performance equal or better than AWS
- ✅ Cost savings realized
- ✅ Team comfortable with Railway platform
- ✅ Zero critical incidents for 2 weeks

---

## Contact & Escalation

**Migration Lead:** [Your Name]  
**Technical Lead:** [Name]  
**Stakeholders:** [Names]

**Emergency Contacts:**
- On-call: [Phone]
- Slack: #railway-migration
- Email: [Email]

---

*Document Version: 1.0*  
*Last Updated: November 21, 2025*  
*Next Review: Start of migration*

---

## Appendix: Quick Commands

```bash
# Railway CLI
railway login
railway link
railway up
railway run <command>
railway logs
railway variables

# Database backup (AWS)
mysqldump -u root -p db_taist > backup.sql

# Database restore (Railway)
mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE < backup.sql

# Laravel commands
php artisan migrate --force
php artisan down
php artisan up
php artisan cache:clear
php artisan config:cache
php artisan queue:work

# DNS test
nslookup taist-mono-production.up.railway.app
dig taist-mono-production.up.railway.app
curl -I https://taist-mono-production.up.railway.app/mapi/get-version
```


