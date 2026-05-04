<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddSocialAuthToUsers extends Migration
{
    public function up()
    {
        Schema::table('tbl_users', function (Blueprint $table) {
            // 'google' | 'apple' | 'facebook' | null (email/password)
            $table->string('social_provider', 16)->nullable();
            // The provider's stable user id (Google sub, Apple sub, Facebook id)
            $table->string('social_id', 191)->nullable();
            // True when the user signed up via a provider that asserts the email
            $table->boolean('email_verified')->default(false);

            $table->index(['social_provider', 'social_id'], 'idx_users_social_lookup');
        });
    }

    public function down()
    {
        Schema::table('tbl_users', function (Blueprint $table) {
            $table->dropIndex('idx_users_social_lookup');
            $table->dropColumn(['social_provider', 'social_id', 'email_verified']);
        });
    }
}
