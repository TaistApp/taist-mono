<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Fix Availability Overrides Foreign Key
 *
 * This migration fixes the foreign key type mismatch that caused the initial
 * availability_overrides migration to fail on Railway.
 *
 * Issue: chef_id was defined as INT but tbl_users.id is BIGINT UNSIGNED
 * Solution: Drop the broken table and recreate with correct types
 */
class FixAvailabilityOverridesForeignKey extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // Drop the table if it exists (it may be in a broken state from failed migration)
        Schema::dropIfExists('tbl_availability_overrides');

        // Recreate with correct column types
        Schema::create('tbl_availability_overrides', function (Blueprint $table) {
            $table->id();

            // FIXED: Changed from integer() to unsignedBigInteger() to match tbl_users.id
            $table->unsignedBigInteger('chef_id');

            // Which specific date this override applies to (YYYY-MM-DD)
            $table->date('override_date');

            // Override times (NULL = cancelled for this day)
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();

            // Status: confirmed (same as schedule), modified (changed times), cancelled (not available)
            $table->enum('status', ['confirmed', 'modified', 'cancelled'])->default('confirmed');

            // How was this override created?
            // reminder_confirmation: Chef responded to 24-hour reminder
            // manual_toggle: Chef manually set via toggle API
            $table->enum('source', ['reminder_confirmation', 'manual_toggle'])->default('manual_toggle');

            $table->timestamps();

            // Ensure one override per chef per day
            $table->unique(['chef_id', 'override_date'], 'unique_chef_date');

            // Foreign key to tbl_users table - now with matching types!
            $table->foreign('chef_id')
                  ->references('id')
                  ->on('tbl_users')
                  ->onDelete('cascade');

            // Index for querying by date range
            $table->index('override_date');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('tbl_availability_overrides');
    }
}
