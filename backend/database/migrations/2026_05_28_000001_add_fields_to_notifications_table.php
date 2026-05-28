<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddFieldsToNotificationsTable extends Migration
{
    public function up()
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->boolean('is_read')->default(false)->after('role');
            $table->string('category', 50)->default('order_update')->after('is_read');
            $table->string('dish_image', 255)->nullable()->after('image');
        });
    }

    public function down()
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropColumn(['is_read', 'category', 'dish_image']);
        });
    }
}
