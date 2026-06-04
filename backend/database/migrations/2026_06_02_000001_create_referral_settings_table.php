<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class CreateReferralSettingsTable extends Migration
{
    public function up()
    {
        if (Schema::hasTable('tbl_referral_settings')) {
            return;
        }

        Schema::create('tbl_referral_settings', function (Blueprint $table) {
            $table->id();
            $table->enum('discount_type', ['fixed', 'percentage'])->default('percentage');
            $table->decimal('discount_value', 10, 2)->default(50.00)->comment('Dollar amount or percentage value');
            $table->integer('max_referrals_per_customer')->default(10);
            $table->integer('credit_expiration_days')->default(30);
            $table->decimal('minimum_order_amount', 10, 2)->nullable();
            $table->decimal('maximum_discount_amount', 10, 2)->nullable()->comment('Cap for percentage discounts');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        DB::table('tbl_referral_settings')->insert([
            'discount_type' => 'percentage',
            'discount_value' => 50.00,
            'max_referrals_per_customer' => 10,
            'credit_expiration_days' => 30,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down()
    {
        Schema::dropIfExists('tbl_referral_settings');
    }
}
