<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Adds a global "Meal Prep" category so chefs can tag (and customers can find)
 * meal-prep menu items. The chef menu-item wizard auto-selects this category
 * for meal-prep items. Idempotent — safe to run on staging and production.
 */
return new class extends Migration
{
    public function up(): void
    {
        $exists = DB::table('tbl_categories')
            ->whereRaw('LOWER(name) = ?', ['meal prep'])
            ->exists();

        if (!$exists) {
            $now = now()->toDateTimeString();
            DB::table('tbl_categories')->insert([
                'name'       => 'Meal Prep',
                'chef_id'    => 0,   // global category
                'menu_id'    => 0,
                'status'     => 2,   // 2 = Approved (visible to chefs/customers)
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        DB::table('tbl_categories')
            ->whereRaw('LOWER(name) = ?', ['meal prep'])
            ->where('chef_id', 0)
            ->delete();
    }
};
