# Database Copy Guide: Production → Staging

**Last Updated:** November 21, 2025  
**Purpose:** Copy production databases to staging for safe testing

---

## Overview

This guide will help you create a complete copy of your production databases on the staging server without affecting production.

### Databases to Copy

1. **`db_taist`** - Laravel application database
2. **`taist-main`** - Legacy PHP application database

### Servers

- **Production**: "Taist 2" at `18.216.154.184` (us-east-2a)
- **Staging**: "taist-staging-n..." at `18.118.114.98` (us-east-2b)

---

## Prerequisites

✅ Ensure you have:
- SSH access to both production and staging servers
- MySQL root access or appropriate database privileges
- Sufficient disk space on staging server

---

## Option 1: Direct Database Copy (Recommended)

This method creates dumps from production and imports them to staging.

### Step 1: SSH into Production Server

```bash
# SSH into production server
ssh -i ~/.ssh/your-aws-key.pem ec2-user@18.216.154.184
```

### Step 2: Create Database Backups on Production

```bash
# Create a backup directory
mkdir -p ~/db-backups
cd ~/db-backups

# Get current date for backup naming
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)

# Backup Laravel database (db_taist)
mysqldump -u root -p db_taist > db_taist_${BACKUP_DATE}.sql

# Backup Legacy database (taist-main)
mysqldump -u root -p taist-main > taist-main_${BACKUP_DATE}.sql

# Compress the backups
gzip db_taist_${BACKUP_DATE}.sql
gzip taist-main_${BACKUP_DATE}.sql

# Verify backups were created
ls -lh *.sql.gz
```

**Note:** When prompted, enter the MySQL root password.

### Step 3: Transfer Backups to Staging

From your **local machine**:

```bash
# Create a temporary directory
mkdir -p ~/taist-db-backups

# Download from production
scp -i ~/.ssh/your-aws-key.pem ec2-user@18.216.154.184:~/db-backups/*.sql.gz ~/taist-db-backups/

# Upload to staging
scp -i ~/.ssh/your-aws-key.pem ~/taist-db-backups/*.sql.gz ubuntu@18.118.114.98:~/
```

**Alternative:** Transfer directly between servers (if security groups allow):

```bash
# From production server, transfer to staging
scp ~/db-backups/*.sql.gz ubuntu@18.118.114.98:~/
```

### Step 4: Import to Staging Server

SSH into staging server:

```bash
# SSH into staging
ssh -i ~/.ssh/your-aws-key.pem ubuntu@18.118.114.98

# Uncompress the backups
cd ~/
gunzip *.sql.gz

# Import Laravel database
mysql -u root -p db_taist < db_taist_*.sql

# Import Legacy database
mysql -u root -p taist-main < taist-main_*.sql

# Verify import
mysql -u root -p -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='db_taist';"
mysql -u root -p -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='taist-main';"
```

### Step 5: Clean Up Sensitive Data (Optional but Recommended)

After importing to staging, you may want to sanitize sensitive data:

```bash
# SSH into staging server
ssh -i ~/.ssh/your-aws-key.pem ubuntu@18.118.114.98

# Connect to MySQL
mysql -u root -p

# Sanitize data (example queries)
USE db_taist;

-- Clear real customer emails (optional)
-- UPDATE users SET email = CONCAT('test_', id, '@example.com') WHERE id > 0;

-- Clear real phone numbers (optional)
-- UPDATE users SET phone = CONCAT('555-0100', id) WHERE id > 0;

-- Clear payment tokens
-- UPDATE transactions SET stripe_token = NULL;

-- Exit MySQL
EXIT;
```

### Step 6: Update Staging Configuration

Ensure staging `.env` file points to staging database:

```bash
# SSH into staging
ssh -i ~/.ssh/your-aws-key.pem ubuntu@18.118.114.98

# Edit Laravel .env file
sudo nano /var/www/html/.env

# Verify these settings:
DB_HOST=127.0.0.1
DB_DATABASE=db_taist
DB_USERNAME=root
DB_PASSWORD=[your-staging-db-password]

# Restart PHP-FPM to pick up changes
sudo systemctl restart php-fpm
# Or restart Apache if using mod_php
sudo systemctl restart apache2
```

### Step 7: Test Staging Environment

```bash
# Test from your local machine
curl -I https://taist.cloudupscale.com/mapi/get-version

# Or test a specific endpoint that uses the database
curl https://taist.cloudupscale.com/mapi/check-db-connection
```

---

## Option 2: Using AWS RDS (If Migrating to RDS)

If you plan to use AWS RDS for databases:

### Step 1: Create RDS Snapshot from Production

This assumes your production database is on RDS (if not, skip to Option 1).

```bash
# Create snapshot via AWS CLI
aws rds create-db-snapshot \
  --db-instance-identifier taist-production \
  --db-snapshot-identifier taist-prod-snapshot-$(date +%Y%m%d) \
  --region us-east-2
```

### Step 2: Restore Snapshot to New Instance

```bash
# Restore to staging RDS instance
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier taist-staging \
  --db-snapshot-identifier taist-prod-snapshot-20251121 \
  --region us-east-2
```

### Step 3: Update Staging Environment Variables

Update staging server `.env` to point to new RDS instance.

---

## Option 3: Automated Script (Quick Copy)

Create a script on production server for easy future copies:

```bash
#!/bin/bash
# File: ~/copy-db-to-staging.sh

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=~/db-backups
STAGING_IP="18.118.114.98"

echo "Starting database backup..."
mkdir -p $BACKUP_DIR

# Backup databases
mysqldump -u root -p db_taist | gzip > $BACKUP_DIR/db_taist_${BACKUP_DATE}.sql.gz
mysqldump -u root -p taist-main | gzip > $BACKUP_DIR/taist-main_${BACKUP_DATE}.sql.gz

echo "Transferring to staging..."
scp $BACKUP_DIR/*.sql.gz ubuntu@$STAGING_IP:~/

echo "Importing on staging (requires staging SSH)..."
ssh ubuntu@$STAGING_IP << 'ENDSSH'
cd ~/
gunzip -f *.sql.gz
mysql -u root -p db_taist < db_taist_*.sql
mysql -u root -p taist-main < taist-main_*.sql
rm *.sql
ENDSSH

echo "Database copy complete!"
```

Make it executable:

```bash
chmod +x ~/copy-db-to-staging.sh
```

---

## Safety Checklist

Before running the copy:

- [ ] Verify you're connected to the correct servers
- [ ] Confirm staging server has enough disk space
- [ ] Take a backup of current staging database (just in case)
- [ ] Inform team members about staging refresh
- [ ] Check that no critical staging tests are running

After the copy:

- [ ] Verify database connection works
- [ ] Test key API endpoints
- [ ] Check table counts match production
- [ ] Consider sanitizing sensitive data
- [ ] Update team that staging has fresh data

---

## Troubleshooting

### "Access denied" errors

```bash
# Verify MySQL credentials
mysql -u root -p -e "SELECT 1;"

# Check .env file matches database credentials
cat /var/www/html/.env | grep DB_
```

### "Disk space" errors

```bash
# Check available space
df -h

# Clean up old backups
rm -f ~/db-backups/*.sql.gz

# Clean up old logs
sudo journalctl --vacuum-time=7d
```

### Transfer too slow

```bash
# Compress more aggressively
mysqldump -u root -p db_taist | gzip -9 > backup.sql.gz

# Or use direct pipe (no local file)
mysqldump -u root -p db_taist | ssh ubuntu@18.118.114.98 'mysql -u root -p db_taist'
```

### Import fails

```bash
# Check SQL file for errors
zcat backup.sql.gz | head -n 50

# Try importing with verbose errors
mysql -u root -p --verbose db_taist < backup.sql 2>&1 | tee import.log
```

---

## Automated Scheduling (Optional)

To automatically refresh staging database weekly:

```bash
# SSH into production
crontab -e

# Add this line (runs every Sunday at 2 AM)
0 2 * * 0 /home/ec2-user/copy-db-to-staging.sh >> /var/log/db-copy.log 2>&1
```

---

## Database Size Estimates

To check database sizes before copying:

```bash
# Connect to MySQL
mysql -u root -p

# Check database sizes
SELECT 
  table_schema AS 'Database',
  ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema IN ('db_taist', 'taist-main')
GROUP BY table_schema;
```

---

## Best Practices

1. **Regular Refreshes**: Refresh staging from production monthly or before major releases
2. **Data Sanitization**: Always sanitize sensitive customer data on staging
3. **Document Changes**: Keep notes of when staging was last refreshed
4. **Backup First**: Always backup staging before overwriting with production data
5. **Test Thoroughly**: After refresh, run smoke tests to ensure everything works

---

## Quick Commands Reference

```bash
# Export from production
mysqldump -u root -p db_taist | gzip > db_taist.sql.gz

# Import to staging
gunzip < db_taist.sql.gz | mysql -u root -p db_taist

# Check table count
mysql -u root -p -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='db_taist';"

# Check largest tables
mysql -u root -p -e "
SELECT 
  table_name,
  ROUND((data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'db_taist'
ORDER BY (data_length + index_length) DESC
LIMIT 10;
"
```

---

## Next Steps

After successfully copying the database:

1. ✅ Test mobile app against staging environment
2. ✅ Verify all API endpoints work correctly
3. ✅ Run any necessary data migrations
4. ✅ Update team documentation with refresh date
5. ✅ Schedule next refresh

---

## Support

If you encounter issues:

1. Check server logs: `sudo tail -f /var/log/mysql/error.log`
2. Verify PHP-FPM logs: `sudo tail -f /var/log/php-fpm/error.log`
3. Check Apache logs: `sudo tail -f /var/log/apache2/error.log`

---

*Keep this document updated as your database copy process evolves.*

