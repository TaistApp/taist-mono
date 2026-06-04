<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateReferralsTable extends Migration
{
    public function up()
    {
        if (Schema::hasTable('tbl_referrals')) {
            return;
        }

        Schema::create('tbl_referrals', function (Blueprint $table) {
            $table->id();
            // NOTE: tbl_users.id and tbl_orders.id are signed INT in this DB (not unsigned
            // bigint), so FK columns referencing them must be signed integer to match exactly.
            // tbl_discount_codes.id is bigint unsigned, so those FK columns stay unsignedBigInteger.
            $table->integer('referrer_user_id');
            $table->string('referral_code', 30);
            $table->enum('referral_type', ['general', 'chef'])->default('general');
            $table->integer('chef_user_id')->nullable();
            $table->string('referred_phone', 20);
            $table->integer('referred_user_id')->nullable();
            $table->enum('status', ['pending', 'signed_up', 'completed', 'expired'])->default('pending');
            $table->unsignedBigInteger('referrer_discount_code_id')->nullable();
            $table->unsignedBigInteger('referred_discount_code_id')->nullable();
            $table->integer('qualifying_order_id')->nullable();
            $table->timestamp('sms_sent_at')->nullable();
            $table->timestamp('signed_up_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('expired_at')->nullable();
            $table->timestamps();

            $table->foreign('referrer_user_id')->references('id')->on('tbl_users')->onDelete('cascade');
            $table->foreign('chef_user_id')->references('id')->on('tbl_users')->onDelete('set null');
            $table->foreign('referred_user_id')->references('id')->on('tbl_users')->onDelete('set null');
            $table->foreign('referrer_discount_code_id')->references('id')->on('tbl_discount_codes')->onDelete('set null');
            $table->foreign('referred_discount_code_id')->references('id')->on('tbl_discount_codes')->onDelete('set null');
            $table->foreign('qualifying_order_id')->references('id')->on('tbl_orders')->onDelete('set null');

            $table->index('referrer_user_id', 'idx_referrer');
            $table->index('referred_phone', 'idx_referred_phone');
            $table->index('referred_user_id', 'idx_referred_user');
            $table->index('referral_code', 'idx_referral_code');
            $table->index('status', 'idx_referral_status');
        });
    }

    public function down()
    {
        Schema::dropIfExists('tbl_referrals');
    }
}
