# Quick Database Copy: Production → Staging

## How to Access Your Databases

Your databases are **on the EC2 servers**, not visible in AWS RDS console.

To see them:
1. Go to AWS Console → EC2 → Instances
2. Select an instance → Click "Connect"
3. Use "EC2 Instance Connect" or "Session Manager"

---

## Simple Copy Process (Copy/Paste Commands)

### Option 1: Using AWS Console (Easiest)

#### Step 1: Connect to Production Server

1. Go to [AWS EC2 Console](https://console.aws.amazon.com/ec2/home?region=us-east-2#Instances)
2. Find instance: **"Taist 2"** (i-0f46d1589f0aeadf1)
3. Click **Connect** → **Session Manager** → **Connect**

#### Step 2: Create Backups (Paste these commands)

```bash
# Create backup directory
mkdir -p ~/db-backups
cd ~/db-backups

# Backup both databases
sudo mysqldump -u root db_taist > db_taist_backup.sql
sudo mysqldump -u root taist-main > taist-main_backup.sql

# Compress them
gzip db_taist_backup.sql
gzip taist-main_backup.sql

# Check the files
ls -lh *.gz
```

#### Step 3: Copy to Staging Server

Get the backup files to staging. **Keep production terminal open**, open a **NEW SESSION**:

1. Go back to EC2 Console
2. Find: **"taist-staging-n..."** (i-0414e6c20e52ff230)
3. Click **Connect** → **Session Manager** → **Connect**

In the **PRODUCTION** terminal, run:

```bash
# Get the staging server's IP (it's 172.31.5.17 internally)
# Copy files to staging
scp ~/db-backups/*.gz ubuntu@172.31.5.17:~/
```

**Note:** If this doesn't work due to security groups, use Option 2 below.

#### Step 4: Import on Staging

In your **STAGING** terminal:

```bash
# Go to home directory
cd ~/

# Decompress
gunzip db_taist_backup.sql.gz
gunzip taist-main_backup.sql.gz

# Import to databases
sudo mysql -u root db_taist < db_taist_backup.sql
sudo mysql -u root taist-main < taist-main_backup.sql

# Verify it worked
sudo mysql -u root -e "SELECT COUNT(*) as tables FROM information_schema.tables WHERE table_schema='db_taist';"

echo "✓ Database copy complete!"
```

---

### Option 2: If Servers Can't Connect Directly

If the SCP between servers fails, use S3 as intermediate storage:

#### On Production:

```bash
# Upload to S3
aws s3 cp ~/db-backups/db_taist_backup.sql.gz s3://your-bucket-name/db-backups/
aws s3 cp ~/db-backups/taist-main_backup.sql.gz s3://your-bucket-name/db-backups/
```

#### On Staging:

```bash
# Download from S3
aws s3 cp s3://your-bucket-name/db-backups/db_taist_backup.sql.gz ~/
aws s3 cp s3://your-bucket-name/db-backups/taist-main_backup.sql.gz ~/

# Then decompress and import (same as Step 4 above)
gunzip *.gz
sudo mysql -u root db_taist < db_taist_backup.sql
sudo mysql -u root taist-main < taist-main_backup.sql
```

---

## Even Simpler: One-Line Copy

If you have SSH keys set up, you can do this from your local Mac:

### First, tell me your AWS key location

Do you have a `.pem` file for AWS? Check:

```bash
ls ~/Downloads/*.pem
ls ~/.ssh/*.pem
```

### If you have the key:

```bash
# Replace YOUR_KEY.pem with your actual key filename
export KEY=~/Downloads/YOUR_KEY.pem

# Run this one command:
ssh -i $KEY ec2-user@18.216.154.184 'mysqldump -u root db_taist | gzip' | \
  ssh -i $KEY ubuntu@18.118.114.98 'gunzip | mysql -u root db_taist'

# And this for the second database:
ssh -i $KEY ec2-user@18.216.154.184 'mysqldump -u root taist-main | gzip' | \
  ssh -i $KEY ubuntu@18.118.114.98 'gunzip | mysql -u root taist-main'
```

---

## Troubleshooting

### Can't connect via SCP between servers?

The security groups might not allow server-to-server communication. Solutions:

1. **Use S3** (Option 2 above)
2. **Update Security Groups**: Add a rule allowing the staging server's security group to access production
3. **Use your local computer** as a relay

### MySQL permission denied?

Try with `sudo`:

```bash
sudo mysqldump -u root db_taist > backup.sql
sudo mysql -u root db_taist < backup.sql
```

### Check database size first:

```bash
sudo mysql -u root -e "
SELECT 
  table_schema, 
  ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema IN ('db_taist', 'taist-main')
GROUP BY table_schema;
"
```

---

## Quick Reference

**Production Server:**
- Instance: "Taist 2" (i-0f46d1589f0aeadf1)
- IP: 18.216.154.184
- User: ec2-user
- Databases: db_taist, taist-main

**Staging Server:**
- Instance: "taist-staging-n..." (i-0414e6c20e52ff230)
- IP: 18.118.114.98
- User: ubuntu
- Databases: db_taist, taist-main (same names)

---

## What to Do Next

After copying, test the staging environment:

```bash
# Test the staging API
curl https://taist-mono-staging.up.railway.app/mapi/get-version
```

The mobile app's staging builds will now use the fresh production data!

---

## Questions?

- **Where is my SSH key?** Check AWS Console → EC2 → Key Pairs, or look in Downloads
- **Can I see the database in AWS Console?** No, it's on the server, not RDS
- **Is this safe?** Yes, we're only READING from production, not changing it
- **How often should I do this?** Monthly, or before testing major features

---

*This is the quick version. See DATABASE-COPY-GUIDE.md for the full guide.*


