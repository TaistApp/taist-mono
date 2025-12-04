<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateDiscountCodesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // Skip if table already exists (handles Railway's persistent database)
        if (Schema::hasTable('tbl_discount_codes')) {
            return;
        }

        Schema::create('tbl_discount_codes', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique()->comment('Discount code (e.g., WELCOME10, SAVE5)');
            $table->string('description', 255)->nullable()->comment('Admin note about this code');

            // Discount Configuration
            $table->enum('discount_type', ['fixed', 'percentage'])->default('fixed')->comment('Type of discount');
            $table->decimal('discount_value', 10, 2)->comment('Dollar amount or percentage value');

            // Usage Limits
            $table->integer('max_uses')->nullable()->comment('Maximum total uses (NULL = unlimited)');
            $table->integer('max_uses_per_customer')->default(1)->comment('Max uses per customer (default 1)');
            $table->integer('current_uses')->default(0)->comment('Current number of times used');

            // Validity Period
            $table->timestamp('valid_from')->nullable()->comment('When code becomes active (NULL = immediately)');
            $table->timestamp('valid_until')->nullable()->comment('When code expires (NULL = never)');

            // Constraints (Optional - for future)
            $table->decimal('minimum_order_amount', 10, 2)->nullable()->comment('Minimum order total required');
            $table->decimal('maximum_discount_amount', 10, 2)->nullable()->comment('Cap for percentage discounts');

            // Status
            $table->boolean('is_active')->default(true)->comment('1 = Active, 0 = Cancelled/Disabled');

            // Metadata
            $table->unsignedBigInteger('created_by_admin_id')->nullable()->comment('Admin who created this code');
            $table->timestamps();

            // Indexes
            $table->index(['is_active', 'valid_from', 'valid_until'], 'idx_active_valid');
            $table->index('created_by_admin_id', 'idx_created_by');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('tbl_discount_codes');
    }
}





