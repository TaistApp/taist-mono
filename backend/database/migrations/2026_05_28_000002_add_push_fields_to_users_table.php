<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddPushFieldsToUsersTable extends Migration
{
    public function up()
    {
        Schema::table('tbl_users', function (Blueprint $table) {
            $table->timestamp('first_order_completed_at')->nullable()->after('fcm_token');
            $table->boolean('push_opted_in')->default(false)->after('first_order_completed_at');
        });
    }

    public function down()
    {
        Schema::table('tbl_users', function (Blueprint $table) {
            $table->dropColumn(['first_order_completed_at', 'push_opted_in']);
        });
    }
}
