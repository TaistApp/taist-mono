<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Apartment / unit / suite number for delivery addresses. Kept separate from
 * `address` so geocoding and map links can keep using the plain street
 * address (a ", Unit 4B" suffix breaks geocoder matches).
 */
class AddAddress2ToUsersTable extends Migration
{
    public function up()
    {
        Schema::table('tbl_users', function (Blueprint $table) {
            $table->string('address2', 50)->nullable()->after('address');
        });
    }

    public function down()
    {
        Schema::table('tbl_users', function (Blueprint $table) {
            $table->dropColumn('address2');
        });
    }
}
