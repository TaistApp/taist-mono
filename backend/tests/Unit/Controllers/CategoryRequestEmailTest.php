<?php

namespace Tests\Unit\Controllers;

use App\Helpers\AppHelper;
use App\Http\Controllers\MapiController;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * A chef requesting a category from the menu wizard created the row silently.
 * It went live to customers with nobody told, so nothing was ever reviewed or
 * renamed — Dayne requested "Tex Mex" on build 68 and no email arrived.
 */
class CategoryRequestEmailTest extends TestCase
{
    private const API_KEY = 'ra_jk6YK9QmAVqTazHIrF1vi3qnbtagCIJoZAzCR51lCpYY9nkTN6aPVeX15J49k';

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('tbl_categories');
        Schema::create('tbl_categories', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name', 50);
            $table->integer('chef_id')->default(0);
            $table->integer('menu_id')->default(0);
            $table->tinyInteger('status')->default(2);
            $table->string('created_at')->nullable();
            $table->string('updated_at')->nullable();
        });
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('tbl_categories');
        parent::tearDown();
    }

    /** The constructor takes four dependencies none of these paths touch. */
    private function controller(): RecordingCategoryController
    {
        return (new \ReflectionClass(RecordingCategoryController::class))
            ->newInstanceWithoutConstructor();
    }

    private function request(string $name): Request
    {
        $request = new Request(['name' => $name]);
        $request->headers->set('apiKey', self::API_KEY);
        return $request;
    }

    public function test_a_new_category_notifies_the_team()
    {
        $controller = $this->controller();
        $controller->createCategory($this->request('Tex Mex'));

        $this->assertCount(1, $controller->notified, 'A new category must send one admin email');
        $this->assertSame('Tex Mex', $controller->notified[0]['name']);
        $this->assertEquals(
            DB::table('tbl_categories')->where('name', 'Tex Mex')->value('id'),
            $controller->notified[0]['id'],
            'The email must carry the id of the row that was actually created'
        );
    }

    // Control: a duplicate returns the existing row without creating anything,
    // so there is nothing new to tell the team about.
    public function test_a_duplicate_does_not_notify()
    {
        DB::table('tbl_categories')->insert([
            'id' => 5,
            'name' => 'Tex Mex',
            'chef_id' => 0,
            'menu_id' => 0,
            'status' => 2,
            'created_at' => now()->toDateTimeString(),
            'updated_at' => now()->toDateTimeString(),
        ]);

        $controller = $this->controller();
        $controller->createCategory($this->request('  tex mex  '));

        $this->assertSame([], $controller->notified, 'A duplicate must not email the team');
        $this->assertEquals(1, DB::table('tbl_categories')->count());
    }

    public function test_email_names_the_chef_and_says_the_category_is_already_live()
    {
        $chef = (object) [
            'id' => 42,
            'first_name' => 'Dayne',
            'last_name' => 'Arnett',
            'email' => 'dayne@taist.app',
        ];

        $mail = AppHelper::newCategoryRequestEmail('Tex Mex', 7, $chef);

        $this->assertSame('Taist - New Category Requested: Tex Mex', $mail['subject']);
        $this->assertRegExp('/Dayne Arnett/', $mail['body']);
        $this->assertRegExp('/dayne@taist\.app/', $mail['body']);
        $this->assertRegExp('/user #42/', $mail['body']);
        // The row is live the instant it is created — the copy must not imply
        // an approval queue that does not exist.
        $this->assertRegExp('/already live/', $mail['body']);
    }

    // Control: an unauthenticated request still produces a usable email rather
    // than blowing up on a null user.
    public function test_email_survives_an_unknown_requester()
    {
        $mail = AppHelper::newCategoryRequestEmail('Tex Mex', 7, null);

        $this->assertRegExp('/A chef/', $mail['body']);
        $this->assertNotRegExp('/user #/', $mail['body']);
    }
}

/**
 * Captures the admin notification instead of posting to Resend, so the suite
 * makes no outbound HTTP calls.
 */
class RecordingCategoryController extends MapiController
{
    public $notified = [];

    protected function _notifyAdminOfNewCategory($name, $categoryId)
    {
        $this->notified[] = ['name' => $name, 'id' => $categoryId];
    }
}
