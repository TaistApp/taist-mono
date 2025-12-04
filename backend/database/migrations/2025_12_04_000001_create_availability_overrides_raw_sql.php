<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Create Availability Overrides Table - RAW SQL VERSION
 *
 * This migration uses raw SQL to avoid any Schema builder issues with foreign keys.
 * Previous attempts using Schema::create() failed due to type mismatches.
 *
 * This is the nuclear option that just works.
 */
class CreateAvailabilityOverridesRawSql extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // FORCE drop the table using raw SQL - bypasses any Laravel checks
        DB::statement('DROP TABLE IF EXISTS tbl_availability_overrides');

        // Create table with raw SQL - exact type control
        DB::statement("
            CREATE TABLE tbl_availability_overrides (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                chef_id BIGINT UNSIGNED NOT NULL COMMENT 'FK to tbl_users.id',
                override_date DATE NOT NULL COMMENT 'Which date this override applies to',
                start_time TIME NULL COMMENT 'Override start time, NULL = cancelled',
                end_time TIME NULL COMMENT 'Override end time, NULL = cancelled',
                status ENUM('confirmed', 'modified', 'cancelled') NOT NULL DEFAULT 'confirmed',
                source ENUM('reminder_confirmation', 'manual_toggle') NOT NULL DEFAULT 'manual_toggle',
                created_at TIMESTAMP NULL,
                updated_at TIMESTAMP NULL,

                UNIQUE KEY unique_chef_date (chef_id, override_date),
                KEY idx_override_date (override_date),

                CONSTRAINT tbl_availability_overrides_chef_id_foreign
                    FOREIGN KEY (chef_id)
                    REFERENCES tbl_users(id)
                    ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        DB::statement('DROP TABLE IF EXISTS tbl_availability_overrides');
    }
}
