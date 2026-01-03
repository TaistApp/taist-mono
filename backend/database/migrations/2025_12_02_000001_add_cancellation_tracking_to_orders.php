<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddCancellationTrackingToOrders extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('tbl_orders', function (Blueprint $table) {
            // Cancellation actor tracking
            $table->unsignedInteger('cancelled_by_user_id')->nullable()->after('status');
            $table->enum('cancelled_by_role', ['customer', 'chef', 'admin', 'system'])
                  ->nullable()->after('cancelled_by_user_id');
            
            // Cancellation details
            $table->text('cancellation_reason')->nullable()->after('cancelled_by_role');
            $table->timestamp('cancelled_at')->nullable()->after('cancellation_reason');
            $table->enum('cancellation_type', [
                'customer_request',
                'chef_request',
                'chef_rejection',
                'admin_action',
                'system_timeout',
                'system_expired',
                'payment_failed',
                'other'
            ])->nullable()->after('cancelled_at');
            
            // Refund tracking
            $table->decimal('refund_amount', 10, 2)->nullable()->after('cancellation_type');
            $table->tinyInteger('refund_percentage')->nullable()->after('refund_amount');
            $table->timestamp('refund_processed_at')->nullable()->after('refund_percentage');
            $table->string('refund_stripe_id', 100)->nullable()->after('refund_processed_at');
            
            // Auto-close metadata
            $table->boolean('is_auto_closed')->default(false)->after('refund_stripe_id');
            $table->timestamp('closed_at')->nullable()->after('is_auto_closed');
            
            // Indexes for performance
            $table->index('cancelled_by_user_id', 'idx_orders_cancelled_by');
            $table->index('cancellation_type', 'idx_orders_cancellation_type');
            $table->index(['status', 'cancelled_at'], 'idx_orders_status_cancelled');
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
            // Drop indexes first
            $table->dropIndex('idx_orders_cancelled_by');
            $table->dropIndex('idx_orders_cancellation_type');
            $table->dropIndex('idx_orders_status_cancelled');
            
            // Drop columns
            $table->dropColumn([
                'cancelled_by_user_id',
                'cancelled_by_role',
                'cancellation_reason',
                'cancelled_at',
                'cancellation_type',
                'refund_amount',
                'refund_percentage',
                'refund_processed_at',
                'refund_stripe_id',
                'is_auto_closed',
                'closed_at',
            ]);
        });
    }
}











