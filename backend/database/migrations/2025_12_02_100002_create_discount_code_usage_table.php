<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateDiscountCodeUsageTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // Skip if table already exists (handles Railway's persistent database)
        if (Schema::hasTable('tbl_discount_code_usage')) {
            // Table exists - just try to add missing foreign key to tbl_orders if needed
            if (Schema::hasTable('tbl_orders')) {
                // Check if the foreign key already exists before adding
                $foreignKeyExists = \DB::select(
                    "SELECT CONSTRAINT_NAME
                     FROM information_schema.TABLE_CONSTRAINTS
                     WHERE TABLE_SCHEMA = DATABASE()
                     AND TABLE_NAME = 'tbl_discount_code_usage'
                     AND CONSTRAINT_NAME = 'fk_usage_order'
                     AND CONSTRAINT_TYPE = 'FOREIGN KEY'"
                );

                if (empty($foreignKeyExists)) {
                    Schema::table('tbl_discount_code_usage', function (Blueprint $table) {
                        $table->foreign('order_id', 'fk_usage_order')
                            ->references('id')
                            ->on('tbl_orders')
                            ->onDelete('cascade');
                    });
                }
            }
            return;
        }

        // Table doesn't exist - create it
        Schema::create('tbl_discount_code_usage', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('discount_code_id')->comment('FK to tbl_discount_codes');
            $table->unsignedBigInteger('order_id')->comment('FK to tbl_orders');
            $table->unsignedBigInteger('customer_user_id')->comment('FK to tbl_users');
            $table->decimal('discount_amount', 10, 2)->comment('Actual discount applied');
            $table->decimal('order_total_before_discount', 10, 2)->comment('Original order total');
            $table->decimal('order_total_after_discount', 10, 2)->comment('Final order total');
            $table->timestamp('used_at')->useCurrent();

            // Indexes
            $table->index('discount_code_id', 'idx_discount_code');
            $table->index('order_id', 'idx_order');
            $table->index('customer_user_id', 'idx_customer');

            // Foreign Keys
            $table->foreign('discount_code_id', 'fk_usage_discount_code')
                ->references('id')
                ->on('tbl_discount_codes')
                ->onDelete('cascade');
        });

        // Add foreign key to tbl_orders only if the table exists
        // This handles the case where migrations run before database import on Railway
        if (Schema::hasTable('tbl_orders')) {
            Schema::table('tbl_discount_code_usage', function (Blueprint $table) {
                $table->foreign('order_id', 'fk_usage_order')
                    ->references('id')
                    ->on('tbl_orders')
                    ->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('tbl_discount_code_usage');
    }
}











