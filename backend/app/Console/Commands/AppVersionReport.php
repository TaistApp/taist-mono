<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Which app versions our active users are on — run before raising MIN_VERSION.
 *
 *   php artisan app:versions                 # breakdown for the last 30 days
 *   php artisan app:versions --min=32.4.8    # + share at/above 32.4.8, and the
 *                                            #   chefs who would be locked out
 *
 * Data comes from the RecordAppVersion middleware. Blind spot: Android builds
 * before 32.4.8 send no version, so those users are missing entirely until
 * they update — treat the percentages as iOS-heavy until 32.4.8 is out.
 */
class AppVersionReport extends Command
{
    protected $signature = 'app:versions
                            {--days=30 : Only count users seen in this many days}
                            {--min= : Version you are thinking of setting MIN_VERSION to}';

    protected $description = 'Show which app versions active users are on (check before raising MIN_VERSION)';

    public function handle()
    {
        $days = max(1, (int) $this->option('days'));
        $min = $this->option('min');

        $users = DB::table('tbl_users')
            ->whereNotNull('app_seen_at')
            ->where('app_seen_at', '>=', now()->subDays($days)->toDateTimeString())
            ->get(['id', 'first_name', 'last_name', 'email', 'user_type', 'app_version', 'app_build', 'app_platform', 'app_seen_at']);

        $this->info("Users seen in the last {$days} days: {$users->count()}");
        $this->line('(Android builds before 32.4.8 report nothing, so they are not counted.)');

        if ($users->isEmpty()) {
            return 0;
        }

        $rows = $users
            ->groupBy(fn ($u) => implode('|', [$u->app_version ?? 'unknown', $u->app_platform ?? '?', self::role($u)]))
            ->map(function ($group, $key) use ($users) {
                [$version, $platform, $role] = explode('|', $key);
                return [$version, $platform, $role, $group->count(), self::pct($group->count(), $users->count())];
            })
            ->values()
            ->all();
        // Newest version first; "unknown" last.
        usort($rows, fn ($a, $b) => version_compare($b[0] === 'unknown' ? '0' : $b[0], $a[0] === 'unknown' ? '0' : $a[0])
            ?: strcmp($a[1] . $a[2], $b[1] . $b[2]));

        $this->table(['Version', 'Platform', 'Role', 'Users', 'Share'], $rows);

        if ($min) {
            $this->newLine();
            $this->info("At or above {$min}:");
            foreach (['all' => $users, 'chefs' => $users->filter(fn ($u) => self::role($u) === 'chef'), 'customers' => $users->filter(fn ($u) => self::role($u) === 'customer')] as $label => $set) {
                $ok = $set->filter(fn ($u) => self::atLeast($u->app_version, $min))->count();
                $this->line(sprintf('  %-10s %d / %d  (%s)', $label, $ok, $set->count(), self::pct($ok, $set->count())));
            }

            $stuck = $users->filter(fn ($u) => self::role($u) === 'chef' && !self::atLeast($u->app_version, $min));
            if ($stuck->isNotEmpty()) {
                $this->newLine();
                $this->warn("Chefs below {$min} (would be locked out):");
                $this->table(
                    ['ID', 'Name', 'Email', 'Version', 'Platform', 'Last seen'],
                    $stuck->map(fn ($u) => [$u->id, trim("{$u->first_name} {$u->last_name}"), $u->email, $u->app_version ?? "build {$u->app_build}", $u->app_platform, $u->app_seen_at])->values()->all()
                );
            }
        }

        return 0;
    }

    private static function role($user): string
    {
        return (int) $user->user_type === 2 ? 'chef' : 'customer';
    }

    private static function atLeast(?string $version, string $min): bool
    {
        return $version !== null && version_compare($version, $min, '>=');
    }

    private static function pct(int $part, int $whole): string
    {
        return $whole === 0 ? '-' : round(100 * $part / $whole, 1) . '%';
    }
}
