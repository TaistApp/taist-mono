<?php

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * @return void
     */
    public function run()
    {
        // Always run version seeder to ensure version is up to date
        $this->call(VersionSeeder::class);

        // $this->call(UsersTableSeeder::class);

        // Maestro E2E test users (safe to re-run — deletes & recreates)
        $this->call(\Database\Seeders\MaestroTestUserSeeder::class);
    }
}
