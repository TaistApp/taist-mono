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

        // Get version from config (single source of truth)
        $currentVersion = config('version.version', '29.0.0');
        
        // Get existing record if it exists
        $existingRecord = DB::table('versions')->where('id', 1)->first();
        
        // Sync version - update or insert
        DB::table('versions')->updateOrInsert(
            ['id' => 1],
            [
                'version' => $currentVersion,
                'created_at' => $existingRecord->created_at ?? now(),
                'updated_at' => now(),
            ]
        );

        $this->info("Version synced to database: {$currentVersion}");
        return 0;
    }
}







