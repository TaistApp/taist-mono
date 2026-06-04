<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddReferralFieldsToUsers extends Migration
{
    public function up()
    {
        Schema::table('tbl_users', function (Blueprint $table) {
            if (!Schema::hasColumn('tbl_users', 'referral_code')) {
                $table->string('referral_code', 30)->nullable()->unique()->after('source');
            }
            if (!Schema::hasColumn('tbl_users', 'referred_by_referral_id')) {
                $table->unsignedBigInteger('referred_by_referral_id')->nullable()->after('referral_code');
            }
        });
    }

    public function down()
    {
        Schema::table('tbl_users', function (Blueprint $table) {
            $table->dropColumn(['referral_code', 'referred_by_referral_id']);
        });
    }
}
