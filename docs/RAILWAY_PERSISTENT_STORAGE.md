# Railway Persistent Storage for Uploads

## Problem

Railway uses an ephemeral filesystem. When you redeploy:
1. A new container is built from the git repo
2. Only files committed to git exist
3. Any files uploaded at runtime (user photos, etc.) are **lost**

This caused profile photos to disappear after each deployment.

## Solution

We added a Railway Volume to persist the uploads directory.

### Volume Configuration

| Setting | Value |
|---------|-------|
| Volume Name | `taist-mono-volume` |
| Attached To | `taist-mono` (backend service) |
| Mount Path | `/app/public/assets/uploads` |
| Storage | 5GB |

### How It Works

1. The volume mounts at `/app/public/assets/uploads`
2. This overlays the git-committed files in `backend/public/assets/uploads/`
3. Any files written to this path persist across deployments
4. Photos uploaded by users are saved to `assets/uploads/images/`

## Managing the Volume

### View volumes
```bash
railway volume list
```

### Check storage usage
The `railway volume list` command shows current usage vs capacity.

### Delete volume (caution - deletes all data!)
```bash
railway volume delete
```

## Important Notes

1. **Initial seed files**: Files committed to git in `backend/public/assets/uploads/` will NOT be available once the volume mounts (volume overlays the directory). If you need seed files, upload them manually after deployment.

2. **Backups**: Railway volumes don't have automatic backups. Consider periodic manual backups for critical data.

3. **Multiple environments**: Each environment (staging, production) needs its own volume.

## Date Added

December 29, 2025

## Related Files

- Photo upload handler: `backend/app/Http/Controllers/MapiController.php` (lines 372, 2938)
- Photo URL helper: `backend/app/Helpers/AppHelper.php`
- Frontend image display: `frontend/app/components/styledProfileImage/`
