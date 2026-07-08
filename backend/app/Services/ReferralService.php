<?php

namespace App\Services;

use App\Listener;
use App\Models\Referral;
use App\Models\ReferralSettings;
use App\Models\DiscountCodes;
use App\Models\Orders;
use App\Services\TwilioService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ReferralService
{
    protected $twilioService;

    public function __construct(TwilioService $twilioService)
    {
        $this->twilioService = $twilioService;
    }

    public function generateReferralCode(Listener $user)
    {
        if ($user->referral_code) {
            return $user->referral_code;
        }

        $prefix = strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $user->first_name ?: 'USER'), 0, 4));
        $attempts = 0;

        do {
            $code = 'REF-' . $prefix . rand(1000, 9999);
            $exists = Listener::where('referral_code', $code)->exists();
            $attempts++;
        } while ($exists && $attempts < 10);

        if ($exists) {
            $code = 'REF-' . strtoupper(Str::random(8));
        }

        $user->update(['referral_code' => $code]);
        return $code;
    }

    public function sendReferral(Listener $referrer, string $phone, string $type, ?int $chefId = null)
    {
        $settings = ReferralSettings::getSettings();

        if (!$settings || !$settings->is_active) {
            return ['success' => false, 'error' => 'Referral program is currently inactive.'];
        }

        $activeCount = Referral::byReferrer($referrer->id)
            ->whereIn('status', ['pending', 'signed_up', 'completed'])
            ->count();

        if ($activeCount >= $settings->max_referrals_per_customer) {
            return ['success' => false, 'error' => 'You have reached the maximum number of referrals (' . $settings->max_referrals_per_customer . ').'];
        }

        $normalizedPhone = $this->normalizePhone($phone);
        if (!$normalizedPhone) {
            return ['success' => false, 'error' => 'Please enter a valid phone number.'];
        }

        $existingCustomer = Listener::where('phone', $normalizedPhone)
            ->where('user_type', 1)
            ->exists();
        if ($existingCustomer) {
            return ['success' => false, 'error' => 'This person is already a Taist customer.'];
        }

        $duplicatePending = Referral::where('referrer_user_id', $referrer->id)
            ->where('referred_phone', $normalizedPhone)
            ->where('status', 'pending')
            ->exists();
        if ($duplicatePending) {
            return ['success' => false, 'error' => 'You already have a pending referral to this number.'];
        }

        $referralCode = $this->generateReferralCode($referrer);

        $referral = Referral::create([
            'referrer_user_id' => $referrer->id,
            'referral_code' => $referralCode,
            'referral_type' => $type,
            'chef_user_id' => $type === 'chef' ? $chefId : null,
            'referred_phone' => $normalizedPhone,
            'status' => 'pending',
            'sms_sent_at' => now(),
        ]);

        $discountText = $settings->getFormattedDiscount();
        $referrerName = $referrer->first_name ?: 'A friend';

        if ($type === 'chef' && $chefId) {
            $chef = Listener::find($chefId);
            $chefName = $chef ? ($chef->first_name . ' ' . $chef->last_name) : 'a chef';
            $message = "{$referrerName} thinks you'd love {$chefName}'s food on Taist! Get {$discountText} your first order. Download the app: https://taist.app/r/{$referralCode}?chef={$chefId}";
        } else {
            $message = "{$referrerName} invited you to Taist - homemade food from local chefs! Get {$discountText} your first order. Download the app: https://taist.app/r/{$referralCode}";
        }

        $smsResult = $this->twilioService->sendSMS($normalizedPhone, $message, [
            'referral_id' => $referral->id,
            'notification_type' => 'referral_invite',
        ]);

        if (!$smsResult['success']) {
            Log::error('Failed to send referral SMS', [
                'referral_id' => $referral->id,
                'phone' => $normalizedPhone,
                'error' => $smsResult['error'],
            ]);
            return ['success' => false, 'error' => 'Failed to send the invitation text. Please try again.'];
        }

        return ['success' => true, 'data' => $referral];
    }

    public function processSignup(Listener $newUser, ?string $phone)
    {
        if (empty($phone)) {
            return;
        }

        $normalizedPhone = $this->normalizePhone($phone);
        if (!$normalizedPhone) {
            return;
        }

        $referral = Referral::where('referred_phone', $normalizedPhone)
            ->where('status', 'pending')
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$referral) {
            return;
        }

        $settings = ReferralSettings::getSettings();
        if (!$settings || !$settings->is_active) {
            return;
        }

        DB::transaction(function () use ($referral, $newUser, $settings) {
            $discountCode = $this->createReferralDiscountCode(
                'Welcome referral credit - referred by ' . $referral->referral_code,
                $newUser->id
            );

            $referral->update([
                'referred_user_id' => $newUser->id,
                'referred_discount_code_id' => $discountCode ? $discountCode->id : null,
                'status' => 'signed_up',
                'signed_up_at' => now(),
            ]);

            $newUser->update(['referred_by_referral_id' => $referral->id]);

            if ($discountCode) {
                $discountText = $settings->getFormattedDiscount();
                $this->twilioService->sendSMS($newUser->phone, "Welcome to Taist! Use code {$discountCode->code} for {$discountText} your first order.", [
                    'referral_id' => $referral->id,
                    'notification_type' => 'referral_welcome_credit',
                ]);
            }
        });
    }

    public function processOrderCompletion(Orders $order)
    {
        $customer = Listener::find($order->customer_user_id);
        if (!$customer || !$customer->referred_by_referral_id) {
            return;
        }

        $referral = Referral::where('id', $customer->referred_by_referral_id)
            ->where('status', 'signed_up')
            ->first();

        if (!$referral) {
            return;
        }

        $settings = ReferralSettings::getSettings();
        if (!$settings || !$settings->is_active) {
            return;
        }

        DB::transaction(function () use ($referral, $order, $settings) {
            $discountCode = $this->createReferralDiscountCode(
                'Referral reward - friend completed first order (referral ' . $referral->referral_code . ')',
                $referral->referrer_user_id
            );

            $referral->update([
                'status' => 'completed',
                'referrer_discount_code_id' => $discountCode ? $discountCode->id : null,
                'qualifying_order_id' => $order->id,
                'completed_at' => now(),
            ]);

            if ($discountCode) {
                $referrer = Listener::find($referral->referrer_user_id);
                if ($referrer && $referrer->phone) {
                    $discountText = $settings->getFormattedDiscount();
                    $this->twilioService->sendSMS($referrer->phone, "Your friend just placed their first Taist order! You've earned {$discountText}. Use code {$discountCode->code} on your next order.", [
                        'referral_id' => $referral->id,
                        'notification_type' => 'referral_reward_earned',
                    ]);
                }
            }
        });
    }

    public function createReferralDiscountCode(string $description, int $forUserId)
    {
        $settings = ReferralSettings::getSettings();
        if (!$settings) {
            return null;
        }

        $code = 'REFER-' . strtoupper(Str::random(6));
        $attempts = 0;
        while (DiscountCodes::where('code', $code)->exists() && $attempts < 10) {
            $code = 'REFER-' . strtoupper(Str::random(6));
            $attempts++;
        }

        return DiscountCodes::create([
            'code' => $code,
            'description' => $description,
            'discount_type' => $settings->discount_type,
            'discount_value' => $settings->discount_value,
            'max_uses' => 1,
            'max_uses_per_customer' => 1,
            'current_uses' => 0,
            'valid_from' => now(),
            'valid_until' => now()->addDays($settings->credit_expiration_days),
            'minimum_order_amount' => $settings->minimum_order_amount,
            'maximum_discount_amount' => $settings->maximum_discount_amount,
            'is_active' => true,
        ]);
    }

    public function getReferralStats(int $userId)
    {
        $referrals = Referral::byReferrer($userId)->get();

        return [
            'total_sent' => $referrals->count(),
            'pending' => $referrals->where('status', 'pending')->count(),
            'signed_up' => $referrals->where('status', 'signed_up')->count(),
            'completed' => $referrals->where('status', 'completed')->count(),
            'expired' => $referrals->where('status', 'expired')->count(),
        ];
    }

    public function getReferralHistory(int $userId)
    {
        return Referral::byReferrer($userId)
            ->with(['referredUser:id,first_name,last_name', 'chef:id,first_name,last_name', 'referrerDiscountCode:id,code,is_active,valid_until,current_uses'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    private function normalizePhone(string $phone)
    {
        $cleaned = preg_replace('/[^\d+]/', '', $phone);

        if (substr($cleaned, 0, 1) !== '+') {
            if (strlen($cleaned) === 10) {
                $cleaned = '+1' . $cleaned;
            } elseif (strlen($cleaned) === 11 && substr($cleaned, 0, 1) === '1') {
                $cleaned = '+' . $cleaned;
            }
        }

        if (substr($cleaned, 0, 1) !== '+' || strlen($cleaned) < 11 || strlen($cleaned) > 15) {
            return null;
        }

        return $cleaned;
    }
}
