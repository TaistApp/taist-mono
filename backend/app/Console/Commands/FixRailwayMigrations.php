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

        // FIRST: Brutally drop any broken tables that can't be fixed with migrations
        $this->info("\nForce dropping broken tables...");
        $this->forceDropProblematicTables();

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

        // Second, handle Passport OAuth migrations from vendor
        $this->info("\nChecking Passport OAuth tables...");
        $passportMigrations = $this->getPassportMigrations();

        foreach ($passportMigrations as $migrationName => $tableName) {
            // Check if migration is already recorded
            $exists = DB::table('migrations')
                ->where('migration', $migrationName)
                ->exists();

            if ($exists) {
                $skipped++;
                continue;
            }

            // Check if table exists in database
            if (Schema::hasTable($tableName)) {
                DB::table('migrations')->insert([
                    'migration' => $migrationName,
                    'batch' => $newBatch,
                ]);
                $this->line("✓ Marked as migrated: {$migrationName} (OAuth table: {$tableName})");
                $marked++;
            } else {
                $this->line("  Skipped: {$migrationName} (OAuth table doesn't exist)");
                $skipped++;
            }
        }

        // Third, handle known problematic migrations that should NEVER run
        $this->info("\nChecking known problematic migrations...");
        $problematicMigrations = $this->getKnownProblematicMigrations();

        foreach ($problematicMigrations as $migrationName => $tableName) {
            // Check if migration is already recorded
            $exists = DB::table('migrations')
                ->where('migration', $migrationName)
                ->exists();

            if ($exists) {
                $this->line("  Already migrated: {$migrationName}");
                $skipped++;
                continue;
            }

            // ALWAYS mark these as migrated so they NEVER run
            // Don't care if table exists or not - these migrations are broken
            DB::table('migrations')->insert([
                'migration' => $migrationName,
                'batch' => $newBatch,
            ]);
            $this->line("✓ Marked as migrated (will never run): {$migrationName}");
            $marked++;
        }

        // Fourth, handle regular app migrations
        $this->info("\nChecking application migrations...");
        $migrationPath = database_path('migrations');
        $migrationFiles = scandir($migrationPath);

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
     * Get Passport OAuth migration mappings
     *
     * Returns a map of migration names to table names for all Passport OAuth tables.
     * Even though we ignore Passport migrations in AppServiceProvider, this ensures
     * that if the tables exist in the database, we mark them as migrated to prevent
     * any conflicts.
     *
     * @return array
     */
    private function getPassportMigrations()
    {
        return [
            '2016_06_01_000001_create_oauth_auth_codes_table' => 'oauth_auth_codes',
            '2016_06_01_000002_create_oauth_access_tokens_table' => 'oauth_access_tokens',
            '2016_06_01_000003_create_oauth_refresh_tokens_table' => 'oauth_refresh_tokens',
            '2016_06_01_000004_create_oauth_clients_table' => 'oauth_clients',
            '2016_06_01_000005_create_oauth_personal_access_clients_table' => 'oauth_personal_access_clients',
        ];
    }

    /**
     * Get known problematic migration mappings
     *
     * Explicitly maps migrations that have failed before or have non-standard table names
     * that the guessTableName() method might miss.
     *
     * @return array
     */
    private function getKnownProblematicMigrations()
    {
        return [
            // Old broken migrations - mark as complete so they never run
            '2025_12_03_000003_create_availability_overrides' => 'tbl_availability_overrides',
            '2025_12_04_000004_fix_availability_overrides_foreign_key' => 'tbl_availability_overrides',
            '2025_12_04_000001_create_availability_overrides_raw_sql' => 'tbl_availability_overrides',
        ];
    }

    /**
     * Force drop problematic tables using raw SQL
     *
     * Some tables get into a state where Schema::dropIfExists() doesn't work.
     * This nukes them with raw SQL before migrations run.
     *
     * @return void
     */
    private function forceDropProblematicTables()
    {
        $tablesToDrop = [
            'tbl_availability_overrides', // Has wrong foreign key type, needs brutal drop
        ];

        foreach ($tablesToDrop as $tableName) {
            try {
                $this->line("  Force dropping: {$tableName}");
                DB::statement("DROP TABLE IF EXISTS `{$tableName}`");
                $this->line("  ✓ Dropped: {$tableName}");
            } catch (\Exception $e) {
                $this->warn("  ! Could not drop {$tableName}: " . $e->getMessage());
            }
        }
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
