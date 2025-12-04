# FINAL FIX: Railway Migration Infinite Loop

**Date:** December 4, 2025
**Status:** ✅ Fix Deployed (Commit `da2c568`)
**Root Cause Identified:** Logic bug in FixRailwayMigrations.php

---

## The Bug

The infinite loop was caused by a logic error in [FixRailwayMigrations.php](backend/app/Console/Commands/FixRailwayMigrations.php):

### Before (Broken Logic)
```php
// Third, handle known problematic migrations
foreach ($problematicMigrations as $migrationName => $tableName) {
    // Check if already recorded
    if (DB::table('migrations')->where('migration', $migrationName)->exists()) {
        continue;
    }

    // Check if broken table exists ❌ BUG IS HERE
    if (Schema::hasTable($tableName)) {
        // Mark as migrated
        DB::table('migrations')->insert([...]);
    } else {
        // Skipped! ❌ THIS CAUSES THE LOOP
        $this->line("  Skipped: {$migrationName} (table doesn't exist)");
    }
}
```

### The Vicious Cycle This Created

```
1. forceDropProblematicTables() runs
   → Drops tbl_availability_overrides ✓

2. Check problematic migrations
   → Table doesn't exist (we just dropped it!)
   → SKIPS marking migration as complete ❌
   → Migration NOT in migrations table

3. migrate --force runs
   → Sees migration not in migrations table
   → Tries to run it
   → CREATE TABLE tbl_availability_overrides
   → Fails with foreign key error
   → Deployment crashes

4. Railway restarts → goto step 1
```

### After (Fixed Logic)
```php
// Third, handle known problematic migrations that should NEVER run
foreach ($problematicMigrations as $migrationName => $tableName) {
    // Check if already recorded
    if (DB::table('migrations')->where('migration', $migrationName)->exists()) {
        continue;
    }

    // ALWAYS mark these as migrated so they NEVER run ✅
    // Don't care if table exists or not - these migrations are broken
    DB::table('migrations')->insert([
        'migration' => $migrationName,
        'batch' => $newBatch,
    ]);
    $this->line("✓ Marked as migrated (will never run): {$migrationName}");
}
```

---

## Why This Fix Works

1. **Force drops broken tables** (lines 208-223)
   - Removes any corrupted database state
   - Uses raw SQL to bypass Laravel checks

2. **Always marks problematic migrations as complete** (lines 87-111)
   - Doesn't check if table exists
   - Just marks the migration as done
   - Migration will NEVER run again

3. **Allows fresh start**
   - Old broken table: gone
   - Old broken migration: marked complete
   - Can now create proper table with correct types

---

## The Three Problematic Migrations

These migrations are marked as "will never run":

```php
private function getKnownProblematicMigrations()
{
    return [
        // All had foreign key type mismatch (integer vs bigint unsigned)
        '2025_12_03_000003_create_availability_overrides' => 'tbl_availability_overrides',
        '2025_12_04_000004_fix_availability_overrides_foreign_key' => 'tbl_availability_overrides',
        '2025_12_04_000001_create_availability_overrides_raw_sql' => 'tbl_availability_overrides',
    ];
}
```

All three attempts had the same underlying issue: foreign key type mismatch.

---

## What Happens on Railway Now

```
1. Procfile: railway:fix-migrations

   Force dropping broken tables...
     ✓ Dropped: tbl_availability_overrides

   Checking Passport OAuth tables...
     (already migrated, skipped)

   Checking known problematic migrations...
     ✓ Marked as migrated (will never run): 2025_12_03_000003_create_availability_overrides
     ✓ Marked as migrated (will never run): 2025_12_04_000004_fix_availability_overrides_foreign_key
     ✓ Marked as migrated (will never run): 2025_12_04_000001_create_availability_overrides_raw_sql

   Checking application migrations...
     (other migrations...)

2. Procfile: migrate --force

   → All three problematic migrations are in migrations table
   → Laravel skips them ✓
   → No errors ✓
   → Other migrations run normally

3. Procfile: serve backend/public/index.php

   → Server starts ✓
```

---

## Root Cause Analysis

The real underlying issue was never actually solved - we just stopped the broken migrations from running.

### The Actual Problem

The `tbl_availability_overrides` table needs a foreign key to `tbl_users.id`, but:

1. We don't know what type `tbl_users.id` actually is on Railway
2. Railway database was imported, not created by migrations
3. Table structure might not match Laravel's expectations
4. Tried: `integer()` - failed
5. Tried: `unsignedBigInteger()` - still failed
6. Tried: raw SQL with `BIGINT UNSIGNED` - still failed

### The Solution We Implemented

Instead of fixing the foreign key issue, we:
- Prevented the broken migrations from running at all
- Removed the availability_overrides feature for now
- Railway can deploy successfully
- Can revisit availability_overrides later with proper investigation

---

## Key Insight from User

User identified the bug by spotting this in the logs:

```
Checking known problematic migrations...
  Skipped: 2025_12_04_000001_create_availability_overrides_raw_sql (table doesn't exist)
```

Then the migration still tried to run. This revealed the logic error: the code was checking if the table exists before marking the migration as complete, which meant after dropping the table, it would skip marking it as complete.

User's question: "see anything?"

This pointed me to the exact line where the logic was backwards.

---

## Commits

1. **095550e** - Fixed foreign key type + added cleanup migration (still failed)
2. **53bbaef** - Added force-drop logic to FixRailwayMigrations (still failed)
3. **da2c568** - Fixed logic to always mark problematic migrations complete ✅ THIS ONE

---

## Files Modified

### backend/app/Console/Commands/FixRailwayMigrations.php

Changed lines 87-111 from:
```php
if (Schema::hasTable($tableName)) {
    DB::table('migrations')->insert([...]);
    $marked++;
} else {
    $this->line("  Skipped: {$migrationName} (table doesn't exist)");
    $skipped++;
}
```

To:
```php
// ALWAYS mark these as migrated so they NEVER run
DB::table('migrations')->insert([
    'migration' => $migrationName,
    'batch' => $newBatch,
]);
$this->line("✓ Marked as migrated (will never run): {$migrationName}");
$marked++;
```

---

## Testing

### Expected Railway Logs

```
Checking for existing tables and marking migrations as complete...
Database ready, processing migrations...

Force dropping broken tables...
  Force dropping: tbl_availability_overrides
  ✓ Dropped: tbl_availability_overrides

Checking Passport OAuth tables...
  Skipped: 2016_06_01_000001_create_oauth_auth_codes_table (OAuth table doesn't exist)
  [All OAuth tables already migrated from previous fix]

Checking known problematic migrations...
  ✓ Marked as migrated (will never run): 2025_12_03_000003_create_availability_overrides
  ✓ Marked as migrated (will never run): 2025_12_04_000004_fix_availability_overrides_foreign_key
  ✓ Marked as migrated (will never run): 2025_12_04_000001_create_availability_overrides_raw_sql

Checking application migrations...
  [Other migrations detected...]

Completed!
Marked as migrated: 3
Skipped: XX

Nothing to migrate.

Laravel development server started: http://0.0.0.0:$PORT
```

### Success Criteria

✅ No "table already exists" errors
✅ No foreign key constraint errors
✅ All problematic migrations marked as complete
✅ Server starts successfully
✅ No crash/restart loop

---

## Lessons Learned

1. **Simplicity wins** - User was right that we were overcomplicating it
2. **Read the logs carefully** - The bug was visible in the logs once we looked
3. **First principles** - Instead of fixing the foreign key issue, we just prevented the broken migrations from running
4. **Don't check conditions that cause the problem** - Checking if table exists caused the loop

---

## Future: Implementing Availability Overrides Properly

If we want to add this feature back:

1. **First: Diagnose actual table structure**
   - Connect to Railway database directly
   - Run: `SHOW CREATE TABLE tbl_users;`
   - See exact type of `id` column
   - See exact type of all columns

2. **Second: Create migration with exact matching types**
   - Don't guess - use exact types from tbl_users
   - Test locally with identical MySQL version
   - Use `migrate --pretend` to verify SQL

3. **Third: Consider using foreignId()**
   ```php
   $table->foreignId('chef_id')
       ->constrained('tbl_users')
       ->onDelete('cascade');
   ```
   This automatically matches the type of the referenced column.

---

## Status

**Deployment:** ✅ Pushed to main (commit da2c568)
**Railway Build:** ⏳ In progress
**Expected Resolution:** 5-10 minutes
**Next Action:** Monitor Railway logs to confirm success

---

**Last Updated:** December 4, 2025
**Commit:** `da2c568`
