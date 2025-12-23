<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddDiscountFieldsToOrders extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('tbl_orders', function (Blueprint $table) {
            $table->unsignedBigInteger('discount_code_id')->nullable()->after('total_price')->comment('FK to tbl_discount_codes');
            $table->string('discount_code', 50)->nullable()->after('discount_code_id')->comment('Code used (denormalized for history)');
            $table->decimal('discount_amount', 10, 2)->default(0.00)->after('discount_code')->comment('Discount applied to this order');
            $table->decimal('subtotal_before_discount', 10, 2)->nullable()->after('discount_amount')->comment('Original price before discount');
            
            $table->index('discount_code_id', 'idx_order_discount_code');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('tbl_orders', function (Blueprint $table) {
            $table->dropIndex('idx_order_discount_code');
            $table->dropColumn([
                'discount_code_id',
                'discount_code',
                'discount_amount',
                'subtotal_before_discount'
            ]);
        });
    }
}




