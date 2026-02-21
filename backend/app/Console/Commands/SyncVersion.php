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

        // Single source of truth: frontend/app.json
        // This eliminates version drift between frontend and backend.
        // Falls back to config/version.php if app.json isn't available.
        $currentVersion = $this->getVersionFromAppJson()
            ?? config('version.version', '29.0.0');

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

    /**
     * Read the app version from frontend/app.json.
     *
     * Both backend and frontend live in the same monorepo, so app.json
     * is always at ../frontend/app.json relative to the backend root.
     * This runs on every deploy via the Procfile, keeping the DB version
     * in sync automatically — no manual env vars or config updates needed.
     *
     * @return string|null
     */
    private function getVersionFromAppJson(): ?string
    {
        $appJsonPath = base_path('../frontend/app.json');

        if (!file_exists($appJsonPath)) {
            $this->warn("frontend/app.json not found at {$appJsonPath}, falling back to config.");
            return null;
        }

        $appJson = json_decode(file_get_contents($appJsonPath), true);

        if (!$appJson || !isset($appJson['expo']['version'])) {
            $this->warn('Could not parse version from frontend/app.json, falling back to config.');
            return null;
        }

        $version = $appJson['expo']['version'];
        $this->info("Read version {$version} from frontend/app.json");

        return $version;
    }
}







