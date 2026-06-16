<?php

namespace Tests\Unit\Controllers;

use App\Http\Controllers\AdminapiController;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Guards the admin side of the "Pause Account" feature: any admin status change
 * must clear a chef's self-paused flag so the admin action is authoritative.
 * This is how a paused chef gets brought back to Active from the admin panel.
 */
class ChefStatusPauseTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('tbl_users');
        Schema::create('tbl_users', function (Blueprint $table) {
            $table->increments('id');
            $table->tinyInteger('user_type')->default(2);
            $table->tinyInteger('verified')->default(1);
            $table->tinyInteger('is_pending')->default(0);
            $table->tinyInteger('is_paused')->default(0);
            $table->string('api_token')->nullable();
            $table->string('created_at')->nullable();
            $table->string('updated_at')->nullable();
        });
    }

    /**
     * Build the controller without running its constructor — the constructor
     * pulls in the Firebase messaging client, which isn't configured in tests
     * and isn't used by changeChefStatus().
     */
    private function controller(): AdminapiController
    {
        return (new \ReflectionClass(AdminapiController::class))->newInstanceWithoutConstructor();
    }

    private function seedPausedChef(int $id = 1): void
    {
        DB::table('tbl_users')->insert([
            'id' => $id,
            'user_type' => 2,
            'verified' => 1,
            'is_pending' => 0,
            'is_paused' => 1,
            'api_token' => 'tok_' . $id,
            'created_at' => now()->toDateTimeString(),
            'updated_at' => now()->toDateTimeString(),
        ]);
    }

    public function test_activating_a_paused_chef_clears_the_paused_flag()
    {
        $this->seedPausedChef(1);

        // status=1 => Active, silent=1 avoids the approval notification path.
        $request = new Request(['ids' => '1', 'status' => 1, 'silent' => 1]);
        $this->controller()->changeChefStatus($request);

        $chef = DB::table('tbl_users')->find(1);
        $this->assertEquals(0, $chef->is_paused, 'Activating should clear the paused flag');
        $this->assertEquals(1, $chef->verified, 'Chef should be verified/active');
        $this->assertEquals(0, $chef->is_pending, 'Chef should not be pending');
    }

    public function test_deactivating_a_paused_chef_moves_to_pending_and_clears_paused()
    {
        $this->seedPausedChef(1);

        // status=0 => move back to Pending.
        $request = new Request(['ids' => '1', 'status' => 0]);
        $this->controller()->changeChefStatus($request);

        $chef = DB::table('tbl_users')->find(1);
        $this->assertEquals(1, $chef->is_pending, 'Deactivating should move chef to pending');
        $this->assertEquals(0, $chef->is_paused, 'Deactivating should clear the paused flag');
    }
}
