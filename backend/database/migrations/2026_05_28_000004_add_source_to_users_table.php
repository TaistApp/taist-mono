<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddSourceToUsersTable extends Migration
{
    public function up()
    {
        Schema::table('tbl_users', function (Blueprint $table) {
            $table->string('source', 30)->nullable()->default('app-signup')->after('social_id')
                ->comment('app-signup, website-waitlist, meta-lead-ad');
        });
    }

    public function down()
    {
        Schema::table('tbl_users', function (Blueprint $table) {
            $table->dropColumn('source');
        });
    }
}
