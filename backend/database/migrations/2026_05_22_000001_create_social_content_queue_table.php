<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateSocialContentQueueTable extends Migration
{
    public function up()
    {
        Schema::create('social_content_queue', function (Blueprint $table) {
            $table->id();
            $table->string('post_id', 20)->nullable();                          // Excel col A — T-W{week}-{slot}
            $table->date('scheduled_date')->nullable();                          // Excel col B
            $table->string('day_of_week', 10)->nullable();                      // Excel col C
            $table->string('time', 10)->nullable();                             // Excel col D
            $table->string('platform', 20)->default('Both');                    // Excel col E
            $table->string('pillar', 30);                                       // Excel col F
            $table->text('caption');                                             // Excel col G
            $table->text('hashtags')->nullable();                                // Excel col H
            $table->text('image_url')->nullable();                               // Excel col J
            $table->text('target_audience')->nullable();                          // Excel col K
            $table->enum('queue_status', ['draft', 'approved', 'exported', 'rejected'])->default('draft');
            $table->text('notes')->nullable();                                   // Excel col Q
            $table->text('review_quote')->nullable();                            // Excel col R
            $table->string('review_attribution', 100)->nullable();               // Excel col S
            $table->unsignedBigInteger('source_photo_id')->nullable();           // FK → tbl_dish_photos.id
            $table->unsignedBigInteger('source_menu_id')->nullable();            // FK → tbl_menus.id
            $table->string('generated_by', 50)->default('routine');              // 'routine' or 'manual'
            $table->timestamps();

            $table->index('queue_status');
            $table->index('pillar');
            $table->index('scheduled_date');
        });
    }

    public function down()
    {
        Schema::dropIfExists('social_content_queue');
    }
}
