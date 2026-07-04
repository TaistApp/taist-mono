<?php

namespace Tests\Unit\Models;

use App\Models\Menus;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Guards the rule that a chef must always keep at least one available (is_live)
 * menu item, so their menu preview never becomes un-orderable. The controller
 * uses Menus::chefHasAvailableItem() to decide whether an is_live=0 request is
 * allowed.
 */
class MenusTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('tbl_menus');
        Schema::create('tbl_menus', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('user_id');
            $table->tinyInteger('is_live')->default(1);
            $table->string('title')->nullable();
            $table->string('created_at')->nullable();
            $table->string('updated_at')->nullable();
        });
    }

    private function seedMenu(int $userId, int $isLive): int
    {
        return DB::table('tbl_menus')->insertGetId([
            'user_id' => $userId,
            'is_live' => $isLive,
        ]);
    }

    public function test_false_when_chef_has_no_items()
    {
        $this->assertFalse(Menus::chefHasAvailableItem(1));
    }

    public function test_false_when_chef_only_has_hidden_items()
    {
        $this->seedMenu(1, 0);
        $this->assertFalse(Menus::chefHasAvailableItem(1));
    }

    /**
     * CONTROL: a chef with an available item returns true.
     */
    public function test_true_when_chef_has_an_available_item()
    {
        $this->seedMenu(1, 1);
        $this->assertTrue(Menus::chefHasAvailableItem(1));
    }

    public function test_ignores_other_chefs_items()
    {
        $this->seedMenu(2, 1); // different chef
        $this->assertFalse(Menus::chefHasAvailableItem(1));
    }

    /**
     * When updating, the item being edited must not count itself — so hiding the
     * only available item is still blocked.
     */
    public function test_excludes_the_item_being_edited()
    {
        $onlyItem = $this->seedMenu(1, 1);
        $this->assertFalse(Menus::chefHasAvailableItem(1, $onlyItem));

        // With a second available item, excluding the first still finds one.
        $this->seedMenu(1, 1);
        $this->assertTrue(Menus::chefHasAvailableItem(1, $onlyItem));
    }
}
