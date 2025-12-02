<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class FixRailwayMigrations extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'railway:fix-migrations';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Mark existing database tables as migrated (for Railway imports)';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $this->info('Checking for existing tables and marking migrations as complete...');

        // Get all migration files
        $migrationPath = database_path('migrations');
        $migrationFiles = scandir($migrationPath);

        // Get current batch number (or start at 1)
        $currentBatch = DB::table('migrations')->max('batch') ?? 0;
        $newBatch = $currentBatch + 1;

        $marked = 0;
        $skipped = 0;

        foreach ($migrationFiles as $file) {
            if ($file === '.' || $file === '..' || !str_ends_with($file, '.php')) {
                continue;
            }

            // Get the migration name (filename without .php)
            $migrationName = str_replace('.php', '', $file);

            // Check if this migration is already recorded
            $exists = DB::table('migrations')
                ->where('migration', $migrationName)
                ->exists();

            if ($exists) {
                $skipped++;
                continue;
            }

            // Try to determine what table this migration creates
            $tableName = $this->guessTableName($migrationName);

            if ($tableName && Schema::hasTable($tableName)) {
                // Table exists, mark migration as complete
                DB::table('migrations')->insert([
                    'migration' => $migrationName,
                    'batch' => $newBatch,
                ]);

                $this->line("✓ Marked as migrated: {$migrationName} (table: {$tableName})");
                $marked++;
            } else {
                $this->line("  Skipped: {$migrationName} (table doesn't exist)");
                $skipped++;
            }
        }

        $this->info("\nCompleted!");
        $this->info("Marked as migrated: {$marked}");
        $this->info("Skipped: {$skipped}");

        return 0;
    }

    /**
     * Try to guess the table name from migration filename
     */
    private function guessTableName($migrationName)
    {
        // Match patterns like "create_xxx_table" or "create_xxx"
        if (preg_match('/create_(.+?)_table/', $migrationName, $matches)) {
            return $matches[1];
        }

        // Special cases for OAuth tables
        if (str_contains($migrationName, 'oauth_auth_codes')) {
            return 'oauth_auth_codes';
        }
        if (str_contains($migrationName, 'oauth_access_tokens')) {
            return 'oauth_access_tokens';
        }
        if (str_contains($migrationName, 'oauth_refresh_tokens')) {
            return 'oauth_refresh_tokens';
        }
        if (str_contains($migrationName, 'oauth_clients')) {
            return 'oauth_clients';
        }
        if (str_contains($migrationName, 'oauth_personal_access_clients')) {
            return 'oauth_personal_access_clients';
        }

        return null;
    }
}
