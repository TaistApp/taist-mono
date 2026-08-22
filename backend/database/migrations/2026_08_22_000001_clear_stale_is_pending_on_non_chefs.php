<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Clears the stale chef-application flag from non-chef accounts.
 *
 * `is_pending` only ever means "chef application awaiting admin approval".
 * But every signup before Dec 2025 went through the old Account screen
 * (`frontend/app/screens/common/account/index.tsx` → handleSignUp), which set
 * `is_pending = 1` on the register payload regardless of the selected role. So
 * a large cohort of legitimate early customers has `is_pending = 1` on a
 * `user_type = 1` row.
 *
 * That was harmless until the login gate added in 3e78641 (May 2026) started
 * rejecting `is_pending = 1 && user_type != 2` with "Your account is currently
 * deactivated" — locking every one of those customers out of the app. The gate
 * is removed in the same change as this migration; this cleans the data so the
 * stale flag stops leaking into the other places that read it (the social feed
 * query filters on `is_pending = 0`, and the admin Customers list renders the
 * account as Pending).
 *
 * Only non-chef rows are touched — chefs legitimately sit at `is_pending = 1`
 * while onboarding. No admin UI deactivates a customer this way (the Customers
 * page offers Active / Rejected / Delete, which write `verified`), so there is
 * no intentional `user_type != 2 && is_pending = 1` state to preserve.
 *
 * Runs automatically on deploy via `php artisan migrate --force` (see Procfile).
 */
return new class extends Migration
{
    public function up(): void
    {
        $affected = DB::table('tbl_users')
            ->where('is_pending', 1)
            ->where(function ($q) {
                $q->where('user_type', '!=', 2)->orWhereNull('user_type');
            })
            ->update(['is_pending' => 0]);

        Log::info('Cleared stale is_pending on non-chef accounts', ['rows' => $affected]);
    }

    public function down(): void
    {
        // Not reversible: the original rows are indistinguishable from customers
        // that always had is_pending = 0, and the flag carried no meaning for
        // non-chefs in the first place.
    }
};
