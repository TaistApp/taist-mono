# AWS Infrastructure Documentation - Taist Platform

**Last Updated:** November 21, 2025  
**AWS Account:** 905418363452  
**Primary Region:** us-east-2 (Ohio)

---

## Table of Contents

- [Overview](#overview)
- [EC2 Instances](#ec2-instances)
- [DNS Configuration](#dns-configuration)
- [Mobile App Backend URLs](#mobile-app-backend-urls)
- [Architecture Diagram](#architecture-diagram)
- [Cost Analysis](#cost-analysis)
- [Action Items](#action-items)
- [Migration Plans](#migration-plans)

---

## Overview

The Taist platform currently uses AWS EC2 instances to host backend APIs. There are multiple instances serving different environments and purposes.

### Infrastructure Summary

- **3 EC2 Instances** (2 running, 1 stopped)
- **2 Active Backend Environments** (Staging & Production)
- **1 Potentially Unused Instance** ("Taist 2")
- **CDN:** Cloudflare (production frontend caching)

---

## EC2 Instances

### 1. taist-staging-n... (Active Staging Server)

| Property | Value |
|----------|-------|
| **Instance ID** | `i-0414e6c20e52ff230` |
| **Instance Type** | t2.medium |
| **State** | ✅ Running |
| **Public IP** | `18.118.114.98` |
| **Private IP** | `172.31.5.17` |
| **Availability Zone** | us-east-2b |
| **Public DNS** | `ec2-18-118-114-98.us-east-2.compute.amazonaws.com` |
| **OS** | Ubuntu (Apache 2.4.58) |
| **PHP Version** | 7.2.34 |
| **Purpose** | **Staging/Development Backend** |
| **Domain** | `taist.cloudupscale.com` |
| **Used By** | Mobile app (staging/preview builds) |

**Status:** ✅ **ACTIVE - This server is being used by your staging/development mobile builds**

#### Configuration:
- Web Server: Apache 2.4.58
- Backend: Laravel PHP application
- SSL: Configured
- API Endpoint: `https://taist.cloudupscale.com/mapi/`

---

### 2. Taist 2 (Production Backend) 🚨 CRITICAL

| Property | Value |
|----------|-------|
| **Instance ID** | `i-0f46d1589f0aeadf1` |
| **Instance Type** | t2.small |
| **State** | ✅ Running |
| **Public IP** | `18.216.154.184` |
| **Private IP** | `172.31.5.17` |
| **Availability Zone** | us-east-2a |
| **Public DNS** | `ec2-18-216-154-184.us-east-2.compute.amazonaws.com` |
| **OS** | Amazon Linux 2 (Apache 2.4.58) |
| **PHP Version** | 7.2.34 |
| **Purpose** | ✅ **PRODUCTION BACKEND - CRITICAL** |
| **Domain** | `taist.codeupscale.com` (via Cloudflare CDN) |
| **Used By** | ✅ **Mobile app production builds** |

**Status:** ✅ **ACTIVE - THIS IS YOUR PRODUCTION SERVER!**

#### Configuration:
- Web Server: Apache 2.4.58
- Backend: Laravel PHP application at `/var/www/html/`
- PHP-FPM: ~45 worker processes
- SSL: Managed by Cloudflare
- Behind Cloudflare CDN (origin server)
- API Endpoint: `https://taist.codeupscale.com/mapi/`

#### Active Traffic (Verified Nov 21, 2025):
- ✅ iOS app users (Taist/6 CFNetwork)
- ✅ Android app users (okhttp/4.9.2)
- ✅ Hourly background check cron job
- ✅ All traffic routes through Cloudflare IPs (172.69.x.x, 172.70.x.x)

#### Security Concerns:
- ⚠️ 92 security packages need updating
- ⚠️ Amazon Linux 2 EOL: June 30, 2025 - needs migration to AL2023
- ⚠️ Receiving automated attack attempts (all blocked)

#### ⚠️ DO NOT SHUT DOWN - CRITICAL PRODUCTION SERVER

---

### 3. Taist - Staging (Stopped - Not Used)

| Property | Value |
|----------|-------|
| **Instance ID** | `i-02b7c455cc4954ca6` |
| **Instance Type** | t2.small |
| **State** | ⛔ Stopped |
| **Elastic IP** | `3.19.115.73` |
| **Availability Zone** | us-east-2a |
| **Purpose** | Old staging server (decommissioned) |
| **Used By** | None |

**Status:** ⛔ **STOPPED - Can likely be terminated to save costs**

---

## DNS Configuration

### Current DNS Records

| Domain | IP Address(es) | Points To | Status |
|--------|---------------|-----------|--------|
| `taist.cloudupscale.com` | `18.118.114.98` | taist-staging-n... instance | ✅ Active |
| `taist.codeupscale.com` | `104.21.40.91`, `172.67.183.71` | Cloudflare CDN → Taist 2 (18.216.154.184) | ✅ Active |
| `api.taist.com` | `54.243.117.197`, `13.223.25.84` | Unknown (.NET/Kestrel server) | ⚠️ Mismatch |

### DNS Verification Results

```bash
# Staging Backend
$ nslookup taist.cloudupscale.com
Address: 18.118.114.98
✅ Matches: taist-staging-n... instance

# Production Backend (behind Cloudflare)
$ nslookup taist.codeupscale.com
Address: 104.21.40.91, 172.67.183.71
✅ Cloudflare CDN (hiding origin server)

# Client Production API
$ nslookup api.taist.com
Address: 54.243.117.197, 13.223.25.84
❌ ISSUE: Points to .NET server, not PHP/Laravel
❌ Does NOT point to "Taist 2" instance
```

### DNS Issues

1. **`api.taist.com` DNS Mismatch:**
   - Currently points to: `54.243.117.197` / `13.223.25.84`
   - Running: .NET/Kestrel server (not Laravel)
   - "Taist 2" configured for this domain but DNS doesn't point there
   - **Action Required:** Investigate which server should serve `api.taist.com`

---

## Mobile App Backend URLs

The mobile app (`frontend/app/services/api.ts`) uses different URLs based on environment:

### Staging/Development Environment

```javascript
APP_ENV = 'staging' or 'development'
BASE_URL: 'https://taist.cloudupscale.com/mapi/'
Photo_URL: 'https://taist.cloudupscale.com/assets/uploads/images/'
HTML_URL: 'https://taist.cloudupscale.com/assets/uploads/html/'
```

**Backend Server:** taist-staging-n... (`18.118.114.98`)  
**Status:** ✅ Working (returns HTTP 200)

### Production Environment

```javascript
APP_ENV = 'production'
BASE_URL: 'https://taist.codeupscale.com/mapi/'
Photo_URL: 'https://taist.codeupscale.com/assets/uploads/images/'
HTML_URL: 'https://taist.codeupscale.com/assets/uploads/html/'
```

**Backend Server:** Unknown (behind Cloudflare CDN)  
**Status:** ✅ Working (returns HTTP 200)  
**CDN:** Cloudflare (104.21.40.91, 172.67.183.71)

---

## Architecture Diagram

### Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile App Users                         │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────┐          ┌──────────────┐
│   Staging    │          │  Production  │
│    Build     │          │    Build     │
│ (preview)    │          │              │
└──────┬───────┘          └──────┬───────┘
       │                         │
       │ APP_ENV='staging'       │ APP_ENV='production'
       │                         │
       ▼                         ▼
┌──────────────────┐     ┌──────────────────┐
│ taist.           │     │ taist.           │
│ cloudupscale.com │     │ codeupscale.com  │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         │ 18.118.114.98          │ Cloudflare CDN
         ▼                        ▼
┌─────────────────────┐   ┌─────────────────────┐
│ taist-staging-n...  │   │  Unknown Origin     │
│  EC2 (t2.medium)    │   │  Server (behind     │
│  us-east-2b         │   │  Cloudflare)        │
│  Apache + Laravel   │   │  Apache + Laravel   │
│  PHP 7.2.34         │   │  PHP 7.2.34         │
└─────────────────────┘   └─────────────────────┘
         ✅                        ✅
     ACTIVE & USED             ACTIVE & USED

┌─────────────────────┐
│     Taist 2         │
│  EC2 (t2.small)     │
│  us-east-2a         │
│  18.216.154.184     │
│  Apache + Laravel   │
│  Configured for:    │
│  api.taist.com      │
└─────────────────────┘
         ⚠️
   RUNNING BUT NOT USED
   BY MOBILE APP
```

### Intended Architecture (from backend/README.md)

According to `backend/README.md`, the intended production URL should be:

```
Production: https://api.taist.com/api
```

This suggests a migration is planned or partially complete.

---

## Cost Analysis

### Monthly EC2 Costs (Estimated)

| Instance | Type | Hours/Month | Price/Hour | Monthly Cost |
|----------|------|-------------|------------|--------------|
| taist-staging-n... | t2.medium | 730 | $0.0464 | ~$33.87 |
| Taist 2 | t2.small | 730 | $0.023 | ~$16.79 |
| Taist - Staging | t2.small | 0 (stopped) | $0 | $0.00 |
| **Total** | | | | **~$50.66/month** |

### Potential Savings

If "Taist 2" is not needed:
- **Monthly Savings:** ~$16.79
- **Annual Savings:** ~$201.48

Additional savings from stopped instance:
- Elastic IP for stopped instance: ~$3.60/month if not released
- **Recommendation:** Terminate or release Elastic IP

---

## Action Items

### High Priority

- [ ] **Investigate "Taist 2" instance** (18.216.154.184)
  - Check access logs for recent traffic
  - Determine if currently in use
  - Identify purpose and necessity
  
- [ ] **Resolve api.taist.com DNS mismatch**
  - Current DNS points to .NET server (not Laravel)
  - "Taist 2" configured for this domain but not used
  - Determine correct configuration
  
- [ ] **Document Cloudflare configuration**
  - Identify origin server for taist.codeupscale.com
  - Document Cloudflare DNS/CDN settings

### Medium Priority

- [ ] **Terminate or release resources**
  - Consider terminating "Taist - Staging" (stopped)
  - Release unused Elastic IPs
  
- [ ] **Check other AWS regions**
  - Verify no other instances in us-east-1 or other regions
  - Look for the api.taist.com server (54.243.117.197)
  
- [ ] **Implement monitoring**
  - Set up CloudWatch alarms for active instances
  - Monitor costs and usage patterns

### Low Priority

- [ ] **Migration to Railway** (Sprint Task TMA-010)
  - Currently "In Progress"
  - May eliminate AWS costs entirely
  - Document migration plan

---

## Migration Plans

### Current Sprint Task: TMA-010 - Move from AWS to Railway

**Status:** In Progress

This task suggests a planned migration away from AWS to Railway platform. This would:
- Eliminate AWS EC2 costs
- Simplify infrastructure management
- Potentially reduce overall hosting costs

**Considerations:**
- Coordinate with frontend API URL changes
- Plan for zero-downtime migration
- Update DNS records
- Test thoroughly in staging first

---

## Investigation Commands

### To Check Instance Usage

```bash
# SSH into instance (via AWS Console "Connect" button)
# Then run:

# Check recent access logs
sudo tail -n 100 /var/log/apache2/access.log

# Check today's traffic
sudo grep "$(date +%Y-%m-%d)" /var/log/apache2/access.log | wc -l

# Check what domains this server responds to
sudo grep -r "ServerName" /etc/apache2/
sudo grep -r "server_name" /etc/nginx/

# Check running processes
ps aux | grep -E "apache|php"

# Check Laravel application location
sudo find / -name "artisan" 2>/dev/null
```

### To Test Endpoints

```bash
# Test by IP
curl -I http://18.216.154.184

# Test with host header
curl -H "Host: api.taist.com" http://18.216.154.184/api

# Test actual mobile app URLs
curl -I https://taist.cloudupscale.com/mapi/get-version
curl -I https://taist.codeupscale.com/mapi/get-version
```

---

## Security Notes

### Credentials Location

- Database credentials: `.env` files on each server (not in git)
- SSH keys: AWS key pairs (need to verify access)
- API keys: Stored in backend `.env` files

### Access Control

- Security groups control network access
- No load balancers currently configured
- Instances accessible via public IPs

---

## Database Information

### Database Location

According to backend configuration (`backend/config/database.php`):

**Default Connection:** MySQL

The actual database host is configured via environment variables:
- `DB_HOST` (default: 127.0.0.1)
- `DB_DATABASE` (default: db_taist)
- `DB_USERNAME` (default: root)

**Note:** Real values are in `.env` files on each server, not committed to git.

### Multiple Database Configurations

There are two database configs found:

1. **Laravel Backend** (`backend/config/database.php`):
   - Database: `db_taist` (overridable via .env)
   
2. **Legacy PHP API** (`backend/public/include/config.php`):
   - Database: `taist-main`
   - Host: localhost
   - **Note:** Hardcoded credentials (security concern)

---

## Support & Troubleshooting

### AWS Console Access

- **URL:** https://console.aws.amazon.com/
- **Account ID:** 905418363452
- **Region:** us-east-2 (Ohio)
- **User:** billygroble@gmail.com

### Quick Links

- [EC2 Instances Dashboard](https://console.aws.amazon.com/ec2/home?region=us-east-2#Instances)
- [CloudWatch Monitoring](https://console.aws.amazon.com/cloudwatch/home?region=us-east-2)
- [Route 53 DNS](https://console.aws.amazon.com/route53/home)
- [Elastic IPs](https://console.aws.amazon.com/ec2/home?region=us-east-2#Addresses)

---

## Document History

| Date | Author | Changes |
|------|--------|---------|
| 2025-11-21 | System | Initial documentation created from AWS infrastructure audit |

---

## Next Steps

1. ✅ Created infrastructure documentation
2. ⏭️ Investigate "Taist 2" instance usage
3. 🔜 Resolve DNS/configuration mismatches
4. 🔜 Optimize costs by removing unused resources
5. 🔜 Plan Railway migration (TMA-010)

---

*This document should be updated as infrastructure changes are made.*

