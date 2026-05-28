<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateWaitlistTable extends Migration
{
    public function up()
    {
        Schema::create('waitlist', function (Blueprint $table) {
            $table->id();
            $table->string('email', 255);
            $table->string('first_name', 50);
            $table->string('zip', 10);
            $table->tinyInteger('user_type')->comment('1=customer, 2=chef');
            $table->string('source', 30)->default('website-waitlist')->comment('website-waitlist, meta-lead-ad');
            $table->string('household', 50)->nullable()->comment('Customer only: household size');
            $table->string('referral', 30)->nullable()->comment('How they heard: friend, social, google, event, other');
            $table->boolean('converted')->default(false)->comment('True once they create an app account');
            $table->unsignedBigInteger('converted_user_id')->nullable()->comment('FK to tbl_users.id after conversion');
            $table->timestamps();

            $table->unique(['email', 'user_type']);
            $table->index('user_type');
            $table->index('source');
            $table->index('converted');
        });
    }

    public function down()
    {
        Schema::dropIfExists('waitlist');
    }
}
