<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SyncVersion extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'version:sync';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync application version to database (runs on every deploy)';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        // Try to connect to database - if it fails, just skip this command
        try {
            DB::connection()->getPdo();
        } catch (\Exception $e) {
            $this->warn('Database not ready yet, skipping version sync...');
            return 0;
        }

        // Check if versions table exists
        if (!Schema::hasTable('versions')) {
            $this->warn('Versions table does not exist. Run migrations first.');
            return 0;
        }

        // MIN_VERSION is the single source of truth for the minimum app version
        // users must have installed. Only raise this AFTER the new version is
        // live on the App Store — never during development.
        // Set MIN_VERSION in Railway environment variables to control this.
        $minVersion = env('MIN_VERSION');

        if (!$minVersion) {
            $this->warn('MIN_VERSION env var not set — skipping version sync to avoid overwriting DB.');
            return 0;
        }

        // Get existing record if it exists
        $existingRecord = DB::table('versions')->where('id', 1)->first();

        // Only update if the version has actually changed
        if ($existingRecord && $existingRecord->version === $minVersion) {
            $this->info("Version already at {$minVersion} — no update needed.");
            return 0;
        }

        // Sync version - update or insert
        DB::table('versions')->updateOrInsert(
            ['id' => 1],
            [
                'version' => $minVersion,
                'created_at' => $existingRecord->created_at ?? now(),
                'updated_at' => now(),
            ]
        );

        $this->info("Minimum version synced to database: {$minVersion}");
        return 0;
    }
}







