# Static Assets Migration Plan

## Date: December 29, 2025

## Problem

The Railway volume mounts at `/app/public/assets/uploads`, which overlays (hides) the git-committed static images that were in that folder. This affects:

- Appliance icons (sink, stove, oven, microwave, grills, toaster)
- Logo images used in emails
- Stripe guide image

These static assets should NOT be in the uploads folder - that folder should only contain user-generated content like profile photos.

## Current State

```
backend/public/assets/uploads/          ← VOLUME MOUNTED HERE
├── images/
│   ├── sink.png                        ← HIDDEN (static, should be in git)
│   ├── stove.png                       ← HIDDEN (static)
│   ├── oven.png                        ← HIDDEN (static)
│   ├── microwave.png                   ← HIDDEN (static)
│   ├── grill.png                       ← HIDDEN (static)
│   ├── gas_grill.png                   ← HIDDEN (static)
│   ├── charcoal_grill.png              ← HIDDEN (static)
│   ├── toaster.png                     ← HIDDEN (static)
│   ├── logo.png                        ← HIDDEN (static)
│   ├── logo-2.png                      ← HIDDEN (static, used in emails)
│   ├── stripe_guide.jpeg               ← HIDDEN (static)
│   └── user_photo_*.jpg/png            ← These SHOULD be here (user uploads)
```

## Proposed Solution

Move static assets to a new location outside the volume mount path.

### New Structure

```
backend/public/assets/
├── images/                             ← NEW: Static assets (served from git)
│   ├── appliances/
│   │   ├── sink.png
│   │   ├── stove.png
│   │   ├── oven.png
│   │   ├── microwave.png
│   │   ├── grill.png
│   │   ├── gas_grill.png
│   │   ├── charcoal_grill.png
│   │   └── toaster.png
│   ├── logo.png
│   ├── logo-2.png
│   └── stripe_guide.jpeg
│
└── uploads/                            ← VOLUME: User-generated content only
    └── images/
        └── user_photo_*.jpg/png
```

## Migration Steps

### 1. Create new directory structure
```bash
mkdir -p backend/public/assets/images/appliances
```

### 2. Move static files
```bash
# Appliances
mv backend/public/assets/uploads/images/sink.png backend/public/assets/images/appliances/
mv backend/public/assets/uploads/images/stove.png backend/public/assets/images/appliances/
mv backend/public/assets/uploads/images/oven.png backend/public/assets/images/appliances/
mv backend/public/assets/uploads/images/microwave.png backend/public/assets/images/appliances/
mv backend/public/assets/uploads/images/grill.png backend/public/assets/images/appliances/
mv backend/public/assets/uploads/images/gas_grill.png backend/public/assets/images/appliances/
mv backend/public/assets/uploads/images/charcoal_grill.png backend/public/assets/images/appliances/
mv backend/public/assets/uploads/images/toaster.png backend/public/assets/images/appliances/

# Other static assets
mv backend/public/assets/uploads/images/logo.png backend/public/assets/images/
mv backend/public/assets/uploads/images/logo-2.png backend/public/assets/images/
mv backend/public/assets/uploads/images/stripe_guide.jpeg backend/public/assets/images/
```

### 3. Update frontend references

**Files to update:**
- Appliance selector component (wherever icons are loaded)
- Any hardcoded image URLs

**Change from:**
```
/assets/uploads/images/sink.png
```

**To:**
```
/assets/images/appliances/sink.png
```

### 4. Update backend references

**Files to update:**
- `backend/app/Http/Controllers/MapiController.php` - email templates using logo-2.png

**Change from:**
```php
src='http://18.216.154.184/assets/uploads/images/logo-2.png'
```

**To:**
```php
src='https://api-staging.taist.app/assets/images/logo-2.png'
```

(Note: Should use environment variable for base URL)

### 5. Clean up old location

After migration, the uploads/images folder in git should only contain user photos (which will be ignored since volume overlays it anyway).

## Testing

1. Deploy to staging
2. Verify appliance icons display on "Add Menu Item" screen
3. Verify profile photo upload still works
4. Verify email logos display correctly

## Rollback

If issues occur, revert the git commits. The volume data (user photos) is unaffected.
