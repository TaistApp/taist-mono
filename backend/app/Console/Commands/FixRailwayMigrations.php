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

        // Try to connect to database - if it fails, just skip this command
        try {
            DB::connection()->getPdo();
        } catch (\Exception $e) {
            $this->warn('Database not ready yet, skipping migration fix...');
            return 0;
        }

        // Get all migration files
        $migrationPath = database_path('migrations');
        $migrationFiles = scandir($migrationPath);

        // Get current batch number (or start at 1)
        try {
            $currentBatch = DB::table('migrations')->max('batch') ?? 0;
        } catch (\Exception $e) {
            $this->warn('Cannot access migrations table, skipping...');
            return 0;
        }
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
            $tableName = $matches[1];

            // Check if table exists with this name
            if (Schema::hasTable($tableName)) {
                return $tableName;
            }

            // Some tables might have tbl_ prefix, check that too
            if (Schema::hasTable('tbl_' . $tableName)) {
                return 'tbl_' . $tableName;
            }
        }

        // Extract the base table name from the migration name
        // For "2016_06_01_000001_create_oauth_auth_codes_table" -> "oauth_auth_codes"
        if (preg_match('/_create_(.+?)_table/', $migrationName, $matches)) {
            $tableName = $matches[1];
            if (Schema::hasTable($tableName)) {
                return $tableName;
            }
        }

        return null;
    }
}
