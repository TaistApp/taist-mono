<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Two customer requests the chef needs to know about before they pack the car:
 * shoe coverings and bring-your-own containers. Stored on the profile as the
 * customer's default and copied onto each order so a past order still shows
 * what was asked for at the time.
 */
class AddChefRequestPrefs extends Migration
{
    public function up()
    {
        Schema::table('tbl_users', function (Blueprint $table) {
            $table->boolean('request_shoe_coverings')->default(false)->after('parking_instructions');
            $table->boolean('request_containers')->default(false)->after('request_shoe_coverings');
        });

        Schema::table('tbl_orders', function (Blueprint $table) {
            $table->boolean('request_shoe_coverings')->default(false)->after('parking_instructions');
            $table->boolean('request_containers')->default(false)->after('request_shoe_coverings');
        });
    }

    public function down()
    {
        Schema::table('tbl_users', function (Blueprint $table) {
            $table->dropColumn(['request_shoe_coverings', 'request_containers']);
        });

        Schema::table('tbl_orders', function (Blueprint $table) {
            $table->dropColumn(['request_shoe_coverings', 'request_containers']);
        });
    }
}
