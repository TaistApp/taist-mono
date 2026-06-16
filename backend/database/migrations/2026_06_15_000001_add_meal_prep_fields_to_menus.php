<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds meal-prep support to menu items. Every item now has an item_type
 * ('standard' by default), and meal-prep items carry a few extra fields that
 * standard items leave null.
 */
class AddMealPrepFieldsToMenus extends Migration
{
    public function up()
    {
        Schema::table('tbl_menus', function (Blueprint $table) {
            $table->enum('item_type', ['standard', 'meal_prep'])
                  ->default('standard')
                  ->after('user_id');

            // Meal-prep-only fields (null for standard items)
            $table->unsignedInteger('meals_per_package')->nullable()->after('serving_size');
            $table->unsignedInteger('shelf_life_days')->nullable()->after('meals_per_package');
            $table->text('storage_instructions')->nullable()->after('shelf_life_days');

            $table->index('item_type', 'idx_menus_item_type');
        });
    }

    public function down()
    {
        Schema::table('tbl_menus', function (Blueprint $table) {
            $table->dropIndex('idx_menus_item_type');
            $table->dropColumn([
                'item_type',
                'meals_per_package',
                'shelf_life_days',
                'storage_instructions',
            ]);
        });
    }
}
