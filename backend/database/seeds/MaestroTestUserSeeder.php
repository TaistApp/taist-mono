<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Maestro E2E Test Users
 *
 * Pre-seeded accounts for Maestro UI testing.
 * All passwords: "maestro123"
 * All emails: maestro+{role}@test.com
 * All phones: +1312555{3xxx} (distinct range from manual test users)
 *
 * IDs 100-119 are reserved for Maestro test users to avoid conflicts.
 *
 * Usage:
 *   php artisan db:seed --class=MaestroTestUserSeeder
 *
 * These users are identifiable by the "maestro+" email prefix so they
 * can be excluded from admin dashboards / user lists if needed:
 *   WHERE email NOT LIKE 'maestro+%@test.com'
 */
class MaestroTestUserSeeder extends Seeder
{
    private string $password;
    private string $timestamp;

    public function run()
    {
        $this->password = bcrypt('maestro123');
        $this->timestamp = date('Y-m-d H:i:s');

        // Clean out any previous Maestro test users (idempotent)
        DB::table('tbl_users')->where('email', 'like', 'maestro+%@test.com')->delete();

        echo "Seeding Maestro test users...\n";

        // ── CUSTOMERS ───────────────────────────────────────────
        $this->seedUser([
            'id'         => 100,
            'first_name' => 'Test',
            'last_name'  => 'Customer',
            'email'      => 'maestro+customer1@test.com',
            'phone'      => '+13125553001',
            'user_type'  => 1,
            'verified'   => 1,
            'address'    => '100 N State St',
            'city'       => 'Chicago',
            'state'      => 'IL',
            'zip'        => '60602',
            'latitude'   => '41.8838',
            'longitude'  => '-87.6278',
        ]);

        $this->seedUser([
            'id'         => 101,
            'first_name' => 'Browse',
            'last_name'  => 'Customer',
            'email'      => 'maestro+customer2@test.com',
            'phone'      => '+13125553002',
            'user_type'  => 1,
            'verified'   => 1,
            'address'    => '200 W Adams St',
            'city'       => 'Chicago',
            'state'      => 'IL',
            'zip'        => '60606',
            'latitude'   => '41.8796',
            'longitude'  => '-87.6346',
        ]);

        $this->seedUser([
            'id'         => 102,
            'first_name' => 'Order',
            'last_name'  => 'Customer',
            'email'      => 'maestro+customer3@test.com',
            'phone'      => '+13125553003',
            'user_type'  => 1,
            'verified'   => 1,
            'address'    => '300 E Randolph St',
            'city'       => 'Chicago',
            'state'      => 'IL',
            'zip'        => '60601',
            'latitude'   => '41.8847',
            'longitude'  => '-87.6175',
        ]);

        $this->seedUser([
            'id'         => 103,
            'first_name' => 'New',
            'last_name'  => 'Customer',
            'email'      => 'maestro+customer-new@test.com',
            'phone'      => '+13125553004',
            'user_type'  => 1,
            'verified'   => 1,
            'address'    => '',
            'city'       => '',
            'state'      => '',
            'zip'        => '',
            'latitude'   => '',
            'longitude'  => '',
        ]);

        // ── CHEFS (verified & active) ───────────────────────────
        $this->seedUser([
            'id'             => 110,
            'first_name'     => 'Active',
            'last_name'      => 'Chef',
            'email'          => 'maestro+chef1@test.com',
            'phone'          => '+13125553010',
            'user_type'      => 2,
            'verified'       => 1,
            'is_pending'     => 0,
            'quiz_completed' => 1,
            'bio'            => 'Maestro test chef — active and verified.',
            'address'        => '500 N Michigan Ave',
            'city'           => 'Chicago',
            'state'          => 'IL',
            'zip'            => '60611',
            'latitude'       => '41.8910',
            'longitude'      => '-87.6244',
        ]);

        $this->seedUser([
            'id'             => 111,
            'first_name'     => 'Menu',
            'last_name'      => 'Chef',
            'email'          => 'maestro+chef2@test.com',
            'phone'          => '+13125553011',
            'user_type'      => 2,
            'verified'       => 1,
            'is_pending'     => 0,
            'quiz_completed' => 1,
            'bio'            => 'Maestro test chef — for menu management testing.',
            'address'        => '600 W Chicago Ave',
            'city'           => 'Chicago',
            'state'          => 'IL',
            'zip'            => '60654',
            'latitude'       => '41.8968',
            'longitude'      => '-87.6445',
        ]);

        $this->seedUser([
            'id'             => 112,
            'first_name'     => 'Schedule',
            'last_name'      => 'Chef',
            'email'          => 'maestro+chef3@test.com',
            'phone'          => '+13125553012',
            'user_type'      => 2,
            'verified'       => 1,
            'is_pending'     => 0,
            'quiz_completed' => 1,
            'bio'            => 'Maestro test chef — for availability/schedule testing.',
            'address'        => '700 S Dearborn St',
            'city'           => 'Chicago',
            'state'          => 'IL',
            'zip'            => '60605',
            'latitude'       => '41.8720',
            'longitude'      => '-87.6290',
        ]);

        // ── CHEFS (edge-case states) ────────────────────────────
        $this->seedUser([
            'id'             => 113,
            'first_name'     => 'Pending',
            'last_name'      => 'Chef',
            'email'          => 'maestro+chef-pending@test.com',
            'phone'          => '+13125553013',
            'user_type'      => 2,
            'verified'       => 0, // pending verification
            'is_pending'     => 1,
            'quiz_completed' => 0,
            'bio'            => 'Maestro test chef — pending approval.',
            'address'        => '800 W Lake St',
            'city'           => 'Chicago',
            'state'          => 'IL',
            'zip'            => '60607',
            'latitude'       => '41.8855',
            'longitude'      => '-87.6485',
        ]);

        $this->seedUser([
            'id'             => 114,
            'first_name'     => 'NoQuiz',
            'last_name'      => 'Chef',
            'email'          => 'maestro+chef-noquiz@test.com',
            'phone'          => '+13125553014',
            'user_type'      => 2,
            'verified'       => 1,
            'is_pending'     => 0,
            'quiz_completed' => 0, // hasn't done safety quiz
            'bio'            => 'Maestro test chef — quiz not completed.',
            'address'        => '900 N Clark St',
            'city'           => 'Chicago',
            'state'          => 'IL',
            'zip'            => '60610',
            'latitude'       => '41.9005',
            'longitude'      => '-87.6315',
        ]);

        // ── CHEF AVAILABILITIES ─────────────────────────────────
        echo "Seeding Maestro chef availabilities...\n";

        // Clean previous
        DB::table('tbl_availabilities')->whereIn('user_id', [110, 111, 112])->delete();

        // Active Chef (110) - available every day
        DB::table('tbl_availabilities')->insert([
            'user_id'          => 110,
            'bio'              => 'Maestro test chef — active and verified.',
            'monday_start'     => '08:00', 'monday_end'    => '22:00',
            'tuesday_start'    => '08:00', 'tuesday_end'   => '22:00',
            'wednesday_start'  => '08:00', 'wednesday_end'  => '22:00',
            'thursday_start'   => '08:00', 'thursday_end'   => '22:00',
            'friday_start'     => '08:00', 'friday_end'     => '23:00',
            'saterday_start'   => '09:00', 'saterday_end'   => '23:00',
            'sunday_start'     => '09:00', 'sunday_end'     => '21:00',
            'minimum_order_amount' => 20.00,
            'max_order_distance'   => 15.0,
            'created_at'       => $this->timestamp,
            'updated_at'       => $this->timestamp,
        ]);

        // Menu Chef (111) - weekdays only
        DB::table('tbl_availabilities')->insert([
            'user_id'          => 111,
            'bio'              => 'Maestro test chef — for menu management testing.',
            'monday_start'     => '10:00', 'monday_end'    => '20:00',
            'tuesday_start'    => '10:00', 'tuesday_end'   => '20:00',
            'wednesday_start'  => '10:00', 'wednesday_end'  => '20:00',
            'thursday_start'   => '10:00', 'thursday_end'   => '20:00',
            'friday_start'     => '10:00', 'friday_end'     => '21:00',
            'saterday_start'   => null,    'saterday_end'   => null,
            'sunday_start'     => null,    'sunday_end'     => null,
            'minimum_order_amount' => 25.00,
            'max_order_distance'   => 10.0,
            'created_at'       => $this->timestamp,
            'updated_at'       => $this->timestamp,
        ]);

        // Schedule Chef (112) - every day, narrow hours
        DB::table('tbl_availabilities')->insert([
            'user_id'          => 112,
            'bio'              => 'Maestro test chef — for availability/schedule testing.',
            'monday_start'     => '12:00', 'monday_end'    => '18:00',
            'tuesday_start'    => '12:00', 'tuesday_end'   => '18:00',
            'wednesday_start'  => '12:00', 'wednesday_end'  => '18:00',
            'thursday_start'   => '12:00', 'thursday_end'   => '18:00',
            'friday_start'     => '12:00', 'friday_end'     => '20:00',
            'saterday_start'   => '12:00', 'saterday_end'   => '20:00',
            'sunday_start'     => '12:00', 'sunday_end'     => '17:00',
            'minimum_order_amount' => 15.00,
            'max_order_distance'   => 20.0,
            'created_at'       => $this->timestamp,
            'updated_at'       => $this->timestamp,
        ]);

        // ── MENU ITEMS for Active Chef (110) ────────────────────
        echo "Seeding Maestro chef menus...\n";

        DB::table('tbl_menus')->where('user_id', 110)->delete();

        DB::table('tbl_menus')->insert([
            'user_id'        => 110,
            'title'          => 'Test Burger Combo',
            'description'    => 'Classic burger with fries and a drink. For Maestro testing.',
            'price'          => 18.00,
            'serving_size'   => 1,
            'meals'          => 'Lunch,Dinner',
            'category_ids'   => '5', // American
            'allergens'      => '1,2', // Gluten, Dairy
            'appliances'     => '2', // Stove
            'estimated_time' => 20,
            'is_live'        => 1,
            'created_at'     => $this->timestamp,
            'updated_at'     => $this->timestamp,
        ]);

        DB::table('tbl_menus')->insert([
            'user_id'        => 110,
            'title'          => 'Test Caesar Salad',
            'description'    => 'Fresh romaine with house dressing. For Maestro testing.',
            'price'          => 12.00,
            'serving_size'   => 1,
            'meals'          => 'Lunch',
            'category_ids'   => '5',
            'allergens'      => '2,3', // Dairy, Eggs
            'appliances'     => '',
            'estimated_time' => 10,
            'is_live'        => 1,
            'created_at'     => $this->timestamp,
            'updated_at'     => $this->timestamp,
        ]);

        // ── SUMMARY ─────────────────────────────────────────────
        echo "\n✅ Maestro test users seeded!\n\n";
        echo "ALL PASSWORDS: maestro123\n";
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        echo "CUSTOMERS:\n";
        echo "  100  Test Customer       maestro+customer1@test.com\n";
        echo "  101  Browse Customer     maestro+customer2@test.com\n";
        echo "  102  Order Customer      maestro+customer3@test.com\n";
        echo "  103  New Customer        maestro+customer-new@test.com    (no address)\n";
        echo "\nCHEFS (active):\n";
        echo "  110  Active Chef         maestro+chef1@test.com           (has menus + full schedule)\n";
        echo "  111  Menu Chef           maestro+chef2@test.com           (weekdays only)\n";
        echo "  112  Schedule Chef       maestro+chef3@test.com           (narrow hours)\n";
        echo "\nCHEFS (edge cases):\n";
        echo "  113  Pending Chef        maestro+chef-pending@test.com    (unverified)\n";
        echo "  114  NoQuiz Chef         maestro+chef-noquiz@test.com     (quiz incomplete)\n";
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
    }

    private function seedUser(array $data): void
    {
        $defaults = [
            'password'    => $this->password,
            'birthday'    => null,
            'bio'         => null,
            'is_pending'  => 0,
            'quiz_completed' => 1,
            'photo'       => '',
            'api_token'   => 'maestro_token_' . ($data['id'] ?? ''),
            'code'        => '',
            'token_date'  => '',
            'fcm_token'   => '',
            'is_online'   => 0,
            'created_at'  => $this->timestamp,
            'updated_at'  => $this->timestamp,
        ];

        DB::table('tbl_users')->insert(array_merge($defaults, $data));
    }
}
