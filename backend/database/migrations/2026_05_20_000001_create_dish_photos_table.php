<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateDishPhotosTable extends Migration
{
    public function up()
    {
        Schema::create('tbl_dish_photos', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('order_id');
            $table->unsignedBigInteger('chef_user_id');
            $table->unsignedBigInteger('menu_id');
            $table->string('filename', 255);
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('admin_notes')->nullable();
            $table->timestamps();

            $table->index('chef_user_id');
            $table->index('menu_id');
            $table->index('status');
            $table->index('created_at');
        });
    }

    public function down()
    {
        Schema::dropIfExists('tbl_dish_photos');
    }
}
