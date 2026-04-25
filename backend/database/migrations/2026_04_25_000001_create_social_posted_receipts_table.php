<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tracks which menu items / reviews have been used as social-media posts
 * so the /mapi/social/* endpoints can enforce a no-repeat window. Make.com
 * (or whatever scheduler is driving posts) calls POST
 * /mapi/social/posted-receipt after a successful render+post to record
 * what just shipped.
 */
class CreateSocialPostedReceiptsTable extends Migration
{
    public function up()
    {
        Schema::create('social_posted_receipts', function (Blueprint $table) {
            $table->id();
            // 'menu-item' or 'review' — kept short to match the kind enum used by /api/social/* in taist-social
            $table->string('kind', 32);
            // For 'menu-item': tbl_menus.id. For 'review': the curated review id from taist-social/src/lib/reviews.ts
            $table->unsignedBigInteger('source_id');
            $table->timestamp('posted_at')->useCurrent();
            $table->timestamps();

            // Used by random-pick queries: "what kind, posted in the last N days, exclude these IDs"
            $table->index(['kind', 'posted_at'], 'social_receipts_kind_posted_idx');
            $table->index(['kind', 'source_id'], 'social_receipts_kind_source_idx');
        });
    }

    public function down()
    {
        Schema::dropIfExists('social_posted_receipts');
    }
}
