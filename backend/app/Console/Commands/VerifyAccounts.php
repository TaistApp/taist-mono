<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Temporary Verification Account Management
 *
 * Creates and cleans up temporary test accounts for production/staging verification.
 * Accounts use the email pattern "prodverify+*@taist.app" so they are:
 *   - Clearly distinguishable from real users
 *   - Easy to find and clean up by email pattern
 *   - Never confused with Maestro test users (maestro+*@test.com)
 *
 * Usage:
 *   php artisan verify:accounts create          # Create temp customer + chef
 *   php artisan verify:accounts create --json   # Output as JSON (for scripts)
 *   php artisan verify:accounts status          # Check if any exist
 *   php artisan verify:accounts cleanup         # Delete all prodverify accounts
 */
class VerifyAccounts extends Command
{
    protected $signature = 'verify:accounts {action : create|cleanup|status} {--json : Output in JSON format} {--max-age= : For cleanup: only remove accounts older than N minutes}';

    protected $description = 'Manage temporary verification accounts (prodverify+*@taist.app)';

    private const EMAIL_PATTERN = 'prodverify+%@taist.app';
    private const CUSTOMER_EMAIL = 'prodverify+customer@taist.app';
    private const CHEF_EMAIL = 'prodverify+chef@taist.app';

    public function __construct()
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $action = $this->argument('action');

        switch ($action) {
            case 'create':
                return $this->createAccounts();
            case 'cleanup':
                return $this->cleanupAccounts();
            case 'status':
                return $this->showStatus();
            default:
                $this->error("Unknown action: {$action}. Use create, cleanup, or status.");
                return 1;
        }
    }

    private function createAccounts(): int
    {
        // Guard: prevent double-creation
        $existing = DB::table('tbl_users')
            ->where('email', 'like', self::EMAIL_PATTERN)
            ->count();

        if ($existing > 0) {
            $this->error("Verification accounts already exist ({$existing} found). Run cleanup first.");
            return 1;
        }

        $timestamp = date('Y-m-d H:i:s');
        $customerToken = Str::random(60);
        $chefToken = Str::random(60);
        $password = bcrypt(Str::random(32)); // random password, not used for login

        // ── Create Customer ──
        $customerId = DB::table('tbl_users')->insertGetId([
            'first_name'     => 'ProdVerify',
            'last_name'      => 'Customer',
            'email'          => self::CUSTOMER_EMAIL,
            'password'       => $password,
            'phone'          => '+10000009901',
            'birthday'       => null,
            'user_type'      => 1,
            'verified'       => 1,
            'is_pending'     => 0,
            'quiz_completed' => 1,
            'bio'            => null,
            'address'        => '100 N State St',
            'city'           => 'Chicago',
            'state'          => 'IL',
            'zip'            => '60602',
            'latitude'       => '41.8838',
            'longitude'      => '-87.6278',
            'photo'          => '',
            'api_token'      => $customerToken,
            'code'           => '',
            'token_date'     => '',
            'fcm_token'      => '',
            'is_online'      => 0,
            'created_at'     => $timestamp,
            'updated_at'     => $timestamp,
        ]);

        // ── Create Chef ──
        $chefId = DB::table('tbl_users')->insertGetId([
            'first_name'     => 'ProdVerify',
            'last_name'      => 'Chef',
            'email'          => self::CHEF_EMAIL,
            'password'       => $password,
            'phone'          => '+10000009902',
            'birthday'       => null,
            'user_type'      => 2,
            'verified'       => 1,
            'is_pending'     => 0,
            'quiz_completed' => 1,
            'bio'            => 'Temporary verification chef — will be auto-deleted.',
            'address'        => '500 N Michigan Ave',
            'city'           => 'Chicago',
            'state'          => 'IL',
            'zip'            => '60611',
            'latitude'       => '41.8910',
            'longitude'      => '-87.6244',
            'photo'          => '',
            'api_token'      => $chefToken,
            'code'           => '',
            'token_date'     => '',
            'fcm_token'      => '',
            'is_online'      => 0,
            'created_at'     => $timestamp,
            'updated_at'     => $timestamp,
        ]);

        // ── Create Chef Availability (all 7 days, 08:00-22:00) ──
        DB::table('tbl_availabilities')->insert([
            'user_id'              => $chefId,
            'bio'                  => 'Temporary verification chef — will be auto-deleted.',
            'monday_start'         => '08:00', 'monday_end'    => '22:00',
            'tuesday_start'        => '08:00', 'tuesday_end'   => '22:00',
            'wednesday_start'      => '08:00', 'wednesday_end'  => '22:00',
            'thursday_start'       => '08:00', 'thursday_end'   => '22:00',
            'friday_start'         => '08:00', 'friday_end'     => '22:00',
            'saterday_start'       => '09:00', 'saterday_end'   => '22:00',
            'sunday_start'         => '09:00', 'sunday_end'     => '21:00',
            'minimum_order_amount' => 20.00,
            'max_order_distance'   => 15.0,
            'created_at'           => $timestamp,
            'updated_at'           => $timestamp,
        ]);

        // ── Create Chef Menu Item ──
        DB::table('tbl_menus')->insert([
            'user_id'        => $chefId,
            'title'          => 'Verification Test Meal',
            'description'    => 'Temporary menu item for production verification. Will be auto-deleted.',
            'price'          => 15.00,
            'serving_size'   => 1,
            'meals'          => 'Lunch,Dinner',
            'category_ids'   => '5',
            'allergens'      => '',
            'appliances'     => '',
            'estimated_time' => 15,
            'is_live'        => 1,
            'created_at'     => $timestamp,
            'updated_at'     => $timestamp,
        ]);

        if ($this->option('json')) {
            $this->line(json_encode([
                'customer_id'    => $customerId,
                'customer_email' => self::CUSTOMER_EMAIL,
                'customer_token' => $customerToken,
                'chef_id'        => $chefId,
                'chef_email'     => self::CHEF_EMAIL,
                'chef_token'     => $chefToken,
            ], JSON_PRETTY_PRINT));
        } else {
            $this->info("Verification accounts created:");
            $this->line("  Customer: ID={$customerId}  email=" . self::CUSTOMER_EMAIL);
            $this->line("  Chef:     ID={$chefId}  email=" . self::CHEF_EMAIL);
            $this->line("  Customer token: {$customerToken}");
            $this->line("  Chef token:     {$chefToken}");
            $this->line("");
            $this->info("Run 'php artisan verify:accounts cleanup' when done.");
        }

        return 0;
    }

    private function cleanupAccounts(): int
    {
        $query = DB::table('tbl_users')
            ->where('email', 'like', self::EMAIL_PATTERN);

        // If --max-age is set, only clean up accounts older than N minutes
        // (so a scheduled cleanup won't nuke an active verification session)
        $maxAge = $this->option('max-age');
        if ($maxAge !== null) {
            $cutoff = date('Y-m-d H:i:s', strtotime("-{$maxAge} minutes"));
            $query->where('created_at', '<', $cutoff);
        }

        $users = $query->get(['id', 'email', 'user_type']);

        if ($users->isEmpty()) {
            $msg = 'No verification accounts found. Nothing to clean up.';
            if ($this->option('json')) {
                $this->line(json_encode(['deleted' => 0, 'message' => $msg]));
            } else {
                $this->info($msg);
            }
            return 0;
        }

        $userIds = $users->pluck('id')->toArray();

        // Delete related records first
        $menusDeleted = DB::table('tbl_menus')->whereIn('user_id', $userIds)->delete();
        $availDeleted = DB::table('tbl_availabilities')->whereIn('user_id', $userIds)->delete();
        $overridesDeleted = DB::table('tbl_availability_overrides')->whereIn('chef_id', $userIds)->delete();
        $usersDeleted = DB::table('tbl_users')->whereIn('id', $userIds)->delete();

        if ($this->option('json')) {
            $this->line(json_encode([
                'deleted' => $usersDeleted,
                'menus_deleted' => $menusDeleted,
                'availabilities_deleted' => $availDeleted,
                'overrides_deleted' => $overridesDeleted,
                'user_ids' => $userIds,
            ], JSON_PRETTY_PRINT));
        } else {
            $this->info("Cleaned up {$usersDeleted} verification account(s):");
            foreach ($users as $user) {
                $this->line("  ID={$user->id}  {$user->email}");
            }
            $this->line("  Related: {$menusDeleted} menu(s), {$availDeleted} availability record(s), {$overridesDeleted} override(s)");
        }

        return 0;
    }

    private function showStatus(): int
    {
        $users = DB::table('tbl_users')
            ->where('email', 'like', self::EMAIL_PATTERN)
            ->get(['id', 'email', 'user_type', 'created_at']);

        if ($users->isEmpty()) {
            $msg = 'No verification accounts found.';
            if ($this->option('json')) {
                $this->line(json_encode(['count' => 0, 'accounts' => []]));
            } else {
                $this->info($msg);
            }
            return 0;
        }

        if ($this->option('json')) {
            $this->line(json_encode([
                'count' => $users->count(),
                'accounts' => $users->map(function ($u) {
                    return [
                        'id' => $u->id,
                        'email' => $u->email,
                        'type' => $u->user_type == 1 ? 'customer' : 'chef',
                        'created_at' => $u->created_at,
                    ];
                })->values(),
            ], JSON_PRETTY_PRINT));
        } else {
            $this->info("Found {$users->count()} verification account(s):");
            foreach ($users as $user) {
                $type = $user->user_type == 1 ? 'customer' : 'chef';
                $this->line("  ID={$user->id}  {$user->email}  ({$type})  created={$user->created_at}");
            }
        }

        return 0;
    }
}
