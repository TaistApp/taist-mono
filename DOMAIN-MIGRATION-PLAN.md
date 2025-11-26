# Domain Migration Plan - Move to Taist.app

**Issue:** Currently using CodeUpscale domains (bad practice)  
**Solution:** Migrate to your own `taist.app` domain  
**When:** During Railway migration (kill two birds with one stone!)  

---

## Current Problem

### What You Own
- ✅ `taist.app` (confirmed - your website)
- ❓ `taist.com` (need to verify ownership)

### What You're Using (NOT YOURS!)
- ❌ `taist.cloudupscale.com` → CodeUpscale's domain
- ❌ `taist.codeupscale.com` → CodeUpscale's domain

### Why This is Bad

**1. You Don't Control These Domains**
- CodeUpscale owns `cloudupscale.com` and `codeupscale.com`
- They control your backend access
- If relationship ends, they could shut you down

**2. Vendor Lock-In**
- Your mobile app hardcoded to their domains
- Can't easily switch providers
- Always dependent on CodeUpscale

**3. Not Professional**
- Your brand is Taist, not "cloudupscale"
- Looks like you don't own your infrastructure
- API calls expose third-party dependency

**4. DNS Control**
- Can't make DNS changes yourself
- Have to ask CodeUpscale for every change
- Delays and dependency

---

## Target Architecture

### Your New Domain Setup

```
┌─────────────────────────────────────┐
│          taist.app                  │  ← Your website (already here!)
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│       api.taist.app                 │  ← Production API (NEW)
│   (or backend.taist.app)            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│    staging-api.taist.app            │  ← Staging API (NEW)
│   (or dev-api.taist.app)            │
└─────────────────────────────────────┘
```

### Recommended Subdomains

**Option A (Recommended):**
- Production: `api.taist.app`
- Staging: `staging-api.taist.app`

**Option B (Cleaner URLs):**
- Production: `api.taist.app`
- Staging: `api-staging.taist.app`

**Option C (Most Common):**
- Production: `api.taist.app`
- Staging: `dev.taist.app`

---

## Domain Ownership Verification

### Step 1: Verify What You Own

Check if you own `taist.com` in addition to `taist.app`:

```bash
# Check taist.com
whois taist.com

# Check taist.app  
whois taist.app
```

**Questions to Answer:**
- [ ] Do you own `taist.com`?
- [ ] Do you own `taist.app`? (YES, confirmed)
- [ ] Who is the domain registrar? (GoDaddy, Namecheap, etc.)
- [ ] Do you have DNS management access?

### Step 2: Gain Full Control

**If CodeUpscale manages your domains:**
1. Get registrar login credentials
2. Get DNS management access (Cloudflare, Route 53, etc.)
3. Verify you're the domain owner, not them

**If you need to register domains:**
- Register `taist.com` if you don't own it (recommended!)
- Gives you more flexibility

---

## Migration Strategy: Combined with Railway

### Why Combine Migrations?

**Benefits:**
✅ One-time mobile app update (not two)  
✅ One disruption instead of two  
✅ Break free from CodeUpscale during infrastructure move  
✅ Professional setup from day 1 on Railway  
✅ Single maintenance window  

**Timeline Impact:**
- Adds ~1 day to migration (minimal)
- Same downtime (just updating DNS differently)

---

## Updated Migration Timeline

### Phase 1: Setup (Week 1)
**Day 1-2: Railway + Domain Setup**
- Create Railway account
- Set up DNS on your `taist.app` domain
- Create subdomains: `api.taist.app`, `staging-api.taist.app`
- Point to Railway

**Day 3-4: Staging Migration**
- Deploy staging to Railway
- Configure `staging-api.taist.app` → Railway staging
- Test thoroughly

**Day 5: Staging App Update**
- Update frontend to use `staging-api.taist.app`
- Build new staging app
- Test via TestFlight

### Phase 2: Testing (Week 2)
- Test all functionality on new domain
- Fix any issues
- Get team sign-off

### Phase 3: Production (Week 3, Weekend)
- Deploy production to Railway
- Update DNS: `api.taist.app` → Railway production
- Build new production app with new domain
- Submit to App Store (1-2 weeks review)

### Phase 4: Transition Period
- Keep old domains working temporarily
- Gradually move users to new app version
- After all users updated → shut down old domains

---

## DNS Configuration

### Current Setup (CodeUpscale's Domains)

```
taist.cloudupscale.com → 18.118.114.98 (AWS staging)
taist.codeupscale.com → Cloudflare → 18.216.154.184 (AWS prod)
```

### New Setup (Your Domains)

```
# Website (already configured)
taist.app → Your website hosting

# Staging API (NEW)
staging-api.taist.app → Railway staging backend
Type: CNAME
Value: taist-backend-staging.up.railway.app
TTL: 300

# Production API (NEW)
api.taist.app → Cloudflare → Railway production backend
Type: CNAME  
Value: taist-backend-production.up.railway.app
Proxied: Yes (orange cloud)
TTL: Auto
```

### DNS Provider Options

**Option A: Cloudflare (Recommended)**
- Free tier includes CDN
- DDoS protection
- Easy SSL
- Fast DNS propagation

**Option B: Your Domain Registrar**
- Use built-in DNS
- Simpler but less features
- Fine for basic setup

---

## Frontend Code Changes

### Current Code (frontend/app/services/api.ts)

```typescript
const getEnvironmentUrls = () => {
  if (APP_ENV === 'staging' || APP_ENV === 'development') {
    return {
      BASE_URL: 'https://taist.cloudupscale.com/mapi/',  // OLD - CodeUpscale
      Photo_URL: 'https://taist.cloudupscale.com/assets/uploads/images/',
      HTML_URL: 'https://taist.cloudupscale.com/assets/uploads/html/',
    };
  } else {
    return {
      BASE_URL: 'https://taist.codeupscale.com/mapi/',  // OLD - CodeUpscale
      Photo_URL: 'https://taist.codeupscale.com/assets/uploads/images/',
      HTML_URL: 'https://taist.codeupscale.com/assets/uploads/html/',
    };
  }
};
```

### New Code (Your Domains)

```typescript
const getEnvironmentUrls = () => {
  if (APP_ENV === 'staging' || APP_ENV === 'development') {
    return {
      BASE_URL: 'https://staging-api.taist.app/mapi/',  // NEW - Your domain!
      Photo_URL: 'https://staging-api.taist.app/assets/uploads/images/',
      HTML_URL: 'https://staging-api.taist.app/assets/uploads/html/',
    };
  } else {
    return {
      BASE_URL: 'https://api.taist.app/mapi/',  // NEW - Your domain!
      Photo_URL: 'https://api.taist.app/assets/uploads/images/',
      HTML_URL: 'https://api.taist.app/assets/uploads/html/',
    };
  }
};
```

---

## App Store Submission

### Version Bump Required

Since you're changing API URLs, you need new app versions:

**Current Version:** 28.0.3

**New Version:** 29.0.0 (major version - infrastructure change)

Update `frontend/app.json`:
```json
{
  "expo": {
    "version": "29.0.0",
    "ios": {
      "buildNumber": "29.0.0"
    },
    "android": {
      "versionCode": 290000
    }
  }
}
```

### App Store Review Timeline

- **TestFlight:** Instant (for testing)
- **App Store Review:** 1-2 weeks typically
- **User Adoption:** Gradual over 2-4 weeks

---

## Transition Strategy: Backwards Compatibility

### Option A: Hard Cutover (Simple)

**Timeline:**
1. Deploy new app version with new domains
2. Wait for App Store approval (1-2 weeks)
3. Once approved, update DNS
4. Old app versions break → force users to update

**Pros:**
- Simple
- Clean break

**Cons:**
- Users on old versions can't use app until they update
- May frustrate some users

### Option B: Graceful Transition (Recommended)

**Timeline:**
1. Set up new domains on Railway
2. Keep both old AND new domains working temporarily
3. Release new app version
4. Monitor adoption (80%+ on new version)
5. After 4-6 weeks, shut down old domains

**Implementation:**

Configure Railway to respond to BOTH domains temporarily:

In Railway → Production → Settings → Networking:
- Add domain: `api.taist.app` (NEW)
- Add domain: `taist.codeupscale.com` (OLD - temporary)

After transition period:
- Remove old domain
- Fully independent from CodeUpscale

**Pros:**
- No user disruption
- Gradual migration
- Can rollback if issues

**Cons:**
- Slightly more complex
- Temporary dependency on CodeUpscale DNS

---

## Communication Plan

### To Users

**In-App Notification (before/during migration):**
```
📱 App Update Available
We're improving Taist! Please update to the latest 
version for the best experience.
[Update Now]
```

**Email (after migration):**
```
Subject: Taist App Update - Better Performance

Hi [Name],

We've upgraded our servers to provide you with 
faster, more reliable service. Please update your 
Taist app to version 29.0.0 to continue enjoying 
seamless chef bookings.

Update now: [App Store Link]

Thanks,
The Taist Team
```

### To Team

**Slack/Email:**
```
🚀 Infrastructure Migration - Action Required

We're moving away from CodeUpscale infrastructure to 
our own domains and Railway platform.

What's Changing:
- Old: taist.codeupscale.com
- New: api.taist.app

Timeline:
- Week 1: Staging migration
- Week 2: Testing
- Week 3: Production migration
- Week 4-8: Monitor & transition

Impact:
- Users need to update app (via App Store)
- ~30 min production downtime (weekend)
- Better performance & cost savings after

Questions? #infrastructure-migration
```

---

## Checklist: Domain Migration

### Pre-Migration
- [ ] Verify you own `taist.app` ✅ (CONFIRMED)
- [ ] Check if you own `taist.com` (recommended)
- [ ] Get DNS management access (Cloudflare account, etc.)
- [ ] Get domain registrar login
- [ ] Verify CodeUpscale can't lock you out

### Setup
- [ ] Create subdomains in DNS:
  - [ ] `api.taist.app`
  - [ ] `staging-api.taist.app`
- [ ] Configure SSL certificates (auto via Railway/Cloudflare)
- [ ] Point staging subdomain to Railway staging

### Testing
- [ ] Test staging with new domain
- [ ] Update frontend staging URLs
- [ ] Build staging app with new URLs
- [ ] Test via TestFlight

### Production
- [ ] Deploy production to Railway
- [ ] Point production subdomain to Railway
- [ ] Update frontend production URLs
- [ ] Build production app
- [ ] Submit to App Store
- [ ] Wait for approval (1-2 weeks)

### Transition
- [ ] Monitor user adoption
- [ ] Keep old domains working (4-6 weeks)
- [ ] After 80%+ adoption, consider deprecating old domains
- [ ] Fully remove old CodeUpscale domains

---

## Cost Impact

### Old Setup (CodeUpscale Domains)
- **Control:** None (they own it)
- **Cost:** Unknown (possibly buried in their fees)
- **Risk:** High (dependency)

### New Setup (Your Domains)
- **Domain Cost:** $12-15/year for `taist.app` (you already own)
- **DNS:** Free (Cloudflare) or $0-5/month (other providers)
- **Control:** Full (you own everything)
- **Risk:** Low (independent)

**Total Additional Cost:** ~$1-2/month = Worth it for independence!

---

## Risk Mitigation

### Risk: App Store Approval Delay

**Mitigation:**
- Submit early (during staging testing)
- Be ready to answer Apple questions quickly
- Have old domains working as backup

### Risk: Users Don't Update

**Mitigation:**
- Force update after reasonable period (4-6 weeks)
- Clear in-app messaging
- Email campaigns
- Keep old domains working temporarily

### Risk: DNS Issues

**Mitigation:**
- Test DNS before production cutover
- Have CodeUpscale keep old domains alive temporarily
- Document rollback procedure

### Risk: CodeUpscale Blocks You

**Mitigation:**
- Get full domain ownership verified FIRST
- Have new infrastructure ready before cutting ties
- Legal contract review (who owns what?)

---

## After Migration: What to Ask CodeUpscale

### 1. Domain Ownership Clarification

**Questions:**
- Do we own `cloudupscale.com` subdomains, or do you?
- Can you transfer DNS control to us?
- What's the process to fully migrate away?

### 2. Deprecation Timeline

**Request:**
- Keep old subdomains alive for 6-8 weeks during transition
- Provide DNS forwarding to our new domains
- Clear handoff of all infrastructure

### 3. Documentation Handoff

**Ask for:**
- All server configurations
- Database schemas/backups
- Environment variables
- Any custom integrations
- Access to all third-party services

---

## Success Criteria

✅ Domain migration successful when:
- You fully control `api.taist.app`
- Mobile app uses your domains only
- No dependency on CodeUpscale domains
- All users on new app version
- Old domains can be shut down
- Professional, branded API URLs
- Clear ownership of all infrastructure

---

## Recommended: Do This Sooner Rather Than Later

**Why Urgent:**
1. You don't control your current domains
2. Migration takes 4-6 weeks (app store approval)
3. The longer you wait, the more users on old domains
4. Perfect time is NOW during Railway migration

**Don't Wait:**
- Don't wait until after Railway migration (two disruptions)
- Don't wait for relationship with CodeUpscale to sour
- Do it proactively while you control the timeline

---

## Next Steps

### This Week
1. [ ] Verify domain ownership (`taist.app`, possibly `taist.com`)
2. [ ] Get DNS management access
3. [ ] Review this plan with team
4. [ ] Decide on subdomain structure
5. [ ] Add to Railway migration plan

### During Railway Migration
1. [ ] Set up new subdomains
2. [ ] Update frontend URLs
3. [ ] Test in staging
4. [ ] Deploy to production
5. [ ] Submit new app to stores

### After Migration
1. [ ] Monitor user adoption
2. [ ] Deprecate old domains
3. [ ] Fully independent from CodeUpscale

---

## Questions?

**Key Decisions Needed:**
- Which subdomains? (Recommended: `api.taist.app`, `staging-api.taist.app`)
- Transition strategy? (Recommended: Graceful - keep both working)
- Do you own `taist.com` too? (Recommended: Yes, register if not)

---

*This domain migration should be done AS PART OF the Railway migration, not separately.*

See: `RAILWAY-MIGRATION-GUIDE.md` for full infrastructure migration details.

