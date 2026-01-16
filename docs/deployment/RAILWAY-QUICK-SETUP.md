# Railway Quick Setup Guide - Taist Backend

**Goal:** Get your backend on Railway in the simplest way possible
**Time:** ~2-3 hours for staging, 1 hour for production
**Cost:** ~$30/month vs $55/month on AWS

---

## Prerequisites

- Railway account (free to create)
- GitHub access to your repository
- Access to your current AWS servers (to copy database and .env)

---

## Part 1: Railway Account Setup (10 minutes)

### Step 1: Create Railway Account

1. Go to https://railway.app/
2. Click "Start a New Project"
3. Sign up with GitHub (easiest)
4. Add payment method (required for deployments)

### Step 2: Install Railway CLI

```bash
npm install -g @railway/cli

# Login
railway login
```

---

## Part 2: Staging Environment (1-2 hours)

### Step 3: Create Project & Database

1. In Railway dashboard:
   - Click "New Project"
   - Name it: `taist-backend`

2. Create MySQL database:
   - Click "+ New"
   - Select "Database" → "MySQL"
   - Wait for provisioning (~2 minutes)
   - Note: Railway will auto-create environment variables

3. Create staging environment:
   - Click project settings (gear icon)
   - Go to "Environments"
   - Create new environment: `staging`

### Step 4: Deploy Backend to Staging

1. In Railway (staging environment):
   - Click "+ New" → "GitHub Repo"
   - Select `taist-mono` (or your repo name)
   - Set root directory: `backend`
   - Railway will auto-detect and deploy

2. Wait for first deployment (~5-10 minutes)

### Step 5: Configure Environment Variables

In Railway → staging environment → backend service → Variables:

**Quick setup - copy these variables from your AWS staging server:**

```bash
# SSH into AWS staging
ssh ubuntu@18.118.114.98

# View your current .env
cat /var/www/html/.env
```

**Then add these to Railway (replace with actual values from AWS):**

```bash
# Application
APP_NAME=Taist
APP_ENV=staging
APP_KEY=base64:... # Copy from AWS .env
APP_DEBUG=false
APP_URL=https://taist-backend-staging.up.railway.app

# Database (Railway auto-creates these, just reference them)
DB_CONNECTION=mysql
DB_HOST=${{MYSQL_HOST}}
DB_PORT=${{MYSQL_PORT}}
DB_DATABASE=${{MYSQL_DATABASE}}
DB_USERNAME=${{MYSQL_USER}}
DB_PASSWORD=${{MYSQL_PASSWORD}}

# Copy the rest from AWS .env:
STRIPE_KEY=...
STRIPE_SECRET=...
SENDGRID_API_KEY=...
TWILIO_SID=...
TWILIO_TOKEN=...
TWILIO_FROM=...
GOOGLE_MAPS_API_KEY=...
FIREBASE_CREDENTIALS=... # This might need special handling
```

### Step 6: Import Database

**On AWS staging server:**

```bash
# Create backup
mysqldump -u root -p db_taist > /tmp/staging_backup.sql
gzip /tmp/staging_backup.sql

# Download to your computer
# (Run this from your local machine)
scp ubuntu@18.118.114.98:/tmp/staging_backup.sql.gz ~/Downloads/
```

**Import to Railway:**

```bash
# Get Railway MySQL credentials
railway variables --environment staging | grep MYSQL

# Uncompress and import
gunzip ~/Downloads/staging_backup.sql.gz

# Import (replace with your Railway credentials)
mysql -h <RAILWAY_MYSQL_HOST> \
      -u <RAILWAY_MYSQL_USER> \
      -p<RAILWAY_MYSQL_PASSWORD> \
      -P <RAILWAY_MYSQL_PORT> \
      <RAILWAY_MYSQL_DATABASE> < ~/Downloads/staging_backup.sql
```

### Step 7: Run Migrations

```bash
# In Railway dashboard → backend service → click "Terminal" tab
# Or use CLI:
railway run --environment staging php artisan migrate --force
```

### Step 8: Test Staging

Get your Railway staging URL from dashboard (something like `taist-backend-staging.up.railway.app`)

```bash
# Test API
curl https://your-staging-url.up.railway.app/mapi/get-version

# Should return JSON with version info
```

### Step 9: Update DNS for Staging (Optional)

If you want to keep using `taist-mono-staging.up.railway.app`:

1. In Railway → backend service → Settings → Networking
2. Click "Add Domain"
3. Enter: `taist-mono-staging.up.railway.app`
4. Railway will give you CNAME instructions

5. Update DNS (wherever you manage DNS):
   - Type: CNAME
   - Name: `taist.cloudupscale` (or `@` if root domain)
   - Value: `taist-backend-staging.up.railway.app`
   - TTL: 300

---

## Part 3: Production Environment (1 hour)

**⚠️ Only do this after staging is fully tested!**

### Step 10: Create Production Environment

1. In Railway → Project settings → Environments
2. Create new environment: `production`

3. Repeat Step 3-9 above, but:
   - Use **production** environment
   - Use **production** AWS server (18.216.154.184)
   - Use domain `taist-mono-production.up.railway.app`
   - Use production .env values

### Step 11: Production Database Migration

**On AWS production server:**

```bash
# SSH into production
ssh ec2-user@18.216.154.184

# IMPORTANT: Put site in maintenance mode first
cd /var/www/html
php artisan down --message="Server upgrade. Back in 30 minutes!"

# Backup database
sudo mysqldump -u root -p db_taist > /tmp/prod_backup.sql
gzip /tmp/prod_backup.sql
```

**Download and import to Railway (same as staging):**

```bash
# Download
scp ec2-user@18.216.154.184:/tmp/prod_backup.sql.gz ~/Downloads/

# Import to Railway production database
gunzip ~/Downloads/prod_backup.sql.gz
mysql -h <RAILWAY_MYSQL_HOST> \
      -u <RAILWAY_MYSQL_USER> \
      -p<RAILWAY_MYSQL_PASSWORD> \
      -P <RAILWAY_MYSQL_PORT> \
      <RAILWAY_MYSQL_DATABASE> < ~/Downloads/prod_backup.sql
```

### Step 12: Deploy Production

Railway will auto-deploy when you push to main branch, or:

1. In Railway dashboard → production environment → backend service
2. Click "Deploy"
3. Wait for deployment

### Step 13: Update Production DNS

**This is the critical step - double check everything first!**

**If keeping same domain (`taist-mono-production.up.railway.app`):**

1. In Railway → production backend → Settings → Networking → Add Domain
2. Enter: `taist-mono-production.up.railway.app`
3. Follow Railway's DNS instructions

4. Update DNS:
   - Remove old A record pointing to AWS
   - Add CNAME to Railway
   - Or keep Cloudflare proxy if you prefer

**DNS propagation:** 5-30 minutes usually

### Step 14: Test Production

```bash
# Test API
curl https://taist-mono-production.up.railway.app/mapi/get-version

# Check Railway logs
railway logs --environment production

# Test with mobile app
# Open production app and test critical flows
```

### Step 15: Take AWS Out of Maintenance Mode

**Only after confirming Railway works!**

```bash
# On Railway (or SSH to AWS temporarily)
php artisan up
```

---

## Part 4: Set Up Scheduler Service (Required)

The backend has scheduled tasks that must run for critical functionality like auto-refunds for expired orders.

### Create Scheduler Service

**Step 1: Create Service**

1. In your Railway project, click **"+ New"**
2. Select **"Empty Service"**
3. Name it `scheduler`

**Step 2: Connect to Source Code**

1. Go to **Settings** → **Source**
2. Connect to your GitHub repo (same as taist-mono)
3. Set **Root Directory** to `/backend`

**Step 3: Configure Cron Schedule**

1. Go to **Settings**
2. Find **"Cron Schedule"** field
3. Enter: `*/5 * * * *` (every 5 minutes - Railway's minimum interval)

**Step 4: Set Start Command**

In Settings → Deploy → **Start Command**:
```bash
until php artisan tinker --execute="DB::connection()->getPdo();" 2>/dev/null; do echo "Waiting for database..."; sleep 5; done && php artisan schedule:run
```

**Step 5: Share Environment Variables**

In the scheduler service **Variables** tab, add references to your main backend service:
```
DATABASE_URL=${{taist-mono.DATABASE_URL}}
STRIPE_SECRET_KEY=${{taist-mono.STRIPE_SECRET_KEY}}
TWILIO_SID=${{taist-mono.TWILIO_SID}}
TWILIO_AUTH_TOKEN=${{taist-mono.TWILIO_AUTH_TOKEN}}
TWILIO_PHONE_NUMBER=${{taist-mono.TWILIO_PHONE_NUMBER}}
APP_KEY=${{taist-mono.APP_KEY}}
```

Or copy all variables from your main service if easier.

### Scheduled Tasks

The scheduler runs these commands (defined in `app/Console/Kernel.php`):

| Command | Schedule | Description |
|---------|----------|-------------|
| `orders:process-expired` | Every 30 min | Auto-refunds for orders not accepted within deadline |
| `orders:send-reminders` | Every 30 min | 24-hour SMS reminders for upcoming orders |
| `chef:send-confirmation-reminders` | Hourly | Reminds chefs to confirm availability |
| `chef:cleanup-old-overrides` | Daily 2am | Cleans up old availability records |

### Cost

The scheduler only runs when triggered (every 5 min), executes quickly, and exits. Expected cost: **$0-2/month** within Railway's hobby plan.

---

## Part 5: File Storage (Important!)

Railway has ephemeral storage - uploaded files are lost on redeploy!

### Recommended: Use Cloudflare R2 (or AWS S3)

**Cloudflare R2 (cheaper than S3):**

1. Create R2 bucket at cloudflare.com
2. Get credentials
3. In Railway, add env variables:
   ```bash
   FILESYSTEM_DISK=s3
   AWS_ACCESS_KEY_ID=<R2_ACCESS_KEY>
   AWS_SECRET_ACCESS_KEY=<R2_SECRET_KEY>
   AWS_DEFAULT_REGION=auto
   AWS_BUCKET=taist-uploads
   AWS_ENDPOINT=<R2_ENDPOINT>
   ```

4. Upload existing files from AWS to R2:
   ```bash
   # On AWS server
   cd /var/www/html/public/assets/uploads
   tar -czf /tmp/uploads.tar.gz .

   # Download and upload to R2
   # (Can use R2 dashboard or AWS CLI)
   ```

---

## Troubleshooting

### Issue: 502 Bad Gateway

**Check Railway logs:**
```bash
railway logs --environment staging
```

**Common fixes:**
- Ensure all environment variables are set
- Check PHP version compatibility
- Verify composer dependencies installed

### Issue: Database Connection Failed

**Verify:**
```bash
# Railway CLI
railway run --environment staging php artisan tinker

# In tinker:
>>> DB::connection()->getPdo();
```

### Issue: "Class not found" errors

**Run:**
```bash
railway run --environment staging composer install --optimize-autoloader
railway run --environment staging php artisan config:clear
railway run --environment staging php artisan cache:clear
```

---

## Cost Monitoring

Railway dashboard shows real-time usage:
- Dashboard → Project → Usage tab

**Expected costs:**
- Starter plan: $5/month
- Backend: ~$10-15/month
- Database: ~$5-10/month
- **Total: ~$20-30/month**

vs AWS: **$55/month** → **Save ~$25-35/month**

---

## Rollback Plan (If Things Go Wrong)

### Quick DNS Rollback

If Railway isn't working:

1. Revert DNS to point back to AWS
2. In DNS provider:
   - Remove CNAME to Railway
   - Add back A record to AWS IP

3. AWS servers should still be running as backup

4. DNS propagates in 5-15 minutes

---

## When to Decommission AWS

**Wait 2-4 weeks** after successful migration:

1. Confirm Railway is stable
2. Monitor costs
3. Ensure all functionality works
4. Get team sign-off

**Then terminate AWS:**
```bash
# AWS Console → EC2 → Instances
# Select instances → Actions → Instance State → Terminate
```

---

## Next Steps After Migration

1. ✅ Monitor Railway for 1 week
2. ✅ Set up alerts in Railway dashboard
3. ✅ Update all documentation with new URLs
4. ✅ Train team on Railway deployments
5. ✅ Optimize Railway resources (right-size)
6. ✅ Terminate AWS after 4 weeks

---

## Need Help?

- Railway docs: https://docs.railway.app/guides/laravel
- Railway Discord: https://discord.gg/railway
- Railway support: help@railway.app

---

**Remember:**
- Test thoroughly in staging first
- Keep AWS running as backup for 2-4 weeks
- Have rollback plan ready
- Schedule production migration during low-traffic time
- Monitor closely after migration

Good luck! 🚀
