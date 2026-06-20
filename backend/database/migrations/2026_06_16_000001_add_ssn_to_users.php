<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds an encrypted `ssn` column so the chef can enter their SSN once during
 * Stripe onboarding (step 4) and have it pre-fill both Stripe's id_number
 * verification AND the SafeScreener background check (step 5). Stored as TEXT
 * because Laravel's `encrypted` cast inflates the value past VARCHAR(255).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tbl_users', function (Blueprint $table) {
            $table->text('ssn')->nullable()->after('zip');
        });
    }

    public function down(): void
    {
        Schema::table('tbl_users', function (Blueprint $table) {
            $table->dropColumn('ssn');
        });
    }
};
