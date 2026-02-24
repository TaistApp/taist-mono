<?php

namespace Tests\Unit\Services;

use App\Services\ChatSmsService;
use App\Services\TwilioService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Mockery;
use Tests\TestCase;

class ChatSmsServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();

        Schema::dropIfExists('tbl_users');
        Schema::create('tbl_users', function (Blueprint $table) {
            $table->increments('id');
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->integer('user_type')->default(1);
            $table->string('phone')->nullable();
            $table->string('created_at')->nullable();
            $table->string('updated_at')->nullable();
        });
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_send_new_message_alert_sends_alert_only_sms_and_sets_throttle()
    {
        putenv('CHAT_SMS_ENABLED=true');
        putenv('CHAT_SMS_THROTTLE_MINUTES=5');
        putenv('APP_URL=https://taist.app');

        DB::table('tbl_users')->insert([
            [
                'id' => 10,
                'first_name' => 'Chef',
                'last_name' => 'Jane',
                'user_type' => 2,
                'phone' => '+15555550010',
                'created_at' => now()->toDateTimeString(),
                'updated_at' => now()->toDateTimeString(),
            ],
            [
                'id' => 20,
                'first_name' => 'Customer',
                'last_name' => 'John',
                'user_type' => 1,
                'phone' => '+15555550020',
                'created_at' => now()->toDateTimeString(),
                'updated_at' => now()->toDateTimeString(),
            ],
        ]);

        $sentSms = null;
        $twilio = Mockery::mock(TwilioService::class);
        $twilio->shouldReceive('sendSMS')
            ->once()
            ->andReturnUsing(function ($phone, $message, $metadata) use (&$sentSms) {
                $sentSms = compact('phone', 'message', 'metadata');
                return ['success' => true, 'error' => null, 'sid' => 'SM123'];
            });

        $service = new ChatSmsService($twilio);
        $service->sendNewMessageAlert(10, 20, 9001);

        $this->assertNotNull($sentSms);
        $this->assertEquals('+15555550020', $sentSms['phone']);
        // Customer sees chef name as "FirstName L." — "Chef J." (no double period)
        $this->assertStringContainsString('Taist: New message from Chef J.', $sentSms['message']);
        $this->assertStringContainsString('Open inbox: ', $sentSms['message']);
        $this->assertStringContainsString('/open/inbox.', $sentSms['message']);
        $this->assertStringContainsString('Reply in the app only', $sentSms['message']);
        $this->assertEquals('chat_message_alert', $sentSms['metadata']['type']);
        $this->assertTrue(Cache::has('chat_sms_alert:9001:10:20'));
    }

    public function test_send_new_message_alert_throttles_within_window()
    {
        putenv('CHAT_SMS_ENABLED=true');
        putenv('CHAT_SMS_THROTTLE_MINUTES=5');
        putenv('APP_URL=https://taist.app');

        DB::table('tbl_users')->insert([
            [
                'id' => 31,
                'first_name' => 'Alice',
                'last_name' => 'Sender',
                'user_type' => 1,
                'phone' => '+15555550031',
                'created_at' => now()->toDateTimeString(),
                'updated_at' => now()->toDateTimeString(),
            ],
            [
                'id' => 42,
                'first_name' => 'Bob',
                'last_name' => 'Recipient',
                'user_type' => 2,
                'phone' => '+15555550042',
                'created_at' => now()->toDateTimeString(),
                'updated_at' => now()->toDateTimeString(),
            ],
        ]);

        $twilio = Mockery::mock(TwilioService::class);
        $twilio->shouldReceive('sendSMS')
            ->once()
            ->andReturn(['success' => true, 'error' => null, 'sid' => 'SM456']);

        $service = new ChatSmsService($twilio);
        $service->sendNewMessageAlert(31, 42, 8008);
        $service->sendNewMessageAlert(31, 42, 8008);

        $this->assertTrue(Cache::has('chat_sms_alert:8008:31:42'));
    }

    public function test_send_new_message_alert_does_not_send_when_feature_disabled()
    {
        putenv('CHAT_SMS_ENABLED=false');
        putenv('CHAT_SMS_THROTTLE_MINUTES=5');
        putenv('APP_URL=https://taist.app');

        DB::table('tbl_users')->insert([
            [
                'id' => 55,
                'first_name' => 'Disabled',
                'last_name' => 'Sender',
                'user_type' => 1,
                'phone' => '+15555550055',
                'created_at' => now()->toDateTimeString(),
                'updated_at' => now()->toDateTimeString(),
            ],
            [
                'id' => 66,
                'first_name' => 'Disabled',
                'last_name' => 'Recipient',
                'user_type' => 2,
                'phone' => '+15555550066',
                'created_at' => now()->toDateTimeString(),
                'updated_at' => now()->toDateTimeString(),
            ],
        ]);

        $twilio = Mockery::mock(TwilioService::class);
        $twilio->shouldNotReceive('sendSMS');

        $service = new ChatSmsService($twilio);
        $service->sendNewMessageAlert(55, 66, 7007);

        $this->assertFalse(Cache::has('chat_sms_alert:7007:55:66'));
    }
}
