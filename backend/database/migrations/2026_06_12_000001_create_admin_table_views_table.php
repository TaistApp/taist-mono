<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateAdminTableViewsTable extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('tbl_admin_table_views')) {
            Schema::create('tbl_admin_table_views', function (Blueprint $table) {
                $table->increments('id');
                // Signed int to match tbl_admins.id (int) — no FK constraint (MyISAM)
                $table->integer('admin_id');
                $table->string('page_key', 50);
                $table->text('state');
                $table->timestamps();
                $table->unique(['admin_id', 'page_key']);
            });
        }
    }

    public function down()
    {
        Schema::dropIfExists('tbl_admin_table_views');
    }
}
