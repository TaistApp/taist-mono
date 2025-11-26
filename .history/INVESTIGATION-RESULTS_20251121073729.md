# "Taist 2" Instance Investigation Results

**Date:** November 21, 2025  
**Instance:** i-0f46d1589f0aeadf1 (Taist 2)  
**IP:** 18.216.154.184

---

## 🚨 CRITICAL FINDING

**"Taist 2" IS YOUR PRODUCTION BACKEND SERVER!**

This instance is actively serving production traffic for the mobile app via `taist.codeupscale.com` through Cloudflare CDN.

**⚠️ DO NOT SHUT DOWN THIS SERVER - IT IS CRITICAL TO PRODUCTION!**

---

## Traffic Analysis

### Active Users Today (Nov 21, 2025)

**iOS App Users:**
- User 947 - Active at 10:46 AM and 1:02 PM
- Searching for chefs, viewing menus
- User agent: `Taist/6 CFNetwork/3826.600.41 Darwin/24.6.0`

**Android App Users:**
- User 1008 - Active at 11:32 AM and 1:16 PM
- Searching for chefs, checking conversations
- User agent: `okhttp/4.9.2`

### Traffic Sources

All legitimate app traffic comes through **Cloudflare IPs**:
- `172.69.59.47-48` (Cloudflare)
- `172.69.17.130-131` (Cloudflare)
- `172.70.80.58-59` (Cloudflare)
- `172.69.6.139` (Cloudflare)

This confirms the routing:
```
Mobile App → taist.codeupscale.com → Cloudflare CDN → Taist 2 (18.216.154.184)
```

### API Endpoints Being Used

- `/mapi/get-version` - Version checking
- `/mapi/get_search_chefs/{user_id}` - Chef discovery
- `/mapi/get_availability_by_user_id` - Chef availability
- `/mapi/get_conversation_list_by_user_id` - Messages
- `/assets/uploads/images/user_photo_*.jpg` - Profile photos
- `/mapi/background_check_order_status` - Cron job (hourly)

---

## Server Configuration

### Application Stack

- **Web Server:** Apache/httpd 2.4.58
- **PHP:** 7.2.34
- **Process Manager:** PHP-FPM with ~45 worker processes
- **Laravel Location:** `/var/www/html/artisan`
- **OS:** Amazon Linux 2 (AL2)

### System Status

- **Uptime:** Multiple processes running since Nov 03, 2024
- **PHP-FPM Master Process:** Running since 2024 with 41+ hours CPU time
- **Active Workers:** 45+ PHP-FPM worker processes
- **Apache Processes:** Multiple httpd workers active

### Security Concerns

**⚠️ Security Updates Needed:**
- 92 security packages pending
- 113 total updates available
- **Recommendation:** Schedule maintenance window to apply updates

**⚠️ OS End of Life Warning:**
- Amazon Linux 2 EOL: June 30, 2025
- **Recommendation:** Plan migration to Amazon Linux 2023 (supported until 2028)

---

## Automated Tasks

### Cron Jobs

**Background Check Poller:**
```
Runs: Every hour
Endpoint: GET /mapi/background_check_order_status
Source: 18.216.154.184 (localhost)
Status: Working (returns HTTP 200)
Last Run: 13:00:01 UTC
```

---

## Attack/Scan Activity

The server is receiving automated attacks/scans:

### Common Attack Patterns Seen

1. **Environment file probes:**
   - `GET /.env` - Multiple IPs
   - Attempting to steal credentials

2. **Exploit attempts:**
   - CGI-bin exploits
   - PHP remote code execution attempts
   - ThinkPHP vulnerabilities
   - Drupal exploits

3. **Bots and scanners:**
   - Various IPs: 192.159.99.95, 193.32.249.162, 107.174.25.44
   - User-agents: "bang2013@atomicmail.io"

**Current Status:** All attacks returning 404/400 (properly blocked)

**Recommendation:** Consider adding:
- Fail2ban or similar intrusion prevention
- WAF (Web Application Firewall) rules in Cloudflare
- Regular security audits

---

## Updated Architecture Diagram

```
┌─────────────────────────────────────┐
│    Mobile App (Production Build)    │
│         APP_ENV='production'        │
└──────────────┬──────────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │ taist.codeupscale.com│
    │  DNS: Cloudflare IPs │
    │  104.21.40.91        │
    │  172.67.183.71       │
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │   Cloudflare CDN     │
    │   (Proxy + Cache)    │
    │   172.69.x.x         │
    │   172.70.x.x         │
    └──────────┬───────────┘
               │
               ▼ (Origin Server)
    ┌──────────────────────────────┐
    │      Taist 2 Instance        │
    │     18.216.154.184           │
    │   i-0f46d1589f0aeadf1        │
    │                              │
    │  Apache 2.4.58 + PHP 7.2.34  │
    │  Laravel Application         │
    │  /var/www/html/              │
    │                              │
    │  Status: ✅ PRODUCTION       │
    │  Critical: DO NOT SHUT DOWN  │
    └──────────────────────────────┘
```

---

## Why the Confusion?

**DNS pointed to Cloudflare, not the origin server:**
- When you looked up `taist.codeupscale.com`, it resolved to Cloudflare IPs
- Cloudflare acts as a proxy/CDN in front of your real server
- The origin server IP (18.216.154.184) is hidden from public DNS
- This is a **security best practice** (DDoS protection, caching, hiding origin)

---

## Cost Impact

**Monthly Cost for "Taist 2":** ~$16.79/month (t2.small)

**Value Provided:**
- ✅ Serves ALL production mobile app traffic
- ✅ Handles iOS and Android users
- ✅ Runs critical background check cron
- ✅ Protected by Cloudflare CDN

**Verdict:** **ESSENTIAL - Cannot be shut down without breaking production app**

---

## Action Items

### Immediate

- [x] ~~Investigate "Taist 2" usage~~ - **COMPLETE**
- [ ] **Update AWS-INFRASTRUCTURE.md** with correct information
- [ ] **Do NOT shut down this instance**

### Short Term (Next 30 Days)

- [ ] Schedule maintenance window for security updates
  - 92 security packages need updating
  - Minimal downtime (15-30 minutes)
  - Best time: Low-traffic hours (2-4 AM PST)

- [ ] Review and harden security
  - Enable Cloudflare WAF rules
  - Consider fail2ban installation
  - Review security group rules

### Medium Term (3-6 Months)

- [ ] Plan OS upgrade before EOL
  - Amazon Linux 2 → Amazon Linux 2023
  - EOL date: June 30, 2025
  - Test compatibility with Laravel/PHP first

- [ ] Implement monitoring
  - CloudWatch alarms for CPU/Memory
  - Application performance monitoring
  - Error rate tracking

### Long Term

- [ ] Railway Migration (Sprint Task TMA-010)
  - Currently marked "In Progress"
  - Would replace AWS infrastructure
  - Plan carefully - this is production

---

## Other Instances Status

### taist-staging-n... (18.118.114.98)
**Status:** ✅ Active - Staging/Development  
**Purpose:** Serves `taist.cloudupscale.com`  
**Action:** Keep running

### Taist - Staging (3.19.115.73)
**Status:** ⛔ Stopped  
**Purpose:** Old staging server  
**Action:** Can be terminated to save costs  
**Savings:** ~$16.79/month + ~$3.60/month (Elastic IP)

---

## Recommendations Summary

### ✅ Keep Running
- **Taist 2** - Production backend (CRITICAL)
- **taist-staging-n...** - Staging backend (needed for development)

### ⛔ Can Terminate
- **Taist - Staging** (stopped) - Old/unused
- Save ~$20/month

### 🔧 Maintenance Needed
- Security updates on all running instances
- OS upgrade planning for Amazon Linux 2 EOL

---

## Conclusion

**"Taist 2" is your production backend serving the mobile app.**

The confusion arose because:
1. Cloudflare hides the origin server IP
2. Instance name "Taist 2" doesn't clearly indicate it's production
3. `api.taist.com` points elsewhere (different purpose/unused)

**Recommendation:** Rename instance to "Taist-Production" for clarity.

---

*Investigation completed: November 21, 2025, 1:30 PM UTC*

