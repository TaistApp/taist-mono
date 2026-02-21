<?php

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class VersionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * This ensures the version table has the correct version.
     *
     * @return void
     */
    public function run()
    {
        // Single source of truth: frontend/app.json
        // Falls back to config/version.php if app.json isn't available.
        $currentVersion = $this->getVersionFromAppJson()
            ?? config('version.version', '29.0.0');

        // Check if version record exists
        $existingVersion = DB::table('versions')->first();

        if ($existingVersion) {
            // Update existing record to current version
            DB::table('versions')
                ->where('id', $existingVersion->id)
                ->update([
                    'version' => $currentVersion,
                    'updated_at' => now()
                ]);

            $this->command->info("Version updated to {$currentVersion}");
        } else {
            // Insert new version record
            DB::table('versions')->insert([
                'version' => $currentVersion,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            $this->command->info("Version {$currentVersion} inserted");
        }
    }

    /**
     * Read the app version from frontend/app.json (same logic as SyncVersion command).
     */
    private function getVersionFromAppJson(): ?string
    {
        $appJsonPath = base_path('../frontend/app.json');

        if (!file_exists($appJsonPath)) {
            return null;
        }

        $appJson = json_decode(file_get_contents($appJsonPath), true);

        if (!$appJson || !isset($appJson['expo']['version'])) {
            return null;
        }

        return $appJson['expo']['version'];
    }
}
