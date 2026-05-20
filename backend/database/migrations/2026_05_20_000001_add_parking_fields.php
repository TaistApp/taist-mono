<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddParkingFields extends Migration
{
    public function up()
    {
        Schema::table('tbl_users', function (Blueprint $table) {
            $table->string('parking_type', 30)->nullable()->after('zip');
            $table->string('parking_instructions', 255)->nullable()->after('parking_type');
        });

        Schema::table('tbl_orders', function (Blueprint $table) {
            $table->string('parking_type', 30)->nullable()->after('address');
            $table->string('parking_instructions', 255)->nullable()->after('parking_type');
        });
    }

    public function down()
    {
        Schema::table('tbl_users', function (Blueprint $table) {
            $table->dropColumn(['parking_type', 'parking_instructions']);
        });

        Schema::table('tbl_orders', function (Blueprint $table) {
            $table->dropColumn(['parking_type', 'parking_instructions']);
        });
    }
}
