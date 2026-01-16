# Railway Migration - Quick Summary

**Sprint Task:** TMA-010  
**Status:** Ready to Begin  
**Estimated Timeline:** 2-3 weeks  
**Cost Savings:** ~$25-35/month (~$300-420/year)

---

## What We're Doing

Moving from AWS EC2 servers (managed by Upscale) to Railway platform.

**Why?**
- ✅ Simpler management (no servers to maintain)
- ✅ Lower costs ($30/mo vs $55/mo)
- ✅ Better developer experience
- ✅ Automatic scaling and deployments
- ✅ Move away from Upscale dependency

---

## What's Moving

| Item | Current | New |
|------|---------|-----|
| **Staging Backend** | AWS EC2 (taist-staging-n) | Railway |
| **Production Backend** | AWS EC2 (Taist 2) | Railway |
| **Databases** | MySQL on each EC2 | Railway MySQL |
| **File Storage** | EC2 disk | Cloud storage (S3/R2) |
| **Domains** | Same domains | Same domains (just new origin) |

---

## Migration Steps (Simplified)

### Week 1: Setup & Staging
1. Create Railway account & project
2. Set up staging environment
3. Migrate staging database
4. Deploy staging backend
5. Test thoroughly

### Week 2: Testing
1. Test all mobile app functions on staging
2. Fix any issues
3. Get team sign-off

### Week 3: Production (Weekend)
1. **Schedule maintenance window** (2-4 hours)
2. Enable maintenance mode
3. Backup production database
4. Import to Railway
5. Update DNS
6. Test & verify
7. Turn off maintenance mode

### Week 4+: Monitor & Optimize
1. Monitor for issues
2. Keep AWS running as backup
3. After 4 weeks: shut down AWS

---

## Downtime Expectations

- **Staging:** 1-2 hours (OK, it's staging)
- **Production:** Target 30 minutes, max 2 hours
- **Best Time:** Saturday 2-6 AM PST (lowest traffic)

---

## What Changes in the App?

**Good News: Almost Nothing!**

The domain names stay the same:
- `taist-mono-staging.up.railway.app` (staging)
- `taist-mono-production.up.railway.app` (production)

Only the backend origin server changes (users won't notice).

---

## Rollback Plan

If things go wrong:
1. Revert DNS back to AWS (5-10 minutes)
2. Everything back to normal
3. Fix issues and try again later

**That's why we keep AWS running for 4 weeks after migration.**

---

## Cost Comparison

### Current (AWS + Upscale)
- Production EC2: $16.79/mo
- Staging EC2: $33.87/mo
- Data transfer: $5/mo
- **Total: ~$55.66/month**

### After (Railway)
- Platform: $5/mo base
- Backend: ~$15/mo
- Database: ~$10/mo
- **Total: ~$30/month**

**Savings: ~$25/month = $300/year**

Plus no server management!

---

## Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| Migration fails | Keep AWS running as backup, easy rollback |
| Downtime too long | Schedule for low-traffic time, have rollback ready |
| Data loss | Multiple backups, test restore process |
| Performance issues | Test thoroughly in staging first |
| Cost overruns | Monitor Railway usage closely, set budget alerts |

---

## Prerequisites

**Before Starting:**
- [ ] Railway account created
- [ ] Payment method added
- [ ] GitHub access confirmed
- [ ] Team availability confirmed
- [ ] Backups verified

---

## Success Criteria

✅ Migration successful when:
- All API endpoints work
- Mobile app fully functional
- No increase in errors
- Performance same or better
- Running for 2+ weeks stable

---

## Key Files Created

1. **RAILWAY-MIGRATION-GUIDE.md** - Complete detailed guide (this doc)
2. **AWS-INFRASTRUCTURE.md** - Current infrastructure docs
3. **INVESTIGATION-RESULTS.md** - Production server analysis

---

## Next Steps

1. **Review this summary**
2. **Read full RAILWAY-MIGRATION-GUIDE.md**
3. **Create Railway account**
4. **Schedule kickoff meeting**
5. **Set migration dates**

---

## Questions?

- Read full guide: `RAILWAY-MIGRATION-GUIDE.md`
- Check current setup: `AWS-INFRASTRUCTURE.md`
- Review server investigation: `INVESTIGATION-RESULTS.md`

---

**Ready to start? Let's do this! 🚀**


