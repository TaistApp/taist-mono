<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Admins;

class AdminSeeder extends Seeder
{
    /**
     * Seed admin users for the application.
     *
     * @return void
     */
    public function run()
    {
        // Default admin user - update password if exists, create if not
        $admin = Admins::firstOrCreate(
            ['email' => 'admin@taist.com'],
            [
                'first_name' => 'Admin',
                'last_name' => 'User',
                'password' => 'admin123', // Will be hashed automatically by the model mutator
                'active' => 1,
                'api_token' => uniqid() . Str::random(60),
            ]
        );

        // Always update password to ensure it's correct (in case user already existed)
        $admin->password = 'admin123'; // Will be hashed by mutator
        $admin->active = 1;
        $admin->save();

        echo "✅ Admin user ready:\n";
        echo "   Email: admin@taist.com\n";
        echo "   Password: admin123\n";
        echo "   Status: Active\n";
        echo "   ID: {$admin->id}\n\n";

        // You can add more admin users here
        // Example:
        /*
        $admin2 = Admins::firstOrCreate(
            ['email' => 'support@taist.com'],
            [
                'first_name' => 'Support',
                'last_name' => 'Team',
                'password' => 'support123',
                'active' => 1,
                'api_token' => uniqid() . Str::random(60),
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        */
    }
}

