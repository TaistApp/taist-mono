<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Hash;

use App\Listener as Listener;
use App\Models\Allergens as Allergens;
use App\Models\Appliances as Appliances;
use App\Models\Availabilities as Availabilities;
use App\Models\Categories as Categories;
use App\Models\Conversations as Conversations;
use App\Models\Customizations as Customizations;
use App\Models\Meals as Meals;
use App\Models\Menus as Menus;
use App\Models\Orders as Orders;
use App\Models\Reviews as Reviews;
use App\Models\Tickets as Tickets;
use App\Models\Transactions as Transactions;
use App\Models\Zipcodes as Zipcodes;
use App\Models\PaymentMethodListener;
use App\Models\NotificationTemplates;
use App\Models\Version;
use App\Models\DiscountCodes;
use App\Models\DiscountCodeUsage;
use App\Notification;
use App\Services\TwilioService;
use App\Services\OrderSmsService;
use Illuminate\Support\Str;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Twilio\Rest\Client;
use Kreait\Laravel\Firebase\Facades\Firebase;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Exception\FirebaseException;
// use SendGrid\Mail\Mail;
// use SendGrid;

class MapiController extends Controller
{
    protected $request; // request as an attribute of the controllers
    protected $notification; // Push Notification
    protected $orderSmsService; // SMS Notification Service

    public function __construct(Request $request, OrderSmsService $orderSmsService)
    {
        $this->request = $request;
        $this->orderSmsService = $orderSmsService;

        try {
            $this->notification = Firebase::messaging();
        } catch (\Exception $e) {
            // Firebase credentials not available - skip push notifications
            $this->notification = null;
            \Log::warning('Firebase not configured: ' . $e->getMessage());
        }
    }

    private function _generateCode()
    {
        $code = rand(100001, 999999);
        Log::info('thiss code 1 ' . $code);
        return $code;
    }

    private function _getPhonePassword()
    {
        return "Bl(Yq=aUR6yLNpy&C=7ffu";
    }

    private function _taistApiKey()
    {
        return "ra_jk6YK9QmAVqTazHIrF1vi3qnbtagCIJoZAzCR51lCpYY9nkTN6aPVeX15J49k";
    }

    private function _checktaistApiKey($mToken)
    {
        $ret = $this->_taistApiKey() == $mToken;
        $user = $this->_authUser();
        // if ($ret && $user && $user->phone) {
        //     $user = app(Listener::class)->where(['id' => $user->id])->first();
        //     if (time() - $user->token_date > 24*60*60) 
        //         return -1;
        // }
        return $ret;
    }

    private function _generateToken()
    {
        return Str::random(30) . uniqid() . Str::random(30);
    }

    private function _authUser()
    {
        $user = auth()->guard('listener')->user();
        if (!$user)
            $user = auth('mapi')->user();
        return $user;
    }

    private function _sendSMS($user)
    {
        $phone = $user->phone;
        $code = $user->code;
        $phone = preg_replace('/\s+/', '', $user->phone);
        $errorMsg = "";

        // Check if Twilio is configured
        if (!env('TWILIO_SID') || !env('TWILIO_TOKEN') || !env('TWILIO_FROM')) {
            Log::warning('Twilio credentials not configured. Skipping SMS send.');
            return "Twilio credentials not configured";
        }

        try {
            $AccountSid = env('TWILIO_SID');
            $AuthToken = env('TWILIO_TOKEN');
            $msg = "Taist verification code is " . $code;
            $client = new Client($AccountSid, $AuthToken);
            $sms = $client->account->messages->create(
                $phone,
                array(
                    'from' => env('TWILIO_FROM'),
                    'body' => $msg
                )
            );
        } catch (Exception $e) {
            $errorMsg = "Error : " . $e->getMessage();
            Log::error('Twilio SMS Error: ' . $errorMsg);
        }

        return $errorMsg;
    }

    private function _sendSMS2($phoneNumber, $code)
    {
        $phone = preg_replace('/\s+/', '', $phoneNumber);
        $errorMsg = "";

        // Check if Twilio is configured
        if (!env('TWILIO_SID') || !env('TWILIO_TOKEN') || !env('TWILIO_FROM')) {
            Log::warning('Twilio credentials not configured. Skipping SMS send.');
            return "Twilio credentials not configured";
        }

        try {
            $AccountSid = env('TWILIO_SID');
            $AuthToken = env('TWILIO_TOKEN');
            $msg = "Taist verification code is " . $code;
            $client = new Client($AccountSid, $AuthToken);
            $sms = $client->account->messages->create(
                $phone,
                array(
                    'from' => env('TWILIO_FROM'),
                    'body' => $msg
                )
            );
        } catch (Exception $e) {
            $errorMsg = "Error : " . $e->getMessage();
            Log::error('Twilio SMS Error: ' . $errorMsg);
        }

        return $errorMsg;
    }

    // private function _sendEmail($email, $subject, $body) {
    //     include $_SERVER['DOCUMENT_ROOT'].'/include/config.php';
    //     $semail = new Mail(); 
    //     $semail->setFrom("contact@taist.app", "contact");
    //     $semail->setSubject($subject);
    //     $semail->addTo($email);
    //     $semail->addContent("text/html", $body);
    //     $sendgrid = new SendGrid($sendgrid_key);

    //     try {
    //         $response = $sendgrid->send($semail);
    //         // dd($response);
    //         return $response;
    //     } catch (Exception $e) {
    //         $errors = $e->getMessage();
    //         return $errors;
    //     }
    // }

    private function _sendEmail($email, $subject, $body)
    {
        try {
            Mail::send([], [], function ($message) use ($email, $subject, $body) {
                $message->to($email)
                    ->subject($subject)
                    ->setBody($body, 'text/html');
            });

            return true;
        } catch (\Exception $e) {
            return $e->getMessage();
        }
    }

    private function _sendEmail_2($email, $from, $subject, $body)
    {
        $data = array(
            'body' => $body,
            'subject' => $subject,
            'email' => $email,
            'emails' => $from
        );
        $url = "https://medblue.com/api05hc/send_email_api.php";
        $curl = curl_init($url);
        curl_setopt($curl, CURLOPT_POST, true);
        curl_setopt($curl, CURLOPT_POSTFIELDS, http_build_query($data));
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        $response = curl_exec($curl);
        curl_close($curl);
        return $response;
    }

    public function _execCurl($url, $data)
    {
        $curl = curl_init($url);
        curl_setopt($curl, CURLOPT_POST, true);
        curl_setopt($curl, CURLOPT_POSTFIELDS, http_build_query($data));
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        $response = curl_exec($curl);
        curl_close($curl);
        return json_decode($response);
    }

    /** SMS verification */

    public function verifyPhone(Request $request)
    {
        // Validate phone number
        $validator = Validator::make($request->all(), [
            'phone_number' => 'required|string|min:10'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => 0,
                'error' => 'Invalid phone number'
            ]);
        }

        // Generate verification code
        $code = $this->_generateCode();

        // Send SMS using Twilio service
        $twilioService = new TwilioService();
        $result = $twilioService->sendVerificationCode($request->phone_number, $code);

        if (!$result['success']) {
            return response()->json([
                'success' => 0,
                'error' => $result['error']
            ]);
        }

        return response()->json([
            'success' => 1,
            'data' => ['code' => $code]
        ]);
    }

    /** Push Notification */
    public function updateFCMToken(Request $request)
    {

	Log::info('this lat and long'. json_encode($request->all()));
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $user = $this->_authUser();
        $ary = [
            'fcm_token' => $request->fcm_token,
	    'latitude'  => $request->latitude,
	    'longitude' => $request->longitude
        ];

        app(Listener::class)->where('id', $user->id)->update($ary);

        return response()->json(['success' => 1]);
    }

    private function notification($token, $title, $body, $orderID, $role)
    {

        $notificationTitle = $title;
        $notificationBody = $body;

        if ($title === 'Review and tip for Chef') {
            $decodedBody = json_decode($body, true);
            if (isset($decodedBody['tip'])) {
                $notificationBody = $decodedBody['tip'];
            }
        } elseif ($title === 'Review for chef') {
            $decodedBody = json_decode($body, true);
            if (isset($decodedBody['review'])) {
                $notificationBody = $decodedBody['review'];
            }
        } else {
            $notificationBody = $body;
        }

        if ($this->notification) {
            $message = CloudMessage::fromArray([
                'token' => $token,
                'notification' => [
                    'title' => $title,
                    'body' => $notificationBody,
                ],
                'data' => [
                    'order_id' => $orderID,
                    'role' => $role,
                    'body' => $body
                ],
                //'content_available' => true,
                //'priority' => 'high'
            ]);

            $this->notification->send($message);
        } else {
            \Log::warning('Skipping push notification - Firebase not configured');
        }
    }

    public function register(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        if ($request->email) {
            $validator = Validator::make($request->all(), [
                'email' => 'required|email|unique:tbl_users',
                'password' => 'required',
            ]);
        }
        if ($validator->fails()) {
            return response()->json(['success' => 0, 'error' => $validator->errors()->all()[0]]);
        }

        $photo = '';
        if (isset($_FILES['photo']) && $_FILES['photo']['name']) {
            $aname = explode(".", $_FILES['photo']['name']);
            $ext = strtolower($aname[count($aname) - 1]);
            $ext = $_FILES['photo']['type'] == 'image/png' ? 'png' : 'jpg';
            $photo = "user_photo_" . time() . "." . $ext;
            move_uploaded_file($_FILES["photo"]["tmp_name"], 'assets/uploads/images/' . $photo);
            $this->resizeImage($photo, $ext == 'png');
        }

        $api_token = $this->_generateToken();
        $user = Listener::create(['email' => $request->email, 'password' => $request->password, 'api_token' => $api_token]);

        $user_type = isset($request->user_type) ? $request->user_type : 1;

        $user->update([
            'first_name' => isset($request->first_name) ? $request->first_name : '',
            'last_name' => isset($request->last_name) ? $request->last_name : '',
            'phone' => isset($request->phone) ? $request->phone : '',
            'birthday' => isset($request->birthday) ? $request->birthday : 0,
            'address' => isset($request->address) ? $request->address : '',
            'city' => isset($request->city) ? $request->city : '',
            'state' => isset($request->state) ? $request->state : '',
            'zip' => isset($request->zip) ? $request->zip : '',
            'user_type' => $user_type,
            'is_pending' => isset($request->is_pending) ? $request->is_pending : 0,
            'quiz_completed' => ($user_type == 2) ? 0 : 1, // Chefs start with quiz_completed = 0
            'verified' => 1,
            'photo' => isset($photo) && $photo != '' ? $photo : '',
        ]);

        auth()->guard('listener')->attempt(['email' => $request->email, 'password' => $request->password]);
        return response()->json(['success' => 1, 'data' => ['api_token' => $api_token]]);
    }

    public function forgot(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
        ]);
        if ($validator->fails()) {
            return response()->json(['success' => 0, 'error' => "The email is required."]);
        }
        if ($user = app(Listener::class)->where(['email' => $request->email])->first()) {
            $code = $this->_generateCode();
            $user->update(['code' => $code]);
            $msg = '';
            $msg .= "<p><b>" . $code . "</b> is a verification code to reset your password.</p>";
            $msg .= "<p>Thank You! <div>- The Taist Team</div></p>";
            $msg .= "<p><i>If you didn’t make this request, or if you’re having trouble signing in, contact us via contact@taist.app</i></p>";
            $msg .= "<p><img alt='Taist logo' src='http://18.216.154.184/assets/uploads/images/logo-2.png' /></p>";
            $email = $user->email;
            $b = $this->_sendEmail($email, "Taist - Password Reset", $msg);

            Log::info('email Logs', [json_encode($b)]);

            return response()->json(['success' => 1, 'data' => $code]);
        }
        return response()->json(['success' => 0, 'error' => 'The email does not exist.']);
    }

    public function resetpassword(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $validator = Validator::make($request->all(), [
            'password' => 'required',
            'code' => 'required',
        ]);
        if ($validator->fails()) {
            return response()->json(['success' => 0, 'error' => "The password field is required."]);
        }
        if ($user = app(Listener::class)->where(['code' => $request->code])->where('code', '<>', '')->first()) {
            $user->update(['code' => '', 'password' => $request->password]);
            return response()->json(['success' => 1, 'data' => '']);
        }
        return response()->json(['success' => 0, 'error' => 'The email does not exist.']);
    }

    public function login(Request $request)
    {
	Log::info('this latt and longg'. json_encode($request->all()));
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        if ($request->email) {
            $validator = Validator::make($request->all(), [
                'email' => 'required|email',
                'password' => 'required',
            ]);
        }
        if ($validator->fails()) {
            return response()->json(['success' => 0, 'error' => $validator->errors()->all()[0]]);
        }
        $user = app(Listener::class)->where(['email' => $request->email])->first();
        if (auth()->guard('listener')->attempt($request->only('email', 'password'))) {
          //   $api_token = $this->_generateToken();
          //   app(Listener::class)->where(['id' => $user->id])->update(['api_token' => $api_token]);
            if ($user['verified'] == 1) {
                $api_token = $user['api_token'];
                return response()->json(['success' => 1, 'data' => ['api_token' => $api_token, 'user' => $user]]);
            } else {
                return response()->json(['success' => 0, 'error' => 'You need to verify the account first.']);
            }
        }
        if ($user)
            return response()->json(['success' => 0, 'error' => 'The password is not correct.']);
        else
            return response()->json(['success' => 0, 'error' => 'This email is not registered with Taist.']);
    }

    public function logout(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $user = $this->_authUser();
        app(Listener::class)->where(['id' => $user->id])->update(['api_token' => '']);
        auth()->guard('listener')->logout();
        return response()->json(['success' => 1]);
    }

    /**
     * Toggle chef online/offline status
     *
     * POST /mapi/toggle_online
     * Body: {
     *   "is_online": true/false,
     *   "online_start": "2025-12-03 14:00:00" (required when is_online = true),
     *   "online_until": "2025-12-03 17:00:00" (required when is_online = true)
     * }
     */
    public function toggleOnline(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied."]);

        $user = $this->_authUser();

        // Only chefs can toggle online
        if (!$user || $user->user_type != 2) {
            return response()->json([
                'success' => 0,
                'error' => 'Only chefs can toggle online status'
            ]);
        }

        $isOnline = $request->input('is_online', false);

        $updateData = [
            'updated_at' => now()
        ];

        // Track toggle timestamps
        if ($isOnline) {
            // Validate both start and end times are provided
            $onlineStart = $request->input('online_start');
            $onlineUntil = $request->input('online_until');

            if (!$onlineStart || !$onlineUntil) {
                return response()->json([
                    'success' => 0,
                    'error' => 'Both online_start and online_until are required when toggling online'
                ]);
            }

            $onlineStartTimestamp = strtotime($onlineStart);
            $onlineUntilTimestamp = strtotime($onlineUntil);
            $currentTimestamp = time();

            // Validate online_until is after online_start
            if ($onlineUntilTimestamp <= $onlineStartTimestamp) {
                return response()->json([
                    'success' => 0,
                    'error' => 'online_until must be after online_start'
                ]);
            }

            // Validate online_until is in the future
            if ($onlineUntilTimestamp <= $currentTimestamp) {
                return response()->json([
                    'success' => 0,
                    'error' => 'online_until must be a future time'
                ]);
            }

            $updateData['online_start'] = $onlineStart;
            $updateData['online_until'] = $onlineUntil;

            // If start time is now or in the past, toggle online immediately
            if ($onlineStartTimestamp <= $currentTimestamp) {
                $updateData['is_online'] = true;
                $updateData['last_toggled_online_at'] = now();
            } else {
                // Start time is in future - schedule for later, but don't go online yet
                $updateData['is_online'] = false;
            }
        } else {
            // Toggling offline
            $updateData['is_online'] = false;
            $updateData['last_toggled_offline_at'] = now();
            $updateData['online_start'] = null;
            $updateData['online_until'] = null;
        }

        app(Listener::class)->where('id', $user->id)->update($updateData);

        $updatedUser = app(Listener::class)->where('id', $user->id)->first();

        // Log for analytics
        \Log::info('Chef toggled online status', [
            'chef_id' => $user->id,
            'is_online' => $updatedUser->is_online,
            'online_start' => $updatedUser->online_start,
            'online_until' => $updatedUser->online_until,
            'timestamp' => now()
        ]);

        return response()->json([
            'success' => 1,
            'data' => [
                'is_online' => $updatedUser->is_online,
                'online_start' => $updatedUser->online_start,
                'online_until' => $updatedUser->online_until,
                'last_toggled_online_at' => $updatedUser->last_toggled_online_at,
                'last_toggled_offline_at' => $updatedUser->last_toggled_offline_at,
            ]
        ]);
    }

    /**
     * Get chef online status
     *
     * GET /mapi/get_online_status
     */
    public function getOnlineStatus(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied."]);

        $user = $this->_authUser();

        if (!$user) {
            return response()->json(['success' => 0, 'error' => 'User not found']);
        }

        return response()->json([
            'success' => 1,
            'data' => [
                'is_online' => $user->is_online ?? false,
                'online_start' => $user->online_start,
                'online_until' => $user->online_until,
                'last_toggled_online_at' => $user->last_toggled_online_at,
                'last_toggled_offline_at' => $user->last_toggled_offline_at,
            ]
        ]);
    }

    /**
     * Set Availability Override (REVISED TMA-011 Phase 4)
     *
     * Creates or updates a day-specific availability override for a chef
     *
     * POST /mapi/set_availability_override
     *
     * Request body:
     * {
     *   "override_date": "2025-12-04" (YYYY-MM-DD format, required),
     *   "start_time": "14:00" (HH:MM format, optional - null for cancellation),
     *   "end_time": "17:00" (HH:MM format, optional - null for cancellation),
     *   "status": "confirmed|modified|cancelled" (optional, auto-detected),
     *   "source": "manual_toggle|reminder_confirmation" (optional, defaults to manual_toggle)
     * }
     */
    public function setAvailabilityOverride(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied."]);

        $user = $this->_authUser();

        // Only chefs can set availability overrides
        if (!$user || $user->user_type != 2) {
            return response()->json([
                'success' => 0,
                'error' => 'Only chefs can set availability overrides'
            ]);
        }

        // Validate required fields
        $overrideDate = $request->input('override_date');
        if (!$overrideDate) {
            return response()->json([
                'success' => 0,
                'error' => 'override_date is required (YYYY-MM-DD format)'
            ]);
        }

        // Validate date format
        $dateTimestamp = strtotime($overrideDate);
        if (!$dateTimestamp) {
            return response()->json([
                'success' => 0,
                'error' => 'Invalid date format. Use YYYY-MM-DD'
            ]);
        }

        // Validate date is within 0-36 hours from now (per requirements)
        $now = time();
        $maxTime = $now + (36 * 60 * 60); // 36 hours from now
        $overrideDateStart = strtotime($overrideDate . ' 00:00:00');
        $overrideDateEnd = strtotime($overrideDate . ' 23:59:59');

        if ($overrideDateEnd < $now) {
            return response()->json([
                'success' => 0,
                'error' => 'Cannot set override for past dates'
            ]);
        }

        if ($overrideDateStart > $maxTime) {
            return response()->json([
                'success' => 0,
                'error' => 'Can only set overrides for dates within next 36 hours (today/tomorrow)'
            ]);
        }

        $startTime = $request->input('start_time');
        $endTime = $request->input('end_time');
        $source = $request->input('source', 'manual_toggle');

        // Determine status
        $status = $request->input('status');
        if (!$status) {
            // Auto-detect status
            if (!$startTime || !$endTime) {
                $status = 'cancelled';
            } else {
                // Check against weekly schedule to see if modified
                $dayOfWeek = strtolower(date('l', $dateTimestamp));
                $availability = \App\Models\Availabilities::where('user_id', $user->id)->first();

                if ($availability) {
                    $weeklyStart = $availability->{$dayOfWeek . '_start'};
                    $weeklyEnd = $availability->{$dayOfWeek . '_end'};

                    if ($weeklyStart == $startTime && $weeklyEnd == $endTime) {
                        $status = 'confirmed';
                    } else {
                        $status = 'modified';
                    }
                } else {
                    $status = 'modified';
                }
            }
        }

        // Validate time format if provided
        if ($startTime && !preg_match('/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/', $startTime)) {
            return response()->json([
                'success' => 0,
                'error' => 'Invalid start_time format. Use HH:MM'
            ]);
        }

        if ($endTime && !preg_match('/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/', $endTime)) {
            return response()->json([
                'success' => 0,
                'error' => 'Invalid end_time format. Use HH:MM'
            ]);
        }

        // Validate end_time is after start_time if both provided
        if ($startTime && $endTime && strtotime($endTime) <= strtotime($startTime)) {
            return response()->json([
                'success' => 0,
                'error' => 'end_time must be after start_time'
            ]);
        }

        // Create or update override using updateOrCreate
        $override = \App\Models\AvailabilityOverride::updateOrCreate(
            [
                'chef_id' => $user->id,
                'override_date' => $overrideDate,
            ],
            [
                'start_time' => $startTime,
                'end_time' => $endTime,
                'status' => $status,
                'source' => $source,
            ]
        );

        \Log::info('Chef set availability override', [
            'chef_id' => $user->id,
            'override_date' => $overrideDate,
            'start_time' => $startTime,
            'end_time' => $endTime,
            'status' => $status,
            'source' => $source,
            'timestamp' => now()
        ]);

        return response()->json([
            'success' => 1,
            'data' => [
                'id' => $override->id,
                'override_date' => $override->override_date->format('Y-m-d'),
                'start_time' => $override->start_time,
                'end_time' => $override->end_time,
                'status' => $override->status,
                'source' => $override->source,
                'status_message' => $override->getStatusMessage(),
            ]
        ]);
    }

    /**
     * Get Availability Overrides (REVISED TMA-011 Phase 4)
     *
     * Get all availability overrides for the authenticated chef
     * Optionally filter by date range
     *
     * GET /mapi/get_availability_overrides
     *
     * Query params:
     * - start_date (optional): YYYY-MM-DD
     * - end_date (optional): YYYY-MM-DD
     */
    public function getAvailabilityOverrides(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied."]);

        $user = $this->_authUser();

        if (!$user) {
            return response()->json(['success' => 0, 'error' => 'User not found']);
        }

        $query = \App\Models\AvailabilityOverride::forChef($user->id);

        // Filter by date range if provided
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        if ($startDate && $endDate) {
            $query->inDateRange($startDate, $endDate);
        } elseif ($startDate) {
            $query->where('override_date', '>=', $startDate);
        } elseif ($endDate) {
            $query->where('override_date', '<=', $endDate);
        }

        $overrides = $query->orderBy('override_date', 'asc')->get();

        $data = $overrides->map(function ($override) {
            return [
                'id' => $override->id,
                'override_date' => $override->override_date->format('Y-m-d'),
                'start_time' => $override->start_time,
                'end_time' => $override->end_time,
                'status' => $override->status,
                'source' => $override->source,
                'status_message' => $override->getStatusMessage(),
                'created_at' => $override->created_at->format('Y-m-d H:i:s'),
            ];
        });

        return response()->json([
            'success' => 1,
            'data' => $data
        ]);
    }

    /**
     * Get Available Timeslots (TMA-011 REVISED - Backend-Driven)
     *
     * Returns filtered time slots for a chef on a specific date
     * Applies all business logic on backend:
     * - Checks availability overrides
     * - Falls back to weekly schedule
     * - Filters out times < 3 hours from now
     * - Returns only bookable time slots
     *
     * PUBLIC endpoint - customers can call this
     *
     * GET /mapi/get_available_timeslots
     *
     * Query params:
     * - chef_id (required): Chef user ID
     * - date (required): YYYY-MM-DD format
     */
    public function getAvailableTimeslots(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied."]);

        // Validate required parameters
        $chefId = $request->input('chef_id');
        $date = $request->input('date');

        if (!$chefId || !$date) {
            return response()->json([
                'success' => 0,
                'error' => 'chef_id and date are required'
            ]);
        }

        // Verify chef exists
        $chef = app(Listener::class)->where('id', $chefId)->where('user_type', 2)->first();
        if (!$chef) {
            return response()->json(['success' => 0, 'error' => 'Chef not found']);
        }

        // Validate date format
        $dateTimestamp = strtotime($date);
        if (!$dateTimestamp) {
            return response()->json([
                'success' => 0,
                'error' => 'Invalid date format. Use YYYY-MM-DD'
            ]);
        }

        // Calculate 3-hour minimum from now
        $now = time();
        $minimumOrderTime = $now + (3 * 60 * 60);

        // Generate all possible 30-minute time slots for the day (00:00 - 23:30)
        $allSlots = [];
        for ($hour = 0; $hour < 24; $hour++) {
            for ($minute = 0; $minute < 60; $minute += 30) {
                $timeStr = sprintf('%02d:%02d', $hour, $minute);

                // Create timestamp for this slot on the selected date
                $slotTimestamp = strtotime($date . ' ' . $timeStr . ':00');

                // Skip if less than 3 hours from now
                if ($slotTimestamp < $minimumOrderTime) {
                    continue;
                }

                // Check if chef is available at this time using existing logic
                $orderDateTime = $date . ' ' . $timeStr . ':00';
                if ($chef->isAvailableForOrder($orderDateTime)) {
                    $allSlots[] = $timeStr;
                }
            }
        }

        return response()->json([
            'success' => 1,
            'data' => $allSlots
        ]);
    }

    private function resizeImage($file, $png = FALSE, $crop = FALSE)
    {
        $file = 'assets/uploads/images/' . $file;
        list($width, $height) = getimagesize($file);
        $w = 1000;
        $h = 1000;
        $r = $width / $height;
        if ($width <= $w && $height <= $h)
            return false;
        if ($crop) {
            if ($width > $height) {
                $width = ceil($width - ($width * abs($r - $w / $h)));
            } else {
                $height = ceil($height - ($height * abs($r - $w / $h)));
            }
            $newwidth = $w;
            $newheight = $h;
        } else {
            if ($w / $h > $r) {
                $newwidth = $h * $r;
                $newheight = $h;
            } else {
                $newheight = $w / $r;
                $newwidth = $w;
            }
        }
        if ($png)
            $src = imagecreatefrompng($file);
        else
            $src = imagecreatefromjpeg($file);
        $dst = imagecreatetruecolor($newwidth, $newheight);
        imagecopyresampled($dst, $src, 0, 0, 0, 0, $newwidth, $newheight, $width, $height);
        if ($png)
            imagepng($dst, $file);
        else
            imagejpeg($dst, $file, 100);

        return $dst;
    }

    private function toBase($num, $b = 62)
    {
        $base = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $r = $num  % $b;
        $res = $base[$r];
        $q = floor($num / $b);
        while ($q) {
            $r = $q % $b;
            $q = floor($q / $b);
            $res = $base[$r] . $res;
        }
        return $res;
    }

    private function _getFormattedData($data)
    {
        foreach ($data as &$aa) {
            if (isset($aa->updated_at) && strlen($aa->updated_at) > 10)
                $aa->updated_at = strtotime($aa->updated_at);
            if (isset($aa->created_at) && strlen($aa->created_at) > 10)
                $aa->created_at = strtotime($aa->created_at);
            // if (isset($aa->photos)) {
            //     $aa->photos = explode(',', $aa->photos);
            // }
        }
        return $data;
    }

    private function _getFiltered($data, $request, $order = 'desc')
    {
        $user = $this->_authUser();
        $page = isset($request->page) ? $request->page : 1;
        $limit = isset($request->limit) ? $request->limit : $this->_numsPerPage();

        $search = isset($request->search) ? $request->search : '';
        if (isset($request->location))
            $data = $data->whereRaw("location like '%" . $search . "%'");
        $data = $data->whereRaw("(a.title like '%" . $search . "%' OR a.description like '%" . $search . "%' OR a.location like '%" . $search . "%')");

        if ($order == 'desc' || $order == 'asc')
            $data = $data->orderBy('id', $order);
        else if ($order == 'new')
            $data = $data->orderBy('id', 'desc');
        else if ($order == 'location')
            $data = $data->orderBy($order, 'asc');
        else if ($order == 'date')
            $data = $data->orderBy('start', 'asc');
        else if ($order == 'most_interests')
            $data = $data->orderBy('likes', 'desc');
        else if ($order == 'most_going')
            $data = $data->orderBy('likes', 'desc');
        else
            $data = $data->orderBy('id', 'desc');

        $data = $data->limit($limit)->offset(($page - 1) * $limit)->get();
        $data = $this->_getFormattedData($data);
        return $data;
    }

    private function addViews($type, $id)
    {
        if ($row = DB::table('tbl_' . $type)->where(['id' => $id])->first()) {
            $views = $row->views + 1;
            DB::table('tbl_' . $type)->where(['id' => $id])->update(['views' => $views]);
        }
    }

    private function _numsPerPage()
    {
        return 25;
    }

    // ============================ API on auth =======================================

    // Allergens

    public function getAllergens(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = app(Allergens::class)->orderBy('id', 'ASC')->get();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function getAllergen(Request $request, $id)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = app(Allergens::class)->where(['id' => $id])->first();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function createAllergen(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $ary = [
            'name' => $request->name,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        $id = app(Allergens::class)->insertGetId($ary);

        $data = app(Allergens::class)->where(['id' => $id])->first();
        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function updateAllergen(Request $request, $id = "")
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $ary = [
            'name' => $request->name,
            'updated_at' => now(),
        ];

        app(Allergens::class)->where('id', $id)->update($ary);

        $data = app(Allergens::class)->where(['id' => $id])->first();
        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function removeAllergen(Request $request, $id = "")
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $data = app(Allergens::class)->where(['id' => $id])->delete();
        return response()->json(['success' => 1, 'data' => '']);
    }


    // Appliances

    public function getAppliances(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = app(Appliances::class)->orderBy('id', 'ASC')->get();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function getAppliance(Request $request, $id)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = app(Appliances::class)->where(['id' => $id])->first();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function createAppliance(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $ary = [
            'name' => $request->name,
            'image' => '',
            'created_at' => now(),
            'updated_at' => now(),
        ];

        $id = app(Appliances::class)->insertGetId($ary);

        $data = app(Appliances::class)->where(['id' => $id])->first();
        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function updateAppliance(Request $request, $id = "")
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $ary = [
            'name' => $request->name,
            'updated_at' => now(),
        ];

        app(Appliances::class)->where('id', $id)->update($ary);

        $data = app(Appliances::class)->where(['id' => $id])->first();
        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function removeAppliance(Request $request, $id = "")
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $data = app(Appliances::class)->where(['id' => $id])->delete();
        return response()->json(['success' => 1, 'data' => '']);
    }


    // Availabilities

    public function getAvailabilities(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = app(Availabilities::class)->orderBy('id', 'ASC')->get();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function getAvailability(Request $request, $id)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = app(Availabilities::class)->where(['id' => $id])->first();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function createAvailability(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $user = $this->_authUser();
        $ary = [
            'user_id' => $user['id'],
            'bio' => $request->bio,
            'monday_start' => $request->monday_start,
            'monday_end' => $request->monday_end,
            'tuesday_start' => $request->tuesday_start,
            'tuesday_end' => $request->tuesday_end,
            'wednesday_start' => $request->wednesday_start,
            'wednesday_end' => $request->wednesday_end,
            'thursday_start' => $request->thursday_start,
            'thursday_end' => $request->thursday_end,
            'friday_start' => $request->friday_start,
            'friday_end' => $request->friday_end,
            'saterday_start' => $request->saterday_start,
            'saterday_end' => $request->saterday_end,
            'sunday_start' => $request->sunday_start,
            'sunday_end' => $request->sunday_end,
            'minimum_order_amount' => $request->minimum_order_amount,
            'max_order_distance' => $request->max_order_distance,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        $id = app(Availabilities::class)->insertGetId($ary);

        $data = app(Availabilities::class)->where(['id' => $id])->first();
        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function updateAvailability(Request $request, $id = "")
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $user = $this->_authUser();
        $ary = [
            'user_id' => $user['id'],
            'bio' => $request->bio,
            'monday_start' => $request->monday_start,
            'monday_end' => $request->monday_end,
            'tuesday_start' => $request->tuesday_start,
            'tuesday_end' => $request->tuesday_end,
            'wednesday_start' => $request->wednesday_start,
            'wednesday_end' => $request->wednesday_end,
            'thursday_start' => $request->thursday_start,
            'thursday_end' => $request->thursday_end,
            'friday_start' => $request->friday_start,
            'friday_end' => $request->friday_end,
            'saterday_start' => $request->saterday_start,
            'saterday_end' => $request->saterday_end,
            'sunday_start' => $request->sunday_start,
            'sunday_end' => $request->sunday_end,
            'minimum_order_amount' => $request->minimum_order_amount,
            'max_order_distance' => $request->max_order_distance,
            'updated_at' => now(),
        ];

        app(Availabilities::class)->where('id', $id)->update($ary);

        $data = app(Availabilities::class)->where(['id' => $id])->first();
        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function removeAvailability(Request $request, $id = "")
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $data = app(Availabilities::class)->where(['id' => $id])->delete();
        return response()->json(['success' => 1, 'data' => '']);
    }


    // Categories

    public function getCategories(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = app(Categories::class)->orderBy('id', 'ASC')->get();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function getCategory(Request $request, $id)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = app(Categories::class)->where(['id' => $id])->first();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function createCategory(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $ary = [
            'name' => $request->name,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        $id = app(Categories::class)->insertGetId($ary);

        $data = app(Categories::class)->where(['id' => $id])->first();
        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function updateCategory(Request $request, $id = "")
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $ary = [
            'name' => $request->name,
            'updated_at' => now(),
        ];

        app(Categories::class)->where('id', $id)->update($ary);

        $data = app(Categories::class)->where(['id' => $id])->first();
        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function removeCategory(Request $request, $id = "")
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $data = app(Categories::class)->where(['id' => $id])->delete();
        return response()->json(['success' => 1, 'data' => '']);
    }


    // Conversations

    public function getConversations(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = app(Conversations::class)->orderBy('id', 'DESC')->get();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function getConversation(Request $request, $id)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = app(Conversations::class)->where(['id' => $id])->first();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function createConversation(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $ary = [
            'order_id' => $request->order_id,
            'from_user_id' => $request->from_user_id,
            'to_user_id' => $request->to_user_id,
            'message' => $request->message,
            'created_at' => time(),
            'updated_at' => now(),
        ];

        $id = app(Conversations::class)->insertGetId($ary);

        $data = app(Conversations::class)->where(['id' => $id])->first();
        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function updateConversation(Request $request, $id = "")
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $ary = [
            'order_id' => $request->order_id,
            'from_user_id' => $request->from_user_id,
            'to_user_id' => $request->to_user_id,
            'message' => $request->message,
            'is_viewed' => $request->is_viewed,
            'updated_at' => now(),
        ];

        app(Conversations::class)->where('id', $id)->update($ary);

        $data = app(Conversations::class)->where(['id' => $id])->first();
        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function removeConversation(Request $request, $id = "")
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $data = app(Conversations::class)->where(['id' => $id])->delete();
        return response()->json(['success' => 1, 'data' => '']);
    }


    // Customizations

    public function getCustomizations(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = app(Customizations::class)->orderBy('id', 'ASC')->get();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function getCustomization(Request $request, $id)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = app(Customizations::class)->where(['id' => $id])->first();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function createCustomization(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $ary = [
            'menu_id' => $request->menu_id,
            'name' => $request->name,
            'upcharge_price' => $request->upcharge_price,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        $id = app(Customizations::class)->insertGetId($ary);

        $data = app(Customizations::class)->where(['id' => $id])->first();
        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function updateCustomization(Request $request, $id = "")
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $ary = [
            'menu_id' => $request->menu_id,
            'name' => $request->name,
            'upcharge_price' => $request->upcharge_price,
            'updated_at' => now(),
        ];

        app(Customizations::class)->where('id', $id)->update($ary);

        $data = app(Customizations::class)->where(['id' => $id])->first();
        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function removeCustomization(Request $request, $id = "")
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $data = app(Customizations::class)->where(['id' => $id])->delete();
        return response()->json(['success' => 1, 'data' => '']);
    }


    // Menus

    public function getMenus(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = app(Menus::class)->orderBy('id', 'ASC')->get();

        foreach ($data as &$item) {
            $item->customizations = app(Customizations::class)->where(['menu_id' => $item->id])->get();
        }

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function getMenu(Request $request, $id)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = app(Menus::class)->where(['id' => $id])->first();
        $data['customizations'] = app(Customizations::class)->where(['menu_id' => $id])->get();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function createMenu(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $user = $this->_authUser();
        $ary = [
            'user_id' => $user->id,
            'title' => $request->title,
            'description' => $request->description,
            'price' => $request->price,
            'serving_size' => $request->serving_size && $request->serving_size > 0 ? $request->serving_size : 1,
            'meals' => $request->meals,
            'category_ids' => $request->category_ids,
            'allergens' => isset($request->allergens) ? $request->allergens : '',
            'appliances' => isset($request->appliances) ? $request->appliances : '',
            'estimated_time' => $request->estimated_time,
            'is_live' => $request->is_live,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        $id = app(Menus::class)->insertGetId($ary);

        if (isset($request->customizations)) {
            $customizations = json_decode($request->customizations, true);

            $customizations_data = [];
            foreach ($customizations as $c) {
                $customizations_data[] = [
                    'menu_id' => $id,
                    'name' => $c['name'],
                    'upcharge_price' => $c['upcharge_price'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            if (count($customizations_data) > 0) app(Customizations::class)->insert($customizations_data);
        }

        $data = app(Menus::class)->where(['id' => $id])->first();
        $data['customizations'] = app(Customizations::class)->where(['menu_id' => $id])->get();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function updateMenu(Request $request, $id = "")
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $user = $this->_authUser();
        $ary = [
            'user_id' => $user->id,
            'updated_at' => now(),
        ];

        if ($request->title) $ary['title'] = $request->title;
        if ($request->description) $ary['description'] = $request->description;
        if ($request->price) $ary['price'] = $request->price;
        if (isset($request->serving_size)) {
            $ary['serving_size'] = $request->serving_size && $request->serving_size > 0 ? $request->serving_size : 1;
        }
        if ($request->meals) $ary['meals'] = $request->meals;
        if ($request->category_ids) $ary['category_ids'] = $request->category_ids;
        if ($request->allergens) $ary['allergens'] = $request->allergens;
        if ($request->appliances) $ary['appliances'] = $request->appliances;
        if ($request->estimated_time) $ary['estimated_time'] = $request->estimated_time;
        if (isset($request->is_live)) $ary['is_live'] = $request->is_live;

        app(Menus::class)->where('id', $id)->update($ary);

        app(Customizations::class)->where(['menu_id' => $id])->delete();

        $customizations = json_decode($request->customizations, true);

        $customizations_data = [];
        foreach ($customizations as $c) {
            $customizations_data[] = [
                'menu_id' => $id,
                'name' => $c['name'],
                'upcharge_price' => $c['upcharge_price'],
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        if (count($customizations_data) > 0) app(Customizations::class)->insert($customizations_data);

        $data = app(Menus::class)->where(['id' => $id])->first();
        $data['customizations'] = app(Customizations::class)->where(['menu_id' => $id])->get();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    /**
     * Generate AI description for menu item
     */
    public function generateMenuDescription(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $user = $this->_authUser();

        try {
            $openAI = new \App\Services\OpenAIService();

            $dishName = $request->dish_name ?? '';

            if (empty($dishName)) {
                return response()->json([
                    'success' => 0,
                    'error' => 'Dish name is required'
                ]);
            }

            $prompt = "You are a professional food writer for Taist, a personal chef marketplace.

Write a concise, professional menu description for: {$dishName}

CRITICAL SAFETY REQUIREMENT:
- Generate SAFE, BASIC descriptions that match standard, recognizable dish types
- If it's pizza, write a BASIC pizza description (e.g., \"Margherita pizza with tomato sauce, mozzarella, and fresh basil\" or \"Pepperoni pizza with mozzarella cheese\")
- If it's pasta, write a BASIC pasta description (e.g., \"Spaghetti with marinara sauce and meatballs\" or \"Fettuccine alfredo with parmesan cheese\")
- DO NOT create weird, creative, or unusual interpretations of common dishes
- Stick to standard, recognizable preparations that customers would expect
- When in doubt, choose the most common, basic version of the dish

REQUIREMENTS:
- Perfect spelling and grammar
- 1 sentence, 100-150 characters maximum
- List main components: protein, base, vegetables, sauce/garnish
- Specific cooking methods (grilled, roasted, pan-seared, baked)
- NO flowery language (no \"divine,\" \"heavenly,\" \"succulent,\" \"timeless,\" \"classic reimagined\")
- Sound like a real chef, not a marketing copywriter

GOOD EXAMPLES (SAFE & BASIC):
✓ \"Grilled lemon-garlic chicken over turmeric quinoa with roasted vegetables, avocado, tahini-lime drizzle, and microgreens.\"
✓ \"Pan-seared salmon with herb butter over garlic mashed potatoes and charred broccolini.\"
✓ \"Margherita pizza with tomato sauce, fresh mozzarella, and basil.\"
✓ \"Spaghetti with marinara sauce, ground beef meatballs, and parmesan cheese.\"

BAD EXAMPLES:
✗ \"A timeless classic reimagined: tender chicken lightly breaded and sautéed to a crisp, crowned with melted mozzarella\" (too flowery, too long)
✗ \"Chicken and rice\" (too plain)
✗ \"Deconstructed pizza with molecular gastronomy foam\" (too weird/creative for basic pizza)
✗ \"Pizza with unexpected flavor combinations and avant-garde toppings\" (not safe/basic)

Write only the description:";

            $result = $openAI->chat(
                $prompt,
                \App\Services\OpenAIService::MODEL_GPT_5_MINI,
                ['temperature' => 0.7, 'max_tokens' => 200]
            );

            if ($result['success']) {
                return response()->json([
                    'success' => 1,
                    'description' => trim($result['content'])
                ]);
            } else {
                return response()->json([
                    'success' => 0,
                    'error' => 'Failed to generate description'
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Generate Menu Description Error', [
                'message' => $e->getMessage(),
                'dish_name' => $request->dish_name
            ]);

            return response()->json([
                'success' => 0,
                'error' => 'An error occurred while generating description'
            ]);
        }
    }

    /**
     * Enhance/correct menu description (spell check, grammar)
     */
    public function enhanceMenuDescription(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $user = $this->_authUser();

        try {
            $openAI = new \App\Services\OpenAIService();

            $description = $request->description ?? '';

            if (empty($description)) {
                return response()->json([
                    'success' => 0,
                    'error' => 'Description is required'
                ]);
            }

            $prompt = "You are a professional editor for Taist, a personal chef marketplace. Your job is to fix ALL errors while maintaining the chef's voice.

ORIGINAL DESCRIPTION:
{$description}

YOUR TASK (MANDATORY - YOU MUST FIX ALL OF THESE):
1. Fix ALL spelling errors - check every word for correct spelling
2. Fix ALL grammar mistakes - ensure subject-verb agreement, proper tense, correct word usage
3. Fix ALL punctuation errors - add missing periods, commas, apostrophes; remove extra punctuation; fix quotation marks
4. Ensure proper capitalization - capitalize proper nouns, start sentences with capitals
5. Fix spacing errors - remove extra spaces, ensure single spaces between words
6. Make it sound professional but keep the original meaning
7. If it's too casual or has slang, make it more professional
8. If it's missing key details, keep what's there but ensure it reads well

CRITICAL: You MUST actively identify and correct spelling mistakes (e.g., \"reciepe\" → \"recipe\", \"restaraunt\" → \"restaurant\", \"delicous\" → \"delicious\") and punctuation errors (e.g., missing apostrophes in \"dont\" → \"don't\", missing commas, incorrect periods).

DO NOT:
- Add flowery language that wasn't there
- Change the core ingredients or dish description
- Add information the chef didn't provide
- Make it overly formal or stuffy
- Skip fixing spelling or punctuation errors - this is your primary job

Output ONLY the corrected description with all spelling and punctuation fixed, nothing else:";

            $result = $openAI->chat(
                $prompt,
                \App\Services\OpenAIService::MODEL_GPT_5_MINI,
                ['temperature' => 0.3, 'max_tokens' => 200]
            );

            if ($result['success']) {
                return response()->json([
                    'success' => 1,
                    'enhanced_description' => trim($result['content'])
                ]);
            } else {
                return response()->json([
                    'success' => 0,
                    'error' => 'Failed to enhance description'
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Enhance Menu Description Error', [
                'message' => $e->getMessage(),
                'description' => $request->description
            ]);

            return response()->json([
                'success' => 0,
                'error' => 'An error occurred while enhancing description'
            ]);
        }
    }

    /**
     * Analyze menu description and suggest metadata
     */
    public function analyzeMenuMetadata(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $user = $this->_authUser();

        try {
            $openAI = new \App\Services\OpenAIService();

            $dishName = $request->dish_name ?? '';
            $description = $request->description ?? '';

            if (empty($dishName) || empty($description)) {
                return response()->json([
                    'success' => 0,
                    'error' => 'Dish name and description are required'
                ]);
            }

            // Get appliances, allergens, and categories from database
            $appliances = app(Appliances::class)->select('id', 'name')->get();
            $allergens = app(Allergens::class)->select('id', 'name')->get();
            $categories = app(Categories::class)->select('id', 'name')->get();

            $appliancesJson = json_encode($appliances);
            $allergensJson = json_encode($allergens);
            $categoriesJson = json_encode($categories);

            $prompt = "Based on this menu item, provide estimates in JSON format.

Dish: {$dishName}
Description: {$description}

Provide:
1. estimated_time: prep + cook time in minutes (choose from: 15, 30, 45, 60, 90, 120)
2. appliance_ids: array of appliance IDs needed. Available: {$appliancesJson}
3. allergen_ids: array of allergen IDs present. Available: {$allergensJson}
4. category_ids: array of category IDs that fit this dish. Available: {$categoriesJson}

Make safe, reasonable guesses based on the dish name and description. If unsure, make your best educated guess.

Respond ONLY with valid JSON:
{
  \"estimated_time\": 60,
  \"appliance_ids\": [1, 3],
  \"allergen_ids\": [2, 5],
  \"category_ids\": [7]
}";

            $result = $openAI->chat(
                $prompt,
                \App\Services\OpenAIService::MODEL_GPT_5_MINI,
                ['temperature' => 0.3, 'max_tokens' => 150]
            );

            if ($result['success']) {
                // Parse the JSON response
                $content = trim($result['content']);

                // Remove markdown code blocks if present
                $content = preg_replace('/```json\s*/', '', $content);
                $content = preg_replace('/```\s*/', '', $content);
                $content = trim($content);

                $metadata = json_decode($content, true);

                if (json_last_error() !== JSON_ERROR_NONE) {
                    Log::error('JSON Parse Error in analyzeMenuMetadata', [
                        'content' => $content,
                        'error' => json_last_error_msg()
                    ]);
                    return response()->json([
                        'success' => 0,
                        'error' => 'Failed to parse AI response'
                    ]);
                }

                return response()->json([
                    'success' => 1,
                    'metadata' => [
                        'estimated_time' => $metadata['estimated_time'] ?? 60,
                        'appliance_ids' => $metadata['appliance_ids'] ?? [],
                        'allergen_ids' => $metadata['allergen_ids'] ?? [],
                        'category_ids' => $metadata['category_ids'] ?? []
                    ]
                ]);
            } else {
                return response()->json([
                    'success' => 0,
                    'error' => 'Failed to analyze metadata'
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Analyze Menu Metadata Error', [
                'message' => $e->getMessage(),
                'dish_name' => $request->dish_name
            ]);

            return response()->json([
                'success' => 0,
                'error' => 'An error occurred while analyzing metadata'
            ]);
        }
    }

    /**
     * Generate 3 AI reviews based on an authentic review
     * Called automatically when a new authentic review is created
     */
    public function generateAIReviews(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $user = $this->_authUser();

        try {
            $reviewId = $request->review_id ?? null;

            if (!$reviewId) {
                return response()->json([
                    'success' => 0,
                    'error' => 'Review ID is required'
                ]);
            }

            // Get the authentic review
            $authenticReview = app(Reviews::class)->find($reviewId);

            if (!$authenticReview) {
                return response()->json([
                    'success' => 0,
                    'error' => 'Review not found'
                ]);
            }

            if ($authenticReview->source === 'ai_generated') {
                return response()->json([
                    'success' => 0,
                    'error' => 'Cannot generate AI reviews from an AI review'
                ]);
            }

            // Check if AI reviews already exist for this review
            $existingAI = app(Reviews::class)
                ->where('parent_review_id', $reviewId)
                ->count();

            if ($existingAI >= 3) {
                return response()->json([
                    'success' => 0,
                    'error' => 'AI reviews already generated for this review'
                ]);
            }

            $openAI = new \App\Services\OpenAIService();

            // Generate 3 unique AI reviews with different characteristics
            $generatedReviews = [];
            $variants = [
                ['focus' => 'food_quality', 'length' => 'short'],
                ['focus' => 'presentation_service', 'length' => 'medium'],
                ['focus' => 'overall_experience', 'length' => 'medium']
            ];

            foreach ($variants as $index => $variant) {
                $prompt = $this->buildAIReviewPrompt(
                    $authenticReview->rating,
                    $authenticReview->review,
                    $variant['focus'],
                    $variant['length']
                );

                $result = $openAI->chat(
                    $prompt,
                    \App\Services\OpenAIService::MODEL_GPT_5_MINI,
                    ['max_tokens' => 150]
                );

                if ($result['success']) {
                    $aiReviewText = trim($result['content']);

                    // Create AI review record
                    $aiReview = app(Reviews::class)->create([
                        'order_id' => $authenticReview->order_id,
                        'from_user_id' => $authenticReview->from_user_id,
                        'to_user_id' => $authenticReview->to_user_id,
                        'rating' => $this->varyRating($authenticReview->rating),
                        'review' => $aiReviewText,
                        'tip_amount' => 0,
                        'source' => 'ai_generated',
                        'parent_review_id' => $reviewId,
                        'ai_generation_params' => json_encode([
                            'model' => 'gpt-5-mini',
                            'variant' => $index + 1,
                            'focus' => $variant['focus'],
                            'length' => $variant['length'],
                            'generated_at' => time()
                        ]),
                        'created_at' => date('Y-m-d H:i:s'),
                        'updated_at' => date('Y-m-d H:i:s')
                    ]);

                    $generatedReviews[] = $aiReview;
                }
            }

            return response()->json([
                'success' => 1,
                'message' => 'Generated ' . count($generatedReviews) . ' AI reviews',
                'reviews' => $generatedReviews
            ]);

        } catch (\Exception $e) {
            Log::error('Generate AI Reviews Error', [
                'message' => $e->getMessage(),
                'review_id' => $request->review_id
            ]);

            return response()->json([
                'success' => 0,
                'error' => 'An error occurred while generating AI reviews'
            ]);
        }
    }

    /**
     * Build AI review prompt based on authentic review
     */
    private function buildAIReviewPrompt($rating, $reviewText, $focus, $length)
    {
        $ratingDescription = $this->getRatingDescription($rating);
        $lengthGuide = $length === 'short' ? '40-70 characters' : '70-100 characters';

        $focusInstructions = [
            'food_quality' => 'Focus on taste, flavors, ingredients, and cooking technique.',
            'presentation_service' => 'Focus on plating, presentation, and chef professionalism.',
            'overall_experience' => 'Focus on overall satisfaction and value for money.'
        ];

        return "You are writing a {$ratingDescription} customer review for a personal chef on Taist.

AUTHENTIC REVIEW (as reference):
Rating: {$rating}/5 stars
Review: \"{$reviewText}\"

YOUR TASK:
Write a NEW, UNIQUE review that feels natural and authentic. DO NOT copy the original review.

REQUIREMENTS:
- {$lengthGuide} maximum
- Match the {$rating}-star rating sentiment ({$ratingDescription})
- {$focusInstructions[$focus]}
- Sound like a real customer, not AI
- Be specific but varied from the original review
- NO flowery language (no \"divine,\" \"heavenly,\" \"exquisite,\" \"timeless\")
- NO generic phrases (\"good food,\" \"nice meal,\" \"great experience\")

GOOD EXAMPLES (for 5-star):
✓ \"The grilled chicken was perfectly seasoned and the sides were fresh. Great meal!\"
✓ \"Loved the presentation and flavors. Chef really knows what they're doing.\"
✓ \"Fresh ingredients, excellent cooking. Would definitely order again.\"

BAD EXAMPLES:
✗ \"Amazing food, would order again!\" (too generic)
✗ \"A divine culinary masterpiece\" (too flowery)
✗ Just repeating the original review (must be unique)

Write only the review text:";
    }

    /**
     * Get rating description for prompt
     */
    private function getRatingDescription($rating)
    {
        if ($rating >= 4.5) return 'very positive';
        if ($rating >= 4.0) return 'positive';
        if ($rating >= 3.0) return 'neutral to positive';
        if ($rating >= 2.0) return 'mixed';
        return 'critical';
    }

    /**
     * Slightly vary the rating to add realism
     * 5-star → 4.5-5.0
     * 4-star → 3.5-4.5
     * Variance adds authenticity without changing sentiment
     */
    private function varyRating($originalRating)
    {
        // Add small random variance (-0.5 to +0.5)
        $variance = (rand(0, 10) / 20); // 0 to 0.5
        $direction = rand(0, 1) ? 1 : -1;

        $newRating = $originalRating + ($direction * $variance);

        // Keep within 1-5 range
        $newRating = max(1, min(5, $newRating));

        // Round to nearest 0.5
        $newRating = round($newRating * 2) / 2;

        return $newRating;
    }

    public function removeMenu(Request $request, $id = "")
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $data = app(Menus::class)->where(['id' => $id])->delete();
        return response()->json(['success' => 1, 'data' => '']);
    }


    // Orders

    public function getOrders(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        //$data = app(Orders::class)->orderBy('id','ASC')->get();
        $data = DB::table('tbl_orders as o')->leftJoin('tbl_reviews as r', 'r.order_id', '=', 'o.id')->select(['o.*', 'r.rating as rating', 'r.review as review', 'r.tip_amount as tip_amount'])->orderBy('id', 'ASC')->get();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function getOrder(Request $request, $id)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        //$data = app(Orders::class)->where(['id' => $id])->first();
        $data = DB::table('tbl_orders as o')->leftJoin('tbl_reviews as r', 'r.order_id', '=', 'o.id')->where(['o.id' => $id])->select(['o.*', 'r.rating as rating', 'r.review as review', 'r.tip_amount as tip_amount'])->first();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function getOrderData(Request $request, $id)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = app(Orders::class)->where(['id' => $id])->first();
        if ($data) {
            $data->chef = app(Listener::class)->where(['id' => $data->chef_user_id])->first();
            $data->customer = app(Listener::class)->where(['id' => $data->customer_user_id])->first();
            $data->menu = app(Menus::class)->where(['id' => $data->menu_id])->first();

            // Add acceptance deadline info if order is in requested status
            if ($data->status == 1 && $data->acceptance_deadline) {
                $data->deadline_info = $data->getDeadlineInfo();
            }
        }

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function createOrder(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        // ===== TMA-011: Validate 3-hour minimum window =====
        $orderDate = $request->order_date;
        $orderTimestamp = strtotime($orderDate);
        $currentTimestamp = time();
        $minimumOrderTime = $currentTimestamp + (3 * 60 * 60); // 3 hours from now

        if ($orderTimestamp < $minimumOrderTime) {
            $hoursNeeded = ceil(($minimumOrderTime - $orderTimestamp) / 3600);
            return response()->json([
                'success' => 0,
                'error' => "Orders must be placed at least 3 hours in advance. Please select a delivery time at least {$hoursNeeded} hours from now.",
                'minimum_order_timestamp' => $minimumOrderTime,
                'requested_timestamp' => $orderTimestamp,
            ]);
        }

        // ===== TMA-011 REVISED: Validate chef availability (uses override logic) =====
        $chef = app(Listener::class)->where('id', $request->chef_user_id)->first();

        if (!$chef) {
            return response()->json(['success' => 0, 'error' => 'Chef not found']);
        }

        // Use the override-aware availability check
        if (!$chef->isAvailableForOrder($orderDate)) {
            return response()->json([
                'success' => 0,
                'error' => 'This chef is not available at the requested time. Please select a different delivery time or try again later.',
                'chef_unavailable' => true,
            ]);
        }
        // ===== END TMA-011 REVISED VALIDATION =====

        $chef_payment_method = app(PaymentMethodListener::class)->where(['user_id' => $request->chef_user_id, 'active' => 1])->first();
        if ($chef_payment_method) {
            require_once('../stripe-php/init.php');
            $stripe = new \Stripe\StripeClient(env('STRIPE_SECRET'));

            $stripe_account_info = $stripe->accounts->retrieve($chef_payment_method->stripe_account_id, []);
            //return response()->json(['success' => 0, 'data' => $stripe_account_info]);          
            if (!$stripe_account_info || $stripe_account_info->charges_enabled == false) {
                return response()->json(['success' => 0, 'error' => "The chef didn't complete the payment method request."]);
            }
        } else {
            return response()->json(['success' => 0, 'error' => "The chef didn't connect the payment method."]);
        }

        // Handle discount code if provided
        $discountCodeId = null;
        $discountCode = null;
        $discountAmount = 0;
        $subtotalBeforeDiscount = null;
        $finalTotalPrice = $request->total_price;

        if ($request->has('discount_code') && !empty($request->discount_code)) {
            $code = app(DiscountCodes::class)
                ->where('code', strtoupper($request->discount_code))
                ->first();

            if (!$code) {
                return response()->json(['success' => 0, 'error' => 'Invalid discount code']);
            }

            // Validate code
            $validationResult = $code->isValid();
            if (!$validationResult['valid']) {
                return response()->json(['success' => 0, 'error' => $validationResult['reason']]);
            }

            // Check customer usage
            $customerCheck = $code->canCustomerUse($request->customer_user_id);
            if (!$customerCheck['valid']) {
                return response()->json(['success' => 0, 'error' => $customerCheck['reason']]);
            }

            // Calculate discount
            $discountResult = $code->calculateDiscount($request->total_price);
            if (!$discountResult['valid']) {
                return response()->json(['success' => 0, 'error' => $discountResult['reason']]);
            }

            $discountCodeId = $code->id;
            $discountCode = $code->code;
            $discountAmount = $discountResult['discount_amount'];
            $subtotalBeforeDiscount = $request->total_price;
            $finalTotalPrice = $discountResult['final_amount'];
        }

        $currentTimestamp = time();

        $ary = [
            'chef_user_id' => $request->chef_user_id,
            'menu_id' => $request->menu_id,
            'customer_user_id' => $request->customer_user_id,
            'amount' => $request->amount,
            'total_price' => $finalTotalPrice, // Use discounted price
            'addons' => isset($request->addons) ? $request->addons : '',
            'address' => $request->address,
            'order_date' => $request->order_date,
            'status' => isset($request->status) ? $request->status : 1,
            'notes' => isset($request->notes) ? $request->notes : '',
            // Discount fields
            'discount_code_id' => $discountCodeId,
            'discount_code' => $discountCode,
            'discount_amount' => $discountAmount,
            'subtotal_before_discount' => $subtotalBeforeDiscount,
            // Chef acceptance deadline - 30 minutes (1800 seconds) from order creation
            'acceptance_deadline' => (string)($currentTimestamp + 1800),
            'created_at' => $currentTimestamp,
            'updated_at' => now(),
        ];

        $id = app(Orders::class)->insertGetId($ary);

        // Record discount usage if code was applied
        if ($discountCodeId) {
            app(DiscountCodeUsage::class)->create([
                'discount_code_id' => $discountCodeId,
                'order_id' => $id,
                'customer_user_id' => $request->customer_user_id,
                'discount_amount' => $discountAmount,
                'order_total_before_discount' => $subtotalBeforeDiscount,
                'order_total_after_discount' => $finalTotalPrice,
            ]);

            // Increment usage counter
            app(DiscountCodes::class)->where('id', $discountCodeId)->increment('current_uses');
        }

        $data = app(Orders::class)->where(['id' => $id])->first();

        $user = app(Listener::class)->where(['id' => $request->chef_user_id])->first();
        if ($user->fcm_token) {
            $notification = app(NotificationTemplates::class)->where(['id' => 6])->first();
            try {
                $this->notification($user->fcm_token, $notification->subject, $notification->push, $id, $role = 'chef');
                Notification::create([
                    'title' => $notification->template_name,
                    'body' => $notification->push,
                    'image' => $user->photo ?? 'N/A',
                    'fcm_token' => $user->fcm_token,
                    'user_id' => $user->id,
                    'navigation_id' => $data->id,
                    'role' => $role,
                ]);
            } catch (FirebaseException $e) {
                $errorMsg = $e->getMessage();
            }
        }

        // Send SMS notification to chef about new order
        try {
            $this->orderSmsService->sendNewOrderNotification($id);
        } catch (Exception $e) {
            // Log error but don't block order creation
            Log::error('Failed to send new order SMS notification', [
                'order_id' => $id,
                'error' => $e->getMessage()
            ]);
        }

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function updateOrder(Request $request, $id = "")
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $ary = [
            'updated_at' => now(),
        ];

        if ($request->chef_user_id) $ary['chef_user_id'] = $request->chef_user_id;
        if ($request->menu_id) $ary['menu_id'] = $request->menu_id;
        if ($request->customer_user_id) $ary['customer_user_id'] = $request->customer_user_id;
        if ($request->amount) $ary['amount'] = $request->amount;
        if ($request->total_price) $ary['total_price'] = $request->total_price;
        if ($request->addons) $ary['addons'] = $request->addons;
        if ($request->address) $ary['address'] = $request->address;
        if ($request->order_date) $ary['order_date'] = $request->order_date;
        if ($request->status) $ary['status'] = $request->status;
        if ($request->notes) $ary['notes'] = $request->notes;

        app(Orders::class)->where('id', $id)->update($ary);

        $data = app(Orders::class)->where(['id' => $id])->first();
        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function removeOrder(Request $request, $id = "")
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $data = app(Orders::class)->where(['id' => $id])->delete();
        return response()->json(['success' => 1, 'data' => '']);
    }

    // Discount Codes

    public function validateDiscountCode(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        // Validate required fields
        $validator = Validator::make($request->all(), [
            'code' => 'required|string',
            'order_amount' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => 0,
                'error' => $validator->errors()->first()
            ]);
        }

        // Get authenticated user
        $user = $this->_authUser();
        if (!$user) {
            return response()->json(['success' => 0, 'error' => 'User not authenticated']);
        }

        // Find discount code
        $discountCode = app(DiscountCodes::class)
            ->where('code', strtoupper($request->code))
            ->first();

        if (!$discountCode) {
            return response()->json(['success' => 0, 'error' => 'Invalid discount code']);
        }

        // Check if code is valid
        $validationResult = $discountCode->isValid();
        if (!$validationResult['valid']) {
            return response()->json(['success' => 0, 'error' => $validationResult['reason']]);
        }

        // Check if customer can use this code
        $customerCheck = $discountCode->canCustomerUse($user->id);
        if (!$customerCheck['valid']) {
            return response()->json(['success' => 0, 'error' => $customerCheck['reason']]);
        }

        // Calculate discount
        $discountResult = $discountCode->calculateDiscount($request->order_amount);
        if (!$discountResult['valid']) {
            return response()->json(['success' => 0, 'error' => $discountResult['reason']]);
        }

        // Return success with discount details
        return response()->json([
            'success' => 1,
            'data' => [
                'code' => $discountCode->code,
                'discount_type' => $discountCode->discount_type,
                'discount_amount' => $discountResult['discount_amount'],
                'final_amount' => $discountResult['final_amount'],
                'description' => $discountCode->description ?? $discountCode->getFormattedDiscount(),
            ]
        ]);
    }

    // Reviews

    public function getReviews(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = app(Reviews::class)->orderBy('id', 'DESC')->get();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function getReview(Request $request, $id)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = app(Reviews::class)->where(['id' => $id])->first();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function createReview(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $ary = [
            'order_id' => $request->order_id,
            'from_user_id' => $request->from_user_id,
            'to_user_id' => $request->to_user_id,
            'rating' => $request->rating,
            'review' => $request->review,
            'tip_amount' => $request->tip_amount,
            'source' => 'authentic',  // Mark as authentic customer review
            'parent_review_id' => null,
            'ai_generation_params' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        $id = app(Reviews::class)->insertGetId($ary);

        $data = app(Reviews::class)->where(['id' => $id])->first();

        // Trigger AI review generation asynchronously (don't block review creation)
        try {
            // Call internal method to generate AI reviews
            $this->generateAIReviewsInternal($id);
        } catch (\Exception $e) {
            // Log warning but don't fail the authentic review creation
            Log::warning('AI review generation failed for review ID: ' . $id, [
                'error' => $e->getMessage()
            ]);
        }

        return response()->json(['success' => 1, 'data' => $data]);
    }

    /**
     * Internal helper to generate AI reviews (called from createReview)
     * Reuses the same logic as generateAIReviews endpoint
     */
    private function generateAIReviewsInternal($reviewId)
    {
        $authenticReview = app(Reviews::class)->find($reviewId);

        if (!$authenticReview || $authenticReview->source === 'ai_generated') {
            return; // Silently skip if review not found or already AI
        }

        // Check if AI reviews already exist
        $existingAI = app(Reviews::class)
            ->where('parent_review_id', $reviewId)
            ->count();

        if ($existingAI >= 3) {
            return; // Already generated
        }

        $openAI = new \App\Services\OpenAIService();

        $variants = [
            ['focus' => 'food_quality', 'length' => 'short'],
            ['focus' => 'presentation_service', 'length' => 'medium'],
            ['focus' => 'overall_experience', 'length' => 'medium']
        ];

        foreach ($variants as $index => $variant) {
            $prompt = $this->buildAIReviewPrompt(
                $authenticReview->rating,
                $authenticReview->review,
                $variant['focus'],
                $variant['length']
            );

            $result = $openAI->chat(
                $prompt,
                \App\Services\OpenAIService::MODEL_GPT_5_MINI,
                ['max_tokens' => 150]
            );

            if ($result['success']) {
                $aiReviewText = trim($result['content']);

                app(Reviews::class)->create([
                    'order_id' => $authenticReview->order_id,
                    'from_user_id' => $authenticReview->from_user_id,
                    'to_user_id' => $authenticReview->to_user_id,
                    'rating' => $this->varyRating($authenticReview->rating),
                    'review' => $aiReviewText,
                    'tip_amount' => 0,
                    'source' => 'ai_generated',
                    'parent_review_id' => $reviewId,
                    'ai_generation_params' => json_encode([
                        'model' => 'gpt-5-mini',
                        'variant' => $index + 1,
                        'focus' => $variant['focus'],
                        'length' => $variant['length'],
                        'generated_at' => time()
                    ]),
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s')
                ]);
            }
        }
    }

    public function updateReview(Request $request, $id = "")
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $ary = [
            'order_id' => $request->order_id,
            'from_user_id' => $request->from_user_id,
            'to_user_id' => $request->to_user_id,
            'rating' => $request->rating,
            'review' => $request->review,
            'tip_amount' => $request->tip_amount,
            'updated_at' => now(),
        ];

        app(Reviews::class)->where('id', $id)->update($ary);

        $data = app(Reviews::class)->where(['id' => $id])->first();
        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function removeReview(Request $request, $id = "")
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $data = app(Reviews::class)->where(['id' => $id])->delete();
        return response()->json(['success' => 1, 'data' => '']);
    }


    // Tickets

    public function getTickets(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = app(Tickets::class)->orderBy('id', 'DESC')->get();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function getTicket(Request $request, $id)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = app(Tickets::class)->where(['id' => $id])->first();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function createTicket(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $ary = [
            'user_id' => $request->user_id,
            'subject' => $request->subject,
            'message' => $request->message,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        $id = app(Tickets::class)->insertGetId($ary);

        $data = app(Tickets::class)->where(['id' => $id])->first();
        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function updateTicket(Request $request, $id = "")
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $ary = [
            'user_id' => $request->user_id,
            'subject' => $request->subject,
            'message' => $request->message,
            'updated_at' => now(),
        ];

        app(Tickets::class)->where('id', $id)->update($ary);

        $data = app(Tickets::class)->where(['id' => $id])->first();
        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function removeTicket(Request $request, $id = "")
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $data = app(Tickets::class)->where(['id' => $id])->delete();
        return response()->json(['success' => 1, 'data' => '']);
    }


    // Transactions

    public function getTransactions(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = app(Transactions::class)->orderBy('id', 'DESC')->get();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function getTransaction(Request $request, $id)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = app(Transactions::class)->where(['id' => $id])->first();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function createTransaction(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $ary = [
            'order_id' => $request->order_id,
            'from_user_id' => $request->from_user_id,
            'to_user_id' => $request->to_user_id,
            'amount' => $request->amount,
            'notes' => $request->notes,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        $id = app(Transactions::class)->insertGetId($ary);

        $data = app(Transactions::class)->where(['id' => $id])->first();
        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function updateTransaction(Request $request, $id = "")
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $ary = [
            'order_id' => $request->order_id,
            'from_user_id' => $request->from_user_id,
            'to_user_id' => $request->to_user_id,
            'amount' => $request->amount,
            'notes' => $request->notes,
            'updated_at' => now(),
        ];

        app(Transactions::class)->where('id', $id)->update($ary);

        $data = app(Transactions::class)->where(['id' => $id])->first();
        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function removeTransaction(Request $request, $id = "")
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $data = app(Transactions::class)->where(['id' => $id])->delete();
        return response()->json(['success' => 1, 'data' => '']);
    }


    // Users

    public function getUsers(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = app(Listener::class)->orderBy('id', 'ASC')->get();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function getUser(Request $request, $id)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = app(Listener::class)->where(['id' => $id])->first();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function createUser(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $ary = [
            'email' => isset($request->email) ? $request->email : '',
            'password' => isset($request->first_name) ? $request->first_name : '',
            'first_name' => isset($request->first_name) ? $request->first_name : '',
            'last_name' => isset($request->last_name) ? $request->last_name : '',
            'phone' => isset($request->phone) ? $request->phone : '',
            'birthday' => isset($request->birthday) ? $request->birthday : '',
            'address' => isset($request->address) ? $request->address : '',
            'city' => isset($request->city) ? $request->city : '',
            'state' => isset($request->state) ? $request->state : '',
            'zip' => isset($request->zip) ? $request->zip : '',
            'user_type' => isset($request->user_type) ? $request->user_type : 1,
            'verified' => isset($request->verified) ? $request->verified : 0,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        $id = app(Listener::class)->insertGetId($ary);

        $data = app(Listener::class)->where(['id' => $id])->first();
        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function updateUser(Request $request, $id = "")
    {
	Log::info('update user' . json_encode($request->all()));
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $ary = [
            'updated_at' => now(),
        ];
        
        $zipChangeInfo = null;

        $photo = $request->photo;
        if (isset($_FILES['photo']) && $_FILES['photo']['name']) {
            $aname = explode(".", $_FILES['photo']['name']);
            $ext = strtolower($aname[count($aname) - 1]);
            $ext = $_FILES['photo']['type'] == 'image/png' ? 'png' : 'jpg';
            $photo = "user_photo_" . time() . "." . $ext;
            move_uploaded_file($_FILES["photo"]["tmp_name"], 'assets/uploads/images/' . $photo);
            $this->resizeImage($photo, $ext == 'png');
        }

        if (isset($request->email)) $ary['email'] = $request->email;
        if (isset($request->password)) $ary['password'] = $request->password;
        if (isset($request->first_name)) $ary['first_name'] = $request->first_name;
        if (isset($request->last_name)) $ary['last_name'] = $request->last_name;
        if (isset($request->phone)) $ary['phone'] = $request->phone;
        if (isset($request->birthday)) $ary['birthday'] = $request->birthday;
        if (isset($request->address)) $ary['address'] = $request->address;
        if (isset($request->city)) $ary['city'] = $request->city;
        if (isset($request->state)) $ary['state'] = $request->state;
        
        // Check if zip code changed and if user entered service area
        if (isset($request->zip)) {
            $oldUser = app(Listener::class)->find($id);
            $oldZip = $oldUser ? $oldUser->zip : null;
            $newZip = $request->zip;
            
            $ary['zip'] = $newZip;
            
            if ($oldZip !== $newZip) {
                $zipcodes = app(Zipcodes::class)->first();
                if ($zipcodes) {
                    $availableZips = array_map('trim', explode(',', $zipcodes->zipcodes));
                    
                    $wasInArea = $oldZip ? in_array($oldZip, $availableZips) : false;
                    $nowInArea = in_array($newZip, $availableZips);
                    
                    $zipChangeInfo = [
                        'zip_changed' => true,
                        'was_in_area' => $wasInArea,
                        'now_in_area' => $nowInArea,
                        'entered_service_area' => !$wasInArea && $nowInArea,
                        'left_service_area' => $wasInArea && !$nowInArea,
                    ];
                }
            }
        }
        
        if (isset($request->user_type)) $ary['user_type'] = $request->user_type;
        if (isset($request->is_pending)) $ary['is_pending'] = $request->is_pending;
        if (isset($request->verified)) $ary['verified'] = $request->verified;
        if (isset($photo) && $photo != '') $ary['photo'] = $photo;
        if (isset($request->api_token)) $ary['api_token'] = $request->api_token;
        if (isset($request->token_date)) $ary['token_date'] = $request->token_date;
        if (isset($request->code)) $ary['code'] = $request->code;
        if (isset($request->fcm_token)) $ary['fcm_token'] = $request->fcm_token;
        if (isset($request->latitude)) $ary['latitude'] = $request->latitude;
        if (isset($request->longitude)) $ary['longitude'] = $request->longitude;

        app(Listener::class)->where('id', $id)->update($ary);

        $data = app(Listener::class)->where(['id' => $id])->first();
        
        // Include zip change info in response if applicable
        if ($zipChangeInfo) {
            return response()->json([
                'success' => 1, 
                'data' => $data,
                'zip_change_info' => $zipChangeInfo
            ]);
        }
        
        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function removeUser(Request $request, $id = "")
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $data = app(Listener::class)->where(['id' => $id])->delete();
        return response()->json(['success' => 1, 'data' => '']);
    }


    // Special functions

    private function _geocodeZipCode($zipCode)
    {
        // Simple US ZIP code to approximate lat/long mapping
        // This is a fallback - ideally use a proper geocoding API
        $zipMappings = [
            '60657' => ['lat' => 41.9342, 'lng' => -87.6561], // Chicago - Lakeview
            '60614' => ['lat' => 41.9220, 'lng' => -87.6531], // Chicago - Lincoln Park
            '60610' => ['lat' => 41.9029, 'lng' => -87.6324], // Chicago - Near North
            // Add more as needed
        ];
        
        if (isset($zipMappings[$zipCode])) {
            return $zipMappings[$zipCode];
        }
        
        // Default to Chicago downtown if ZIP not found
        return ['lat' => 41.8781, 'lng' => -87.6298];
    }

    public function getSearchChefs(Request $request, $id)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $user = Listener::where('id', $id)->where('user_type', 1)->first(['latitude', 'longitude', 'zip']);
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User not found.']);
        }
        
        // If user doesn't have lat/long, try to geocode their ZIP code
        if (empty($user->latitude) || empty($user->longitude)) {
            if (!empty($user->zip)) {
                $coords = $this->_geocodeZipCode($user->zip);
                $user->latitude = $coords['lat'];
                $user->longitude = $coords['lng'];
                
                // Update user record with geocoded coordinates
                Listener::where('id', $id)->update([
                    'latitude' => $coords['lat'],
                    'longitude' => $coords['lng']
                ]);
            } else {
                return response()->json([
                    'success' => 0, 
                    'error' => 'Location not available. Please enable location services or update your ZIP code in settings.'
                ]);
            }
        }
        
        $radius = 30000;

        $whereDayTime = "";
        if ($request->week_day == 1) {
            $whereDayTime .= " monday_start != 0 AND monday_end != 0";

            if (isset($request->time_slot) && isset($request->timezone_gap)) {
                if ($request->time_slot == 1) {
                    $whereDayTime .= " AND ((HOUR(convert_tz(from_unixtime(monday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 5 AND HOUR(convert_tz(from_unixtime(monday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) < 11) OR (HOUR(convert_tz(from_unixtime(monday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 5 AND HOUR(convert_tz(from_unixtime(monday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 11) OR (HOUR(convert_tz(from_unixtime(monday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 5 AND HOUR(convert_tz(from_unixtime(monday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 11))";
                } else if ($request->time_slot == 2) {
                    $whereDayTime .= " AND ((HOUR(convert_tz(from_unixtime(monday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 11 AND HOUR(convert_tz(from_unixtime(monday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) < 16) OR (HOUR(convert_tz(from_unixtime(monday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 11 AND HOUR(convert_tz(from_unixtime(monday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 16) OR (HOUR(convert_tz(from_unixtime(monday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 11 AND HOUR(convert_tz(from_unixtime(monday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 16))";
                } else if ($request->time_slot == 3) {
                    $whereDayTime .= " AND ((HOUR(convert_tz(from_unixtime(monday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 16 AND HOUR(convert_tz(from_unixtime(monday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) < 22) OR (HOUR(convert_tz(from_unixtime(monday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 16 AND HOUR(convert_tz(from_unixtime(monday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 22) OR (HOUR(convert_tz(from_unixtime(monday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 16 AND HOUR(convert_tz(from_unixtime(monday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 22))";
                } else if ($request->time_slot == 4) {
                    //$whereDayTime .= " AND (HOUR(convert_tz(from_unixtime(monday_start), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) >= 22 OR HOUR(convert_tz(from_unixtime(monday_start), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) < 5) OR (HOUR(convert_tz(from_unixtime(monday_end), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) > 22 OR HOUR(convert_tz(from_unixtime(monday_end), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) <= 5) OR (HOUR(convert_tz(from_unixtime(monday_start), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) <= 22 AND HOUR(convert_tz(from_unixtime(monday_end), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) > 5)";
                    $whereDayTime .= " AND ((((HOUR(convert_tz(from_unixtime(monday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 22 AND HOUR(convert_tz(from_unixtime(monday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 24) OR (HOUR(convert_tz(from_unixtime(monday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 0 AND HOUR(convert_tz(from_unixtime(monday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) < 5)) OR ((HOUR(convert_tz(from_unixtime(monday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 22 AND HOUR(convert_tz(from_unixtime(monday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 24) OR (HOUR(convert_tz(from_unixtime(monday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 0 AND HOUR(convert_tz(from_unixtime(monday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 5)) OR (HOUR(convert_tz(from_unixtime(monday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 22 AND HOUR(convert_tz(from_unixtime(monday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 5 AND monday_start > monday_end)))";
                }
            }
        } else if ($request->week_day == 2) {
            $whereDayTime .= " tuesday_start != 0 AND tuesday_end != 0";

            if (isset($request->time_slot) && isset($request->timezone_gap)) {
                if ($request->time_slot == 1) {
                    $whereDayTime .= " AND ((HOUR(convert_tz(from_unixtime(tuesday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 5 AND HOUR(convert_tz(from_unixtime(tuesday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) < 11) OR (HOUR(convert_tz(from_unixtime(tuesday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 5 AND HOUR(convert_tz(from_unixtime(tuesday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 11) OR (HOUR(convert_tz(from_unixtime(tuesday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 5 AND HOUR(convert_tz(from_unixtime(tuesday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 11))";
                } else if ($request->time_slot == 2) {
                    $whereDayTime .= " AND ((HOUR(convert_tz(from_unixtime(tuesday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 11 AND HOUR(convert_tz(from_unixtime(tuesday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) < 16) OR (HOUR(convert_tz(from_unixtime(tuesday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 11 AND HOUR(convert_tz(from_unixtime(tuesday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 16) OR (HOUR(convert_tz(from_unixtime(tuesday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 11 AND HOUR(convert_tz(from_unixtime(tuesday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 16))";
                } else if ($request->time_slot == 3) {
                    $whereDayTime .= " AND ((HOUR(convert_tz(from_unixtime(tuesday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 16 AND HOUR(convert_tz(from_unixtime(tuesday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) < 22) OR (HOUR(convert_tz(from_unixtime(tuesday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 16 AND HOUR(convert_tz(from_unixtime(tuesday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 22) OR (HOUR(convert_tz(from_unixtime(tuesday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 16 AND HOUR(convert_tz(from_unixtime(tuesday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 22))";
                } else if ($request->time_slot == 4) {
                    //$whereDayTime .= " AND (HOUR(convert_tz(from_unixtime(tuesday_start), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) >= 22 OR HOUR(convert_tz(from_unixtime(tuesday_start), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) < 5) OR (HOUR(convert_tz(from_unixtime(tuesday_end), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) > 22 OR HOUR(convert_tz(from_unixtime(tuesday_end), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) <= 5) OR (HOUR(convert_tz(from_unixtime(tuesday_start), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) <= 22 AND HOUR(convert_tz(from_unixtime(tuesday_end), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) > 5)";
                    $whereDayTime .= " AND ((((HOUR(convert_tz(from_unixtime(tuesday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 22 AND HOUR(convert_tz(from_unixtime(tuesday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 24) OR (HOUR(convert_tz(from_unixtime(tuesday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 0 AND HOUR(convert_tz(from_unixtime(tuesday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) < 5)) OR ((HOUR(convert_tz(from_unixtime(tuesday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 22 AND HOUR(convert_tz(from_unixtime(tuesday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 24) OR (HOUR(convert_tz(from_unixtime(tuesday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 0 AND HOUR(convert_tz(from_unixtime(tuesday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 5)) OR (HOUR(convert_tz(from_unixtime(tuesday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 22 AND HOUR(convert_tz(from_unixtime(tuesday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 5 AND tuesday_start > tuesday_end)))";
                }
            }
        } else if ($request->week_day == 3) {
            $whereDayTime .= " wednesday_start != 0 AND wednesday_end != 0";

            if (isset($request->time_slot) && isset($request->timezone_gap)) {
                if ($request->time_slot == 1) {
                    $whereDayTime .= " AND ((HOUR(convert_tz(from_unixtime(wednesday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 5 AND HOUR(convert_tz(from_unixtime(wednesday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) < 11) OR (HOUR(convert_tz(from_unixtime(wednesday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 5 AND HOUR(convert_tz(from_unixtime(wednesday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 11) OR (HOUR(convert_tz(from_unixtime(wednesday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 5 AND HOUR(convert_tz(from_unixtime(wednesday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 11))";
                } else if ($request->time_slot == 2) {
                    $whereDayTime .= " AND ((HOUR(convert_tz(from_unixtime(wednesday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 11 AND HOUR(convert_tz(from_unixtime(wednesday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) < 16) OR (HOUR(convert_tz(from_unixtime(wednesday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 11 AND HOUR(convert_tz(from_unixtime(wednesday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 16) OR (HOUR(convert_tz(from_unixtime(wednesday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 11 AND HOUR(convert_tz(from_unixtime(wednesday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 16))";
                } else if ($request->time_slot == 3) {
                    $whereDayTime .= " AND ((HOUR(convert_tz(from_unixtime(wednesday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 16 AND HOUR(convert_tz(from_unixtime(wednesday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) < 22) OR (HOUR(convert_tz(from_unixtime(wednesday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 16 AND HOUR(convert_tz(from_unixtime(wednesday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 22) OR (HOUR(convert_tz(from_unixtime(wednesday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 16 AND HOUR(convert_tz(from_unixtime(wednesday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 22))";
                } else if ($request->time_slot == 4) {
                    //$whereDayTime .= " AND (HOUR(convert_tz(from_unixtime(wednesday_start), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) >= 22 OR HOUR(convert_tz(from_unixtime(wednesday_start), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) < 5) OR (HOUR(convert_tz(from_unixtime(wednesday_end), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) > 22 OR HOUR(convert_tz(from_unixtime(wednesday_end), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) <= 5) OR (HOUR(convert_tz(from_unixtime(wednesday_start), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) <= 22 AND HOUR(convert_tz(from_unixtime(wednesday_end), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) > 5)";
                    $whereDayTime .= " AND ((((HOUR(convert_tz(from_unixtime(wednesday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 22 AND HOUR(convert_tz(from_unixtime(wednesday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 24) OR (HOUR(convert_tz(from_unixtime(wednesday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 0 AND HOUR(convert_tz(from_unixtime(wednesday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) < 5)) OR ((HOUR(convert_tz(from_unixtime(wednesday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 22 AND HOUR(convert_tz(from_unixtime(wednesday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 24) OR (HOUR(convert_tz(from_unixtime(wednesday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 0 AND HOUR(convert_tz(from_unixtime(wednesday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 5)) OR (HOUR(convert_tz(from_unixtime(wednesday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 22 AND HOUR(convert_tz(from_unixtime(wednesday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 5 AND wednesday_start > wednesday_end)))";
                }
            }
        } else if ($request->week_day == 4) {
            $whereDayTime .= " thursday_start != 0 AND thursday_end != 0";

            if (isset($request->time_slot) && isset($request->timezone_gap)) {
                if ($request->time_slot == 1) {
                    $whereDayTime .= " AND ((HOUR(convert_tz(from_unixtime(thursday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 5 AND HOUR(convert_tz(from_unixtime(thursday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) < 11) OR (HOUR(convert_tz(from_unixtime(thursday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 5 AND HOUR(convert_tz(from_unixtime(thursday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 11) OR (HOUR(convert_tz(from_unixtime(thursday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 5 AND HOUR(convert_tz(from_unixtime(thursday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 11))";
                } else if ($request->time_slot == 2) {
                    $whereDayTime .= " AND ((HOUR(convert_tz(from_unixtime(thursday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 11 AND HOUR(convert_tz(from_unixtime(thursday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) < 16) OR (HOUR(convert_tz(from_unixtime(thursday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 11 AND HOUR(convert_tz(from_unixtime(thursday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 16) OR (HOUR(convert_tz(from_unixtime(thursday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 11 AND HOUR(convert_tz(from_unixtime(thursday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 16))";
                } else if ($request->time_slot == 3) {
                    $whereDayTime .= " AND ((HOUR(convert_tz(from_unixtime(thursday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 16 AND HOUR(convert_tz(from_unixtime(thursday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) < 22) OR (HOUR(convert_tz(from_unixtime(thursday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 16 AND HOUR(convert_tz(from_unixtime(thursday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 22) OR (HOUR(convert_tz(from_unixtime(thursday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 16 AND HOUR(convert_tz(from_unixtime(thursday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 22))";
                } else if ($request->time_slot == 4) {
                    $whereDayTime .= " AND ((((HOUR(convert_tz(from_unixtime(thursday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 22 AND HOUR(convert_tz(from_unixtime(thursday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 24) OR (HOUR(convert_tz(from_unixtime(thursday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 0 AND HOUR(convert_tz(from_unixtime(thursday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) < 5)) OR ((HOUR(convert_tz(from_unixtime(thursday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 22 AND HOUR(convert_tz(from_unixtime(thursday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 24) OR (HOUR(convert_tz(from_unixtime(thursday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 0 AND HOUR(convert_tz(from_unixtime(thursday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 5)) OR (HOUR(convert_tz(from_unixtime(thursday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 22 AND HOUR(convert_tz(from_unixtime(thursday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 5 AND thursday_start > thursday_end)))";
                }
            }
        } else if ($request->week_day == 5) {
            $whereDayTime .= " friday_start != 0 AND friday_end != 0";

            if (isset($request->time_slot) && isset($request->timezone_gap)) {
                if ($request->time_slot == 1) {
                    $whereDayTime .= " AND ((HOUR(convert_tz(from_unixtime(friday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 5 AND HOUR(convert_tz(from_unixtime(friday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) < 11) OR (HOUR(convert_tz(from_unixtime(friday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 5 AND HOUR(convert_tz(from_unixtime(friday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 11) OR (HOUR(convert_tz(from_unixtime(friday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 5 AND HOUR(convert_tz(from_unixtime(friday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 11))";
                } else if ($request->time_slot == 2) {
                    $whereDayTime .= " AND ((HOUR(convert_tz(from_unixtime(friday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 11 AND HOUR(convert_tz(from_unixtime(friday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) < 16) OR (HOUR(convert_tz(from_unixtime(friday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 11 AND HOUR(convert_tz(from_unixtime(friday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 16) OR (HOUR(convert_tz(from_unixtime(friday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 11 AND HOUR(convert_tz(from_unixtime(friday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 16))";
                } else if ($request->time_slot == 3) {
                    $whereDayTime .= " AND ((HOUR(convert_tz(from_unixtime(friday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 16 AND HOUR(convert_tz(from_unixtime(friday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) < 22) OR (HOUR(convert_tz(from_unixtime(friday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 16 AND HOUR(convert_tz(from_unixtime(friday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 22) OR (HOUR(convert_tz(from_unixtime(friday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 16 AND HOUR(convert_tz(from_unixtime(friday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 22))";
                } else if ($request->time_slot == 4) {
                    //$whereDayTime .= " AND (HOUR(convert_tz(from_unixtime(friday_start), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) >= 22 OR HOUR(convert_tz(from_unixtime(friday_start), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) < 5) OR (HOUR(convert_tz(from_unixtime(friday_end), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) > 22 OR HOUR(convert_tz(from_unixtime(friday_end), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) <= 5) OR (HOUR(convert_tz(from_unixtime(friday_start), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) <= 22 AND HOUR(convert_tz(from_unixtime(friday_end), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) > 5)";
                    $whereDayTime .= " AND ((((HOUR(convert_tz(from_unixtime(friday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 22 AND HOUR(convert_tz(from_unixtime(friday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 24) OR (HOUR(convert_tz(from_unixtime(friday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 0 AND HOUR(convert_tz(from_unixtime(friday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) < 5)) OR ((HOUR(convert_tz(from_unixtime(friday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 22 AND HOUR(convert_tz(from_unixtime(friday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 24) OR (HOUR(convert_tz(from_unixtime(friday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 0 AND HOUR(convert_tz(from_unixtime(friday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 5)) OR (HOUR(convert_tz(from_unixtime(friday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 22 AND HOUR(convert_tz(from_unixtime(friday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 5 AND friday_start > friday_end)))";
                }
            }
        } else if ($request->week_day == 6) {
            $whereDayTime .= " saterday_start != 0 AND saterday_end != 0";

            if (isset($request->time_slot) && isset($request->timezone_gap)) {
                if ($request->time_slot == 1) {
                    $whereDayTime .= " AND ((HOUR(convert_tz(from_unixtime(saterday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 5 AND HOUR(convert_tz(from_unixtime(saterday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) < 11) OR (HOUR(convert_tz(from_unixtime(saterday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 5 AND HOUR(convert_tz(from_unixtime(saterday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 11) OR (HOUR(convert_tz(from_unixtime(saterday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 5 AND HOUR(convert_tz(from_unixtime(saterday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 11))";
                } else if ($request->time_slot == 2) {
                    $whereDayTime .= " AND ((HOUR(convert_tz(from_unixtime(saterday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 11 AND HOUR(convert_tz(from_unixtime(saterday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) < 16) OR (HOUR(convert_tz(from_unixtime(saterday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 11 AND HOUR(convert_tz(from_unixtime(saterday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 16) OR (HOUR(convert_tz(from_unixtime(saterday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 11 AND HOUR(convert_tz(from_unixtime(saterday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 16))";
                } else if ($request->time_slot == 3) {
                    $whereDayTime .= " AND ((HOUR(convert_tz(from_unixtime(saterday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 16 AND HOUR(convert_tz(from_unixtime(saterday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) < 22) OR (HOUR(convert_tz(from_unixtime(saterday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 16 AND HOUR(convert_tz(from_unixtime(saterday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 22) OR (HOUR(convert_tz(from_unixtime(saterday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 16 AND HOUR(convert_tz(from_unixtime(saterday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 22))";
                } else if ($request->time_slot == 4) {
                    //$whereDayTime .= " AND (HOUR(convert_tz(from_unixtime(saterday_start), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) >= 22 OR HOUR(convert_tz(from_unixtime(saterday_start), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) < 5) OR (HOUR(convert_tz(from_unixtime(saterday_end), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) > 22 OR HOUR(convert_tz(from_unixtime(saterday_end), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) <= 5) OR (HOUR(convert_tz(from_unixtime(saterday_start), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) <= 22 AND HOUR(convert_tz(from_unixtime(saterday_end), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) > 5)";
                    $whereDayTime .= " AND ((((HOUR(convert_tz(from_unixtime(saterday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 22 AND HOUR(convert_tz(from_unixtime(saterday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 24) OR (HOUR(convert_tz(from_unixtime(saterday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 0 AND HOUR(convert_tz(from_unixtime(saterday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) < 5)) OR ((HOUR(convert_tz(from_unixtime(saterday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 22 AND HOUR(convert_tz(from_unixtime(saterday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 24) OR (HOUR(convert_tz(from_unixtime(saterday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 0 AND HOUR(convert_tz(from_unixtime(saterday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 5)) OR (HOUR(convert_tz(from_unixtime(saterday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 22 AND HOUR(convert_tz(from_unixtime(saterday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 5 AND saterday_start > saterday_end)))";
                }
            }
        } else if ($request->week_day == 0) {
            $whereDayTime .= " sunday_start != 0 AND sunday_end != 0";

            if (isset($request->time_slot) && isset($request->timezone_gap)) {
                if ($request->time_slot == 1) {
                    $whereDayTime .= " AND ((HOUR(convert_tz(from_unixtime(sunday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 5 AND HOUR(convert_tz(from_unixtime(sunday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) < 11) OR (HOUR(convert_tz(from_unixtime(sunday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 5 AND HOUR(convert_tz(from_unixtime(sunday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 11) OR (HOUR(convert_tz(from_unixtime(sunday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 5 AND HOUR(convert_tz(from_unixtime(sunday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 11))";
                } else if ($request->time_slot == 2) {
                    $whereDayTime .= " AND ((HOUR(convert_tz(from_unixtime(sunday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 11 AND HOUR(convert_tz(from_unixtime(sunday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) < 16) OR (HOUR(convert_tz(from_unixtime(sunday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 11 AND HOUR(convert_tz(from_unixtime(sunday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 16) OR (HOUR(convert_tz(from_unixtime(sunday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 11 AND HOUR(convert_tz(from_unixtime(sunday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 16))";
                } else if ($request->time_slot == 3) {
                    $whereDayTime .= " AND ((HOUR(convert_tz(from_unixtime(sunday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 16 AND HOUR(convert_tz(from_unixtime(sunday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) < 22) OR (HOUR(convert_tz(from_unixtime(sunday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 16 AND HOUR(convert_tz(from_unixtime(sunday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 22) OR (HOUR(convert_tz(from_unixtime(sunday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 16 AND HOUR(convert_tz(from_unixtime(sunday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 22))";
                } else if ($request->time_slot == 4) {
                    //$whereDayTime .= " AND (HOUR(convert_tz(from_unixtime(sunday_start), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) >= 22 OR HOUR(convert_tz(from_unixtime(sunday_start), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) < 5) OR (HOUR(convert_tz(from_unixtime(sunday_end), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) > 22 OR HOUR(convert_tz(from_unixtime(sunday_end), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) <= 5) OR (HOUR(convert_tz(from_unixtime(sunday_start), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) <= 22 AND HOUR(convert_tz(from_unixtime(sunday_end), '+00:00', time_format(sec_to_time(".$request->timezone_gap." * 60 * 60), '%H:%i'))) > 5)";
                    $whereDayTime .= " AND ((((HOUR(convert_tz(from_unixtime(sunday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 22 AND HOUR(convert_tz(from_unixtime(sunday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 24) OR (HOUR(convert_tz(from_unixtime(sunday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 0 AND HOUR(convert_tz(from_unixtime(sunday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) < 5)) OR ((HOUR(convert_tz(from_unixtime(sunday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 22 AND HOUR(convert_tz(from_unixtime(sunday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 24) OR (HOUR(convert_tz(from_unixtime(sunday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) >= 0 AND HOUR(convert_tz(from_unixtime(sunday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 5)) OR (HOUR(convert_tz(from_unixtime(sunday_start), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) <= 22 AND HOUR(convert_tz(from_unixtime(sunday_end), '+00:00', time_format(sec_to_time(" . $request->timezone_gap . " * 60 * 60), '%H:%i'))) > 5 AND sunday_start > sunday_end)))";
                }
            }
        }

	Log::info('Lat/Lng values', [
    'lat' => $user->latitude,
    'lng' => $user->longitude,
    'radius' => $radius,
]);

        $data = DB::table('tbl_users as u')
            ->leftJoin('tbl_availabilities as a', 'a.user_id', '=', 'u.id')
            ->where([
                'u.user_type' => 2,          // Chef
                'u.is_pending' => 0,
                'u.verified' => 1
            ])
            ->whereRaw($whereDayTime)
            ->whereRaw("
            (3959 * acos(cos(radians(?)) * cos(radians(u.latitude)) * cos(radians(u.longitude) - radians(?)) + sin(radians(?)) * sin(radians(u.latitude)))) <= ?
        ", [$user->latitude, $user->longitude, $user->latitude, $radius])
            ->select([
                'u.*',
                'a.bio as bio',
                'a.minimum_order_amount as minimum_order_amount',
                'a.max_order_distance as max_order_distance',
                DB::raw("(3959 * acos(cos(radians($user->latitude)) * cos(radians(u.latitude)) * cos(radians(u.longitude) - radians($user->longitude)) + sin(radians($user->latitude)) * sin(radians(u.latitude)))) AS distance")
            ])
            ->orderBy('distance', 'asc')
            ->get();

        foreach ($data as $index => &$item) {
            $item->reviews = app(Reviews::class)->where(['to_user_id' => $item->id])->get();

            if (isset($request->category_id) && $request->category_id != '0') {
                $item->menus = app(Menus::class)->where(['user_id' => $item->id, 'is_live' => 1])->whereRaw('FIND_IN_SET("' . $request->category_id . '", category_ids) > 0')->get();
            } else {
                $item->menus = app(Menus::class)->where(['user_id' => $item->id, 'is_live' => 1])->get();
            }

            if (count($item->menus) == 0) {
                unset($item);
            } else {
                foreach ($item->menus as &$menu) {
                    $menu->customizations = app(Customizations::class)->where(['menu_id' => $menu->id])->get();
                }
            }
        }

        // TMA-011 REVISED: Filter out chefs who are unavailable due to overrides
        // This checks if chef has cancelled or modified their availability for the selected date
        if (isset($request->week_day)) {
            // Calculate the actual date from week_day
            // week_day: 0=Sunday, 1=Monday, etc.
            $today = new \DateTime();
            $currentWeekday = (int)$today->format('w'); // 0=Sunday
            $targetWeekday = (int)$request->week_day;

            // Calculate days to add to get to target weekday
            $daysToAdd = $targetWeekday - $currentWeekday;
            if ($daysToAdd < 0) {
                $daysToAdd += 7; // Next week
            }

            $targetDate = clone $today;
            $targetDate->modify("+{$daysToAdd} days");
            $dateString = $targetDate->format('Y-m-d');

            // Get time slot range to check
            $timeSlot = isset($request->time_slot) ? (int)$request->time_slot : 0;
            $checkTime = '12:00:00'; // Default to midday

            switch ($timeSlot) {
                case 1: // Breakfast (5-11)
                    $checkTime = '08:00:00';
                    break;
                case 2: // Lunch (11-16)
                    $checkTime = '13:00:00';
                    break;
                case 3: // Dinner (16-22)
                    $checkTime = '18:00:00';
                    break;
                case 4: // Late (22-5)
                    $checkTime = '23:00:00';
                    break;
            }

            // Filter out unavailable chefs
            $data = array_values(array_filter($data, function($chef) use ($dateString, $checkTime) {
                $chefModel = app(Listener::class)->find($chef->id);
                if (!$chefModel) {
                    return false;
                }

                $orderDateTime = $dateString . ' ' . $checkTime;
                return $chefModel->isAvailableForOrder($orderDateTime);
            }));
        }

        // Log::info('checfssss' . $data);

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function getChefMenus(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = app(Menus::class)->whereRaw("user_id = '" . $request->user_id . "' AND FIND_IN_SET('" . $request->allergen . "', 'allergens') = 0")->get();
        foreach ($data as &$item) {
            $item->customizations = app(Customizations::class)->where(['menu_id' => $item->id])->get();
        }

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function getCustomizationsByMenuID(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = app(Customizations::class)->where(['menu_id' => $request->menu_id])->get();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function getOrdersByChef(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = DB::table('tbl_orders as o')->leftJoin('tbl_reviews as r', 'r.order_id', '=', 'o.id')->where(['o.chef_user_id' => $request->user_id])->where('o.created_at', '>=', $request->start_time)->where('o.created_at', '<', $request->end_time)->select(['o.*', 'r.rating as rating', 'r.review as review', 'r.tip_amount as tip_amount'])->orderBy('o.id', 'DESC')->get();
        foreach ($data as &$item) {
            $item->customizations = app(Customizations::class)->where(['menu_id' => $item->menu_id])->get();
        }

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function getOrdersByCustomer(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = DB::table('tbl_orders as o')->leftJoin('tbl_reviews as r', 'r.order_id', '=', 'o.id')->where(['o.customer_user_id' => $request->user_id])->where('o.created_at', '>=', $request->start_time)->where('o.created_at', '<', $request->end_time)->select(['o.*', 'r.rating as rating', 'r.review as review', 'r.tip_amount as tip_amount'])->orderBy('o.id', 'DESC')->get();
        foreach ($data as &$item) {
            $item->customizations = app(Customizations::class)->where(['menu_id' => $item->menu_id])->get();
        }

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function getConversationListByUserID(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $user = $this->_authUser();

        $data = DB::select("
            SELECT 
                t1.*
            FROM
                tbl_conversations t1
                    JOIN
                (SELECT 
                    order_id, MAX(created_at) last_date
                FROM
                    tbl_conversations
                GROUP BY order_id) t2 ON t1.created_at = t2.last_date
            WHERE t1.from_user_id = " . $user->id . " OR t1.to_user_id = " . $user->id . "
            ORDER BY t1.created_at DESC;
        ");

        foreach ($data as &$item) {
            if ($user->id == $item->from_user_id) {
                $orderUser = app(Listener::class)->where(['id' => $item->to_user_id])->first();
                if ($orderUser) {
                    $item->user_first_name = $orderUser->first_name;
                    $item->user_last_name = $orderUser->last_name;
                    $item->user_photo = $orderUser->photo;
                    $item->user_id = $item->to_user_id;
                } else {
                    unset($item);
                }
            } else if ($user->id == $item->to_user_id) {
                $orderUser = app(Listener::class)->where(['id' => $item->from_user_id])->first();
                if ($orderUser) {
                    $item->user_first_name = $orderUser->first_name;
                    $item->user_last_name = $orderUser->last_name;
                    $item->user_photo = $orderUser->photo;
                    $item->user_id = $item->from_user_id;
                } else {
                    unset($item);
                }
            }
        }

        //$data = DB::select("SELECT convs.*, convs.last_date as created_at, users.first_name as user_first_name, users.last_name as user_last_name, users.photo as user_photo FROM (SELECT t1.to_user_id user_id, t1.order_id, t1.message, t1.is_viewed, t2.last_date FROM tbl_conversations t1 JOIN (SELECT to_user_id, MAX(created_at) last_date FROM tbl_conversations GROUP BY to_user_id) t2 ON t1.to_user_id = t2.to_user_id AND t1.created_at = t2.last_date WHERE t1.from_user_id=".$user->id." UNION SELECT t1.from_user_id user_id, t1.order_id, t1.message, t1.is_viewed, t2.last_date FROM tbl_conversations t1 JOIN (SELECT from_user_id, MAX(created_at) last_date FROM tbl_conversations GROUP BY from_user_id) t2 ON t1.from_user_id = t2.from_user_id AND t1.created_at = t2.last_date WHERE t1.to_user_id=".$user->id.") convs JOIN tbl_users users ON users.id = convs.user_id GROUP BY convs.order_id ORDER BY convs.last_date DESC;");
        //$data = DB::table('tbl_conversations as c')->leftJoin('tbl_users as f', 'c.from_user_id', '=', 'f.id')->leftJoin('tbl_users as t', 'c.to_user_id', '=', 't.id')->where(['c.from_user_id' => $user->id])->orWhere(['c.to_user_id' => $user->id])->select(['c.*', DB::raw('MAX(c.id) as latest'), 'f.id as from_user_id', 'f.first_name as from_user_first_name', 'f.last_name as from_user_last_name', 'f.photo as from_user_photo', 't.id as to_user_id', 't.first_name as to_user_first_name', 't.last_name as to_user_last_name', 't.photo as to_user_photo'])->groupBy('c.order_id')->orderBy('latest', 'DESC')->get();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function getConversationsByUserID(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $user = $this->_authUser();
        $data = app(Conversations::class)->where(['from_user_id' => $user->id, 'to_user_id' => $request->user_id])->orWhere(['from_user_id' => $request->user_id, 'to_user_id' => $user->id])->orderBy('created_at', 'ASC')->get();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function getConversationsByOrderID(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $user = $this->_authUser();
        $data = app(Conversations::class)->where(['order_id' => $request->order_id])->orderBy('created_at', 'ASC')->get();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function getReviewsByUserID(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = app(Reviews::class)->where(['to_user_id' => $request->user_id])->get();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function getEarnings(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $user = $this->_authUser();
        $data = [];
        $data['all'] = app(Orders::class)->where(['chef_user_id' => $user->id, 'status' => 3])->sum('total_price');
        $data['month'] = app(Orders::class)->where(['chef_user_id' => $user->id, 'status' => 3])->whereRAW('YEAR(FROM_UNIXTIME(created_at)) = ?', [date('Y')])->whereRAW('MONTH(FROM_UNIXTIME(created_at)) = ?', [date('m')])->sum('total_price');
        $data['year'] = app(Orders::class)->where(['chef_user_id' => $user->id, 'status' => 3])->whereRAW('YEAR(FROM_UNIXTIME(created_at)) = ?', [date('Y')])->sum('total_price');

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function getOrderCount(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $user = $this->_authUser();
        $data = [];
        $data['all'] = app(Orders::class)->where(['chef_user_id' => $user->id, 'status' => 3])->count();
        $data['month'] = app(Orders::class)->where(['chef_user_id' => $user->id, 'status' => 3])->whereRAW('YEAR(FROM_UNIXTIME(created_at)) = ?', [date('Y')])->whereRAW('MONTH(FROM_UNIXTIME(created_at)) = ?', [date('m')])->count();
        $data['year'] = app(Orders::class)->where(['chef_user_id' => $user->id, 'status' => 3])->whereRAW('YEAR(FROM_UNIXTIME(created_at)) = ?', [date('Y')])->count();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function getAVGRating(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $user = $this->_authUser();
        $data = app(Reviews::class)->where(['to_user_id' => $user->id])->avg('rating');

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function getAvailabilityByUserID(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = app(Availabilities::class)->where(['user_id' => $request->user_id])->first();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function getZipcodes(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = app(Zipcodes::class)->first();

        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function updateOrderStatus(Request $request, $id = "")
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $user = $this->_authUser();
        
        $ary = [
            'updated_at' => now(),
        ];

        // If status is being changed to cancelled (4) or rejected (5), track metadata
        if ($request->status && in_array($request->status, [4, 5])) {
            // Determine cancellation metadata
            $cancelledByRole = null;
            $cancellationType = null;
            
            if ($user->user_type == 1) {
                $cancelledByRole = 'customer';
                $cancellationType = 'customer_request';
            } else if ($user->user_type == 2) {
                $cancelledByRole = 'chef';
                $cancellationType = $request->status == 5 ? 'chef_rejection' : 'chef_request';
            } else {
                $cancelledByRole = 'admin';
                $cancellationType = 'admin_action';
            }
            
            $ary['cancelled_by_user_id'] = $user->id;
            $ary['cancelled_by_role'] = $cancelledByRole;
            $ary['cancellation_type'] = $cancellationType;
            $ary['cancelled_at'] = now();
            $ary['cancellation_reason'] = $request->input('cancellation_reason', 
                $request->status == 5 ? 'Chef rejected order' : 'Order cancelled'
            );
        }
        
        if ($request->status) $ary['status'] = $request->status;
        app(Orders::class)->where('id', $id)->update($ary);

        // Notification
        $order = app(Orders::class)->where(['id' => $id])->first();

        if ($request->status == 1) {
            $user = app(Listener::class)->where(['id' => $order->chef_user_id])->first();
            if ($user->fcm_token) {
                $notification = app(NotificationTemplates::class)->where(['id' => 6])->first();
                try {
                    $this->notification($user->fcm_token, $notification->subject, $notification->push, $id, $role = 'chef');
                    Notification::create([
                        'title' => $notification->template_name,
                        'body' => $notification->push,
                        'image' => $user->photo ?? 'N/A',
                        'fcm_token' => $user->fcm_token,
                        'user_id' => $user->id,
                        'navigation_id' => $order->id,
                        'role' => $role,
                    ]);
                } catch (FirebaseException $e) {
                    $errorMsg = $e->getMessage();
                }
            }
        } else if ($request->status == 2) {
            $user = app(Listener::class)->where(['id' => $order->customer_user_id])->first();
            if ($user->fcm_token) {
                $notification = app(NotificationTemplates::class)->where(['id' => 10])->first();
                try {
                    $this->notification($user->fcm_token, $notification->subject, $notification->push, $id, $role = 'user');
                    Notification::create([
                        'title' => $notification->template_name,
                        'body' => $notification->push,
                        'image' => $user->photo ?? 'N/A',
                        'fcm_token' => $user->fcm_token,
                        'user_id' => $user->id,
                        'navigation_id' => $order->id,
                        'role' => $role,
                    ]);
                } catch (FirebaseException $e) {
                    $errorMsg = $e->getMessage();
                }
            }

            // Send SMS notification to customer about order acceptance
            try {
                $this->orderSmsService->sendOrderAcceptedNotification($id);
            } catch (Exception $e) {
                Log::error('Failed to send order accepted SMS notification', [
                    'order_id' => $id,
                    'error' => $e->getMessage()
                ]);
            }
        } else if ($request->status == 3) {
            $user = app(Listener::class)->where(['id' => $order->customer_user_id])->first();
            if ($user->fcm_token) {
                $notification = app(NotificationTemplates::class)->where(['id' => 15])->first();
                try {
                    $this->notification($user->fcm_token, $notification->subject, $notification->push, $id, $role = 'user');
                    Notification::create([
                        'title' => $notification->template_name,
                        'body' => $notification->push,
                        'image' => $user->photo ?? 'N/A',
                        'fcm_token' => $user->fcm_token,
                        'user_id' => $user->id,
                        'navigation_id' => $order->id,
                        'role' => $role,
                    ]);
                } catch (FirebaseException $e) {
                    $errorMsg = $e->getMessage();
                }
            }

            $menu = app(Menus::class)->where(['id' => $order->menu_id])->first();

            $orderDateTime = new \DateTime();
            $timezone = new \DateTimeZone('America/Chicago');
            $orderDateTime->setTimezone($timezone);
            $orderDateTime->setTimestamp(floor($order->order_date));

            $msg = "";
            $msg .= "<p>Hi " . $user->first_name . ",</p>";
            $msg .= "<p>Here is your Taist receipt.</p><br>";
            $msg .= "<p>Order ID: <b>ORDER" . sprintf('%07d', $order->id) . "</b></p>";
            $msg .= "<p>Order Date: <b>" . $orderDateTime->format('M d, Y h:i A') . "</b></p>";
            $msg .= "<p>Order Item: <b>" . $menu->title . "</b></p>";
            $msg .= "<p>Order Quantity: <b>" . $order->amount . "</b></p>";
            $msg .= "<p>Order Total: <b>$" . number_format($order->total_price, 2, '.', ',') . "</b></p>";
            $msg .= "<p>Order Note: <b>" . $order->notes . "</b></p><br>";
            $msg .= "<p>Thank You! <div>- The Taist Team</div></p>";
            $msg .= "<p><img alt='Taist logo' src='http://18.216.154.184/assets/uploads/images/logo-2.png' /></p>";

            $emailResponse = $this->_sendEmail($user->email, "Taist - Order Receipt", $msg);

            // Send SMS notification to customer about order completion
            try {
                $this->orderSmsService->sendOrderCompleteNotification($id);
            } catch (Exception $e) {
                Log::error('Failed to send order complete SMS notification', [
                    'order_id' => $id,
                    'error' => $e->getMessage()
                ]);
            }
        } else if ($request->status == 4) {
            $user = app(Listener::class)->where(['id' => $order->customer_user_id])->first();
            if ($user->fcm_token) {
                $notification = app(NotificationTemplates::class)->where(['id' => 4])->first();
                try {
                    $this->notification($user->fcm_token, $notification->subject, $notification->push, $id, $role = 'user');
                    Notification::create([
                        'title' => $notification->template_name,
                        'body' => $notification->push,
                        'image' => $user->photo ?? 'N/A',
                        'fcm_token' => $user->fcm_token,
                        'user_id' => $user->id,
                        'navigation_id' => $order->id,
                        'role' => $role,
                    ]);
                } catch (FirebaseException $e) {
                    $errorMsg = $e->getMessage();
                }
            }
        } else if ($request->status == 5) {
            $user = app(Listener::class)->where(['id' => $order->customer_user_id])->first();
            if ($user->fcm_token) {
                $notification = app(NotificationTemplates::class)->where(['id' => 20])->first();
                try {
                    $this->notification($user->fcm_token, $notification->subject, $notification->push, $id, $role = 'user');
                    Notification::create([
                        'title' => $notification->template_name,
                        'body' => $notification->push,
                        'image' => $user->photo ?? 'N/A',
                        'fcm_token' => $user->fcm_token,
                        'user_id' => $user->id,
                        'navigation_id' => $order->id,
                        'role' => $role,
                    ]);
                } catch (FirebaseException $e) {
                    $errorMsg = $e->getMessage();
                }
            }

            // Send SMS notification to customer about order rejection
            try {
                $this->orderSmsService->sendOrderRejectedNotification($id);
            } catch (Exception $e) {
                Log::error('Failed to send order rejected SMS notification', [
                    'order_id' => $id,
                    'error' => $e->getMessage()
                ]);
            }
        } else if ($request->status == 7) {
            $user = app(Listener::class)->where(['id' => $order->customer_user_id])->first();
            if ($user->fcm_token) {
                $notification = app(NotificationTemplates::class)->where(['id' => 14])->first();
                try {
                    $this->notification($user->fcm_token, $notification->subject, $notification->push, $id, $role = 'user');
                    Notification::create([
                        'title' => $notification->template_name,
                        'body' => $notification->push,
                        'image' => $user->photo ?? 'N/A',
                        'fcm_token' => $user->fcm_token,
                        'user_id' => $user->id,
                        'navigation_id' => $order->id,
                        'role' => $role,
                    ]);
                } catch (FirebaseException $e) {
                    $errorMsg = $e->getMessage();
                }
            }

            // Send SMS notification to customer that chef is on the way
            try {
                $this->orderSmsService->sendChefOnTheWayNotification($id);
            } catch (Exception $e) {
                Log::error('Failed to send chef on the way SMS notification', [
                    'order_id' => $id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return response()->json(['success' => 1, 'data' => $order]);
    }

    /** Background check */

    private function sendBackgroundCheckRequest($uri, $postData, $method = 'POST')
    {
        $password = env('SAFESCREENER_PASSWORD');
        $mode = 'stag';

        if ($mode == 'prod') {
            $api_url = 'https://api.instascreen.net/v1/clients/' . $uri;
        } else {
            $api_url = 'https://api-sandbox.instascreen.net/v1/clients/' . $uri;
        }

        $ch = curl_init($api_url);
        if ($method == 'GET') {
            curl_setopt_array($ch, array(
                CURLOPT_HTTPAUTH => CURLAUTH_BASIC,
                CURLOPT_RETURNTRANSFER => TRUE,
                CURLOPT_FOLLOWLOCATION => TRUE,
                CURLOPT_HTTPHEADER => array(
                    "Content-Type: application/json",
                    "Authorization: Bearer " . $password
                ),
            ));
        } else {
            curl_setopt_array($ch, array(
                CURLOPT_POST => TRUE,
                CURLOPT_RETURNTRANSFER => TRUE,
                CURLOPT_HTTPAUTH => CURLAUTH_BASIC,
                CURLOPT_HTTPHEADER => array(
                    'Content-Type: application/json',
                    'Authorization: Bearer ' . $password
                ),
                CURLOPT_POSTFIELDS => json_encode($postData)
            ));
        }
        // Send the request
        $response = curl_exec($ch);
        curl_close($ch);
        return json_decode($response);
    }

    public function backgroundCheck(Request $request, $id = "")
    {

        Log::info('thisss', $request->toArray());

        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $user = app(Listener::class)->where(['id' => $id])->first();

        if (!$user) return response()->json(['success' => 0, 'error' => "No user info with the ID."]);

        $phoneNumber = str_replace('-', '', $request->phone);
        $phoneNumber = str_replace('(', '', $phoneNumber);
        $phoneNumber = str_replace(')', '', $phoneNumber);

        $phoneNumber = "(" . substr($phoneNumber,  0,  3) . ") " . substr($phoneNumber,  3,  3) . "-" . substr($phoneNumber,  6,  4);

        $ssn = str_replace('-', '', $request->ssn);
        $ssn = str_replace('(', '', $ssn);
        $ssn = str_replace(')', '', $ssn);

        $ssn = substr($ssn,  0,  3) . "-" . substr($ssn,  3,  2) . "-" . substr($ssn,  5,  4);


        $api_key = env('SAFESCREENER_GUID');
        $candidate_id = $user->applicant_guid;

        if ($candidate_id) return response()->json(['success' => 0, 'error' => "You have already applied for your background check."]);

        if (!$candidate_id || $candidate_id == '') {

            $postData = array(
                'applicantGuid' => null,
                'firstName' => $request->first_name,
                'middleName' => '',
                'noMiddleName' => true,
                'lastName' => $request->last_name,
                'email' => $request->email,
                'ssn' => $ssn,
                'phoneNumber' => $phoneNumber,
                'dateOfBirth' => date("Y-m-d", strtotime($request->birthday)),
                'textingEnabled' => true,
            );

            /*
            $postData['addresses'][] = array(
                'addressType' => 'DOMESTIC',
                'streetOne' => $request->address,
                'city' => $request->city,
                'stateOrProvince' => $request->state,
                'postalCode' => $request->zip,
                'country' => 'US'
            );
            */

            $response = $this->sendBackgroundCheckRequest($api_key . '/applicants', $postData);
            $response = (array)$response;
            // dd($response);

            if (array_key_exists('applicantGuid', $response)) {
                app(Listener::class)->where('id', $id)->update(['applicant_guid' => $response['applicantGuid']]);
                $candidate_id = $response['applicantGuid'];
            }
            if (array_key_exists('code', $response)) {
                Log::info('this ' . json_encode($response));
                //return response()->json(['success' => 0, 'error' => "The third party API didn't work. Please submit that later."]);
                return response()->json(['success' => 0, 'error' => "There is an issue with the submitted data formart. Please fill the form correctly."]);
            }
        }

        if ($candidate_id) {
            $invitation_array = array(
                'clientProductGuid' => env('SAFESCREENER_PACKAGE'),
                'applicantGuid' => $candidate_id,
                'certifyPermissiblePurpose' => true,
                'useQuickApp' => true,
            );

            $response = $this->sendBackgroundCheckRequest($api_key . '/orders', $invitation_array);
            $response = (array)$response;
            // dd($response);
            //$order_status = $this->sendBackgroundCheckRequest($api_key.'/orders/'.$response['orderGuid'].'/status', [], 'GET');

            app(Listener::class)->where('id', $id)->update(['order_guid' => $response['orderGuid']]);

            $msg = "";
            $msg .= "<p>Hi Taist Admin,</p>";
            $msg .= "<p>Please check <a href='https://safescreener.instascreen.net/editor/viewReport.taz?file=" . $response['fileNumber'] . "'>SafeScreener</a> for their status and convert them from Pending to Active from <a href='http://18.216.154.184/admin'>Taist Admin</a>.</p>";
            $msg .= "<p>Thank You! <div>- The Taist Team</div></p>";
            $msg .= "<p><img alt='Taist logo' src='http://18.216.154.184/assets/uploads/images/logo-2.png' /></p>";

            $emailResponse = $this->_sendEmail("contact@taist.app", "Taist - Background Check Submitted by Pending Chef", $msg);

            return response()->json(['success' => 1, 'message' => "Hang tight! Taist is reviewing your account and will let you know when you are approved to start cooking."]);
        } else {
            Log::info('thiis1' . $response);
            return response()->json(['success' => 0, 'error' => "There is an issue with the submitted data formart. Please fill the form correctly."]);
        }
    }

    public function backgroundCheckOrderStatus(Request $request)
    {
        $api_key = env('SAFESCREENER_GUID');

        $pendingChefs = app(Listener::class)->where(['user_type' => 2, 'is_pending' => 1])->where('order_guid', '<>', '')->get();

        foreach ($pendingChefs as $p) {
            $order_status = $this->sendBackgroundCheckRequest($api_key . '/orders/' . $p->order_guid . '/status', [], 'GET');
        }

        return response()->json(['success' => 1]);
    }

    /** Payment */

    public function addPaymentMethod(Request $request)
    {

        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $errorMsg = "";
        $data = request()->input();
        $user = $this->_authUser();

        try {
            require_once('../stripe-php/init.php');
            $stripe = new \Stripe\StripeClient(env('STRIPE_SECRET'));

            $customers = $stripe->customers->all(['email' => $user->email]);
            $customer = null;
            if (count($customers['data'])) {
                $customer = $customers['data'][0];
            }
            if (!$customer) {
                $customer = $stripe->customers->create([
                    'email' => $user->email,
                    'name' => "Customer user - " . $user->email,
                    'description' => "Customer user - " . $user->email
                ]);
            }

            /*
            $b = $stripe->tokens->create([
                'card' => [
                    'number' => $data['number'],
                    'exp_month' => $data['expiryMonth'],
                    'exp_year' => $data['expiryYear'],
                    'cvc' => $data['cvc'],
                ],
            ]);
            $token = $b['id'];
            */

            $c = null;
            if (isset($data['payment_token'])) {
                $c = $stripe->customers->createSource(
                    $customer['id'],
                    ['source' => $data['payment_token']]
                );
            } else {
                return response()->json(['success' => 0, 'error' => 'No token info.']);
            }

            $insert = array();
            $insert['user_id'] = $user->id;
            $insert['stripe_cus_id'] = $customer['id'];
            $insert['last4'] = $data['last4'];
            $insert['card_token'] = $c ? $c['id'] : $data['token'];
            $insert['card_type'] = $data['brand'];
            $insert['zip'] = $data['postalCode'];
            $insert['created_at'] = now();
            $insert['updated_at'] = now();
            app(PaymentMethodListener::class)->where(['user_id' => $user->id, 'active' => 1])->update(['active' => 0]);
            app(PaymentMethodListener::class)->insert($insert);
            $return = app(PaymentMethodListener::class)->where(['user_id' => $user->id])->get();
        } catch (\Stripe\Exception\CardException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\RateLimitException $e) {
            // Too many requests made to the API too quickly
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\InvalidRequestException $e) {
            // Invalid parameters were supplied to Stripe's API
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\AuthenticationException $e) {
            // Authentication with Stripe's API failed
            // (maybe you changed API keys recently)
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\ApiConnectionException $e) {
            // Network communication with Stripe failed
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\ApiErrorException $e) {
            // Display a very generic error to the user, and maybe send
            // yourself an email
            $errorMsg = $e->getError()->message;
        } catch (Exception $e) {
            // Something else happened, completely unrelated to Stripe
            $errorMsg = "Unknow error : " . $e->getMessage();
        }
        if ($errorMsg != "") {
            return response()->json(['success' => 0, 'error' => $errorMsg]);
        }
        return response()->json(['success' => 1, 'data' => $return]);
    }

    public function getPaymentMethods(Request $request)
    {

        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $user = $this->_authUser();
        $data = app(PaymentMethodListener::class)->where(['user_id' => $user->id])->get();
        return response()->json(['success' => 1, 'data' => $data]);
    }

    public function deletePaymentMethod(Request $request)
    {

        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $errorMsg = "";
        $user = $this->_authUser();
        try {
            require_once('../stripe-php/init.php');
            $stripe = new \Stripe\StripeClient(env('STRIPE_SECRET'));

            $customers = $stripe->customers->all(['email' => $user->email]);
            $customer = null;
            if (count($customers['data'])) {
                $customer = $customers['data'][0];
            }
            if ($customer) {
                $pdata = app(PaymentMethodListener::class)->where(['user_id' => $user->id, 'id' => $request->id])->first();
                $stripe->customers->deleteSource(
                    $customer['id'],
                    $pdata->card_token,
                    []
                );
                app(PaymentMethodListener::class)->where(['user_id' => $user->id, 'id' => $request->id])->delete();
            } else {
                $errorMsg = "Invalid Stripe Customer.";
            }
        } catch (\Stripe\Exception\CardException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\RateLimitException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\InvalidRequestException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\AuthenticationException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\ApiConnectionException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\ApiErrorException $e) {
            $errorMsg = $e->getError()->message;
        } catch (Exception $e) {
            $errorMsg = "Unknow error : " . $e->getMessage();
        }
        if ($errorMsg != "") {
            return response()->json(['success' => 0, 'error' => $errorMsg]);
        }
        return response()->json(['success' => 1]);
    }

    public function addStripeAccount(Request $request)
    {

        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = request()->input();
        $user = $this->_authUser();
        $accountId = '';
        $email = $data['email'] ? $data['email'] : $user->email;

        $errorMsg = "";
        // $emailResponse;
        try {
            require_once('../stripe-php/init.php');
            $stripe = new \Stripe\StripeClient(env('STRIPE_SECRET'));

            $account = $stripe->accounts->create([
                'email' => $email,
                'country' => 'US',
                //'type' => 'express',
                'business_type' => 'individual',
                'controller' => [
                    'fees' => ['payer' => 'application'],
                    'losses' => ['payments' => 'application'],
                    'stripe_dashboard' => ['type' => 'express'],
                    //'requirement_collection' => 'application',
                ],
                'capabilities' => [
                    'card_payments' => ['requested' => true],
                    'transfers' => ['requested' => true],
                ],
            ]);

            $accountId = $account['id'];

            $account_link = $stripe->accountLinks->create([
                'account' => $accountId,
                'refresh_url' => 'https://connect.stripe.com/express',
                'return_url' => 'https://connect.stripe.com/express',
                'type' => 'account_onboarding',
            ]);

            if ($account_link) {
                $msg = "";
                $msg .= "<p>Hi " . $user->first_name . ",</p>";
                $msg .= "<p>Please use the link below to set up your payments through Stripe.</p>";
                $msg .= "<p><a href='" . $account_link->url . "'>Setup Stripe</a></p>";
                $msg .= "<p>IMPORTANT: Please use the exact selections below to answer these questions when prompted.</p>";
                $msg .= "<p><b>Industry</b>: Other Food and Dining</p>";
                $msg .= "<p><b>Your website</b>: <a href='https://www.taist.app'>www.taist.app</a></p>";
                $msg .= "<p><img alt='Taist Stripe Setup Guide' src='http://18.216.154.184/assets/uploads/images/stripe_guide.jpeg' /></p>";
                $msg .= "<p>Thank You! <div>- The Taist Team</div></p>";
                $msg .= "<p><img alt='Taist logo' src='http://18.216.154.184/assets/uploads/images/logo-2.png' /></p>";

                $emailResponse = $this->_sendEmail($email, "Taist - Stripe Account Creation", $msg);


                if (app(PaymentMethodListener::class)->where(['user_id' => $user->id, 'active' => 1])->first()) {
                    app(PaymentMethodListener::class)->where(['user_id' => $user->id, 'active' => 1])->update([
                        'stripe_account_id' => $accountId,
                        'updated_at' => now()
                    ]);
                } else {
                    app(PaymentMethodListener::class)->insert([
                        'user_id' => $user->id,
                        'stripe_account_id' => $accountId,
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                }
            }
        } catch (\Stripe\Exception\CardException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\RateLimitException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\InvalidRequestException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\AuthenticationException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\ApiConnectionException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\ApiErrorException $e) {
            $errorMsg = $e->getError()->message;
        } catch (Exception $e) {
            $errorMsg = "Unknow error : " . $e->getMessage();
        }
        if ($errorMsg != "") {
            return response()->json(['success' => 0, 'error' => $errorMsg]);
        }

        return response()->json(['success' => 1]);
    }

    public function createPaymentIntent(Request $request)
    {
        // Validate API Key
        if ($this->_checktaistApiKey($request->header('apiKey')) === false) {
            return response()->json(['success' => 0, 'error' => "Access denied. API key is not valid."]);
        } elseif ($this->_checktaistApiKey($request->header('apiKey')) === -1) {
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);
        }

        $user = $this->_authUser();
        $errorMsg = "";

        try {
            require_once('../stripe-php/init.php');

            $stripe = new \Stripe\StripeClient(env('STRIPE_SECRET'));

            // Retrieve customer from Stripe
            $customers = $stripe->customers->all(['email' => $user->email]);
            $customer = $customers['data'][0] ?? null;

            if (!$customer) {
                return response()->json(['success' => 0, 'error' => "Invalid Stripe customer."]);
            }

            // Get Order and Payment Method
            $order = app(Orders::class)->where('id', $request->order_id)->first();
            if (!$order) {
                return response()->json(['success' => 0, 'error' => "Order not found."]);
            }

            $pdata = app(PaymentMethodListener::class)->where(['user_id' => $order->customer_user_id, 'active' => 1])->first();
            $chefData = app(PaymentMethodListener::class)->where(['user_id' => $order->chef_user_id])->first();

            if (!$chefData || !$chefData->stripe_account_id) {
                return response()->json(['success' => 0, 'error' => "The chef didn't set up the payment."]);
            }

            // Validate customer payment method
            if (!$pdata || !$pdata->card_token) {
                return response()->json(['success' => 0, 'error' => "No valid payment method found for the customer."]);
            }

            $paymentMethod = $stripe->paymentMethods->retrieve($pdata->card_token);

            // Attach payment method to the customer if not already attached
            if (!$paymentMethod->customer) {
                $stripe->paymentMethods->attach($pdata->card_token, ['customer' => $customer['id']]);
            }

            // Check if the payment method is valid
            if (
                $paymentMethod->card->exp_msuperadminonth < now()->month &&
                $paymentMethod->card->exp_year <= now()->year
            ) {
                return response()->json(['success' => 0, 'error' => "The card has expired."]);
            }

            // Create payment intent
            $piToken = $stripe->paymentIntents->create([
                'amount' => $order->total_price * 100,
                'currency' => 'usd',
                'payment_method_types' => ['card'],
                'description' => 'Order ' . $order->id,
                'confirm' => true,
                'customer' => $customer['id'],
                'payment_method' => $pdata->card_token,
                'application_fee_amount' => intval(round(($order->total_price * 0.30) * 100)),
                'transfer_data' => [
                    'destination' => $chefData->stripe_account_id,
                ],
            ]);

            // Save payment intent ID to the order
            app(Orders::class)->where('id', $request->order_id)->update(['payment_token' => $piToken['id']]);

            return response()->json(['success' => 1, 'data' => $piToken]);
        } catch (\Stripe\Exception\CardException $e) {
            Log::info('thiisss' . $e);
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\RateLimitException $e) {
            Log::info('thiisss1' . $e);
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\InvalidRequestException $e) {
            Log::info('thiisss2' . $e);
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\AuthenticationException $e) {
            Log::info('thiisss3' . $e);
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\ApiConnectionException $e) {
            Log::info('thiisss4' . $e);
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\ApiErrorException $e) {
            Log::info('thiisss5' . $e);
            $errorMsg = $e->getError()->message;
        } catch (Exception $e) {
            $errorMsg = "Unknow error : " . $e->getMessage();
        }
        if ($errorMsg != "") {
            return response()->json(['success' => 0, 'error' => $errorMsg]);
        }

        return response()->json(['success' => 0, 'error' => $errorMsg]);
    }


    public function cancelOrderPayment(Request $request)
    {

        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = request()->input();
        $user = $this->_authUser();
        
        // Get cancellation reason if provided
        $cancellationReason = $request->input('cancellation_reason', 'No reason provided');

        $errorMsg = "";
        $refundAmount = 0;
        $refundPercentage = 0;
        $refundStripeId = null;
        
        try {
            require_once('../stripe-php/init.php');
            $stripe = new \Stripe\StripeClient(env('STRIPE_SECRET'));

            $order = app(Orders::class)->where('id', $request->order_id)->first();
            
            if (!$order) {
                return response()->json(['success' => 0, 'error' => 'Order not found']);
            }
            
            $now = now();
            $orderTime = date('Y-m-d H:i:s', $order->order_date);
            $diff = $now->diff($orderTime);

            if ($diff->days > 1) {
                // With automatic capture, payment is already captured
                // For orders older than 1 day, customer gets 100% refund
                $refund = $stripe->refunds->create(['payment_intent' => $order->payment_token, 'amount' => $order->total_price * 100]);
                $refundAmount = $order->total_price;
                $refundPercentage = 100;
                $refundStripeId = $refund->id;
            } else {
                // With automatic capture, payment is already captured
                // Create a partial refund, keeping 20% (cancellation fee)
                $refund = $stripe->refunds->create(['payment_intent' => $order->payment_token, 'amount' => $order->total_price * 80]);
                $refundAmount = $order->total_price * 0.8;
                $refundPercentage = 80;
                $refundStripeId = $refund->id;
            }
            
            // Determine who is cancelling and why
            $cancelledByRole = null;
            $cancellationType = null;
            
            if ($user->user_type == 1) {
                // Customer cancelling
                $cancelledByRole = 'customer';
                $cancellationType = 'customer_request';
            } else if ($user->user_type == 2) {
                // Chef cancelling
                $cancelledByRole = 'chef';
                $cancellationType = 'chef_request';
            } else {
                // Admin or other
                $cancelledByRole = 'admin';
                $cancellationType = 'admin_action';
            }
            
            // Update order with cancellation metadata
            $order->update([
                'cancelled_by_user_id' => $user->id,
                'cancelled_by_role' => $cancelledByRole,
                'cancellation_reason' => $cancellationReason,
                'cancellation_type' => $cancellationType,
                'cancelled_at' => now(),
                'refund_amount' => $refundAmount,
                'refund_percentage' => $refundPercentage,
                'refund_processed_at' => now(),
                'refund_stripe_id' => $refundStripeId,
                'updated_at' => now(),
            ]);
            
        } catch (\Stripe\Exception\CardException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\RateLimitException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\InvalidRequestException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\AuthenticationException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\ApiConnectionException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\ApiErrorException $e) {
            $errorMsg = $e->getError()->message;
        } catch (Exception $e) {
            $errorMsg = "Unknow error : " . $e->getMessage();
        }
        if ($errorMsg != "") {
            return response()->json(['success' => 0, 'error' => $errorMsg]);
        }

        return response()->json([
            'success' => 1,
            'refund_info' => [
                'amount' => $refundAmount,
                'percentage' => $refundPercentage,
                'stripe_id' => $refundStripeId
            ]
        ]);
    }

    public function rejectOrderPayment(Request $request)
    {

        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = request()->input();
        $user = $this->_authUser();
        
        // Get rejection reason if provided
        $cancellationReason = $request->input('cancellation_reason', 'Chef rejected the order');

        $errorMsg = "";
        $refundStripeId = null;
        
        try {
            require_once('../stripe-php/init.php');
            $stripe = new \Stripe\StripeClient(env('STRIPE_SECRET'));

            $order = app(Orders::class)->where('id', $request->order_id)->first();
            
            if (!$order) {
                return response()->json(['success' => 0, 'error' => 'Order not found']);
            }
            
            // With automatic capture, payment is already captured
            // Chef rejection requires full refund to customer
            $refund = $stripe->refunds->create(['payment_intent' => $order->payment_token, 'amount' => $order->total_price * 100]);
            $refundStripeId = $refund->id;
            
            // Update order with rejection metadata
            $order->update([
                'cancelled_by_user_id' => $user->id,
                'cancelled_by_role' => 'chef',
                'cancellation_reason' => $cancellationReason,
                'cancellation_type' => 'chef_rejection',
                'cancelled_at' => now(),
                'refund_amount' => $order->total_price,
                'refund_percentage' => 100,
                'refund_processed_at' => now(),
                'refund_stripe_id' => $refundStripeId,
                'updated_at' => now(),
            ]);
            
        } catch (\Stripe\Exception\CardException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\RateLimitException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\InvalidRequestException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\AuthenticationException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\ApiConnectionException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\ApiErrorException $e) {
            $errorMsg = $e->getError()->message;
        } catch (Exception $e) {
            $errorMsg = "Unknow error : " . $e->getMessage();
        }
        if ($errorMsg != "") {
            return response()->json(['success' => 0, 'error' => $errorMsg]);
        }

        return response()->json([
            'success' => 1,
            'refund_info' => [
                'amount' => $order->total_price,
                'percentage' => 100,
                'stripe_id' => $refundStripeId
            ]
        ]);
    }

    public function completeOrderPayment(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false) {
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        } elseif ($this->_checktaistApiKey($request->header('apiKey')) === -1) {
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);
        }

        $data = $request->input();
        $order = DB::table('tbl_orders as o')
            ->leftJoin('tbl_users as u', 'u.id', '=', 'o.customer_user_id')
            ->where('o.id', $request->order_id)
            ->select(['o.*', 'u.email as customer_email'])
            ->first();

        // Check if order and payment_token are valid
        if (!$order || empty($order->payment_token)) {
            return response()->json(['success' => 0, 'error' => "Order or payment token is invalid."]);
        }

        $errorMsg = "";
        try {
            require_once('../stripe-php/init.php');
            $stripe = new \Stripe\StripeClient(env('STRIPE_SECRET'));

            // Check if customer exists in Stripe
            $customers = $stripe->customers->all(['email' => $order->customer_email]);
            $customer = $customers['data'][0] ?? null;

            if ($customer) {
                // With automatic capture, payment is already captured
                // Just verify the payment intent exists and is successful
                $intent = $stripe->paymentIntents->retrieve($order->payment_token);
                if ($intent->status !== 'succeeded') {
                    $errorMsg = "Payment has not been captured successfully.";
                }
            } else {
                $errorMsg = "Invalid Stripe Customer.";
            }
        } catch (\Stripe\Exception\CardException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\RateLimitException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\InvalidRequestException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\AuthenticationException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\ApiConnectionException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\ApiErrorException $e) {
            $errorMsg = $e->getError()->message;
        } catch (Exception $e) {
            $errorMsg = "Unknown error: " . $e->getMessage();
        }

        if ($errorMsg != "") {
            return response()->json(['success' => 0, 'error' => $errorMsg]);
        }

        return response()->json(['success' => 1]);
    }


    public function tipOrderPayment(Request $request)
    {


        Log::info('thissssss' . json_encode($request->all()));

        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);
        else if ($this->_checktaistApiKey($request->header('apiKey')) === -1)
            return response()->json(['success' => 0, 'error' => "Token has been expired."]);

        $data = request()->input();
        $user = $this->_authUser();

        $errorMsg = "";
        try {
            require_once('../stripe-php/init.php');
            $stripe = new \Stripe\StripeClient(env('STRIPE_SECRET'));

            $customers = $stripe->customers->all(['email' => $user->email]);
            $customer = null;
            if (count($customers['data'])) {
                $customer = $customers['data'][0];
            }
            if ($customer) {
                $order = app(Orders::class)->where('id', $request->order_id)->first();
                $review = app(Reviews::class)->where('order_id', $request->order_id)->first();

                $pdata = app(PaymentMethodListener::class)->where(['user_id' => $order->customer_user_id, 'active' => 1])->first();
                $chefData = app(PaymentMethodListener::class)->where(['user_id' => $order->chef_user_id])->first();
                $user = app(Listener::class)->where(['id' => $order->chef_user_id])->first();

                if ($chefData->stripe_account_id) {
                    $acct_id = $chefData->stripe_account_id;
                } else {
                    return response()->json(['success' => 0, 'error' => "The chef didn't setup the payment."]);
                }

                if ($review->tip_amount > 0) {

                    $piToken = $stripe->paymentIntents->create([
                        'amount' => $review->tip_amount * 100,
                        'currency' => 'usd',
                        'payment_method_types' => ['card'],
                        'confirm' => true,
                        'description' => 'Tip for Order ' . $order->id,
                        'customer' => $customer['id'],
                        'payment_method' => $pdata->card_token,
                        'transfer_data' => [
                            'destination' => $acct_id
                        ]
                    ]);

                    $subject = 'Review and tip for Chef';
                    $body = [
                        'tip' => 'Your customer has left a tip of $' . $review->tip_amount,
                        'review' => $review->review,
                        'ratings' => $review->rating
                    ];

                    $this->notification($user->fcm_token, $subject, json_encode($body), $order->id, $role = 'chef');

                    // Create the notification in the database
                    Notification::create([
                        'title' => $subject,
                        'body' => json_encode($body),
                        'image' => $user->photo ?? 'N/A',
                        'fcm_token' => $user->fcm_token,
                        'user_id' => $user->id,
                        'navigation_id' => $order->id,
                        'role' => $role,
                    ]);
                } else {
                    $subject = 'Review for chef';
                    $body = [
                        'review' => $review->review,
                        'ratings' => $review->rating
                    ];

                    $this->notification($user->fcm_token, $subject, json_encode($body), $order->id, $role = 'chef');

                    // Create the notification in the database
                    Notification::create([
                        'title' => $subject,
                        'body' => json_encode($body),
                        'image' => $user->photo ?? 'N/A',
                        'fcm_token' => $user->fcm_token,
                        'user_id' => $user->id,
                        'navigation_id' => $order->id,
                        'role' => $role,
                    ]);
                }
            } else {
                $errorMsg = "Invalid Stripe Customer.";
            }
        } catch (\Stripe\Exception\CardException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\RateLimitException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\InvalidRequestException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\AuthenticationException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\ApiConnectionException $e) {
            $errorMsg = $e->getError()->message;
        } catch (\Stripe\Exception\ApiErrorException $e) {
            $errorMsg = $e->getError()->message;
        } catch (Exception $e) {
            $errorMsg = "Unknow error : " . $e->getMessage();
        }
        if ($errorMsg != "") {
            return response()->json(['success' => 0, 'error' => $errorMsg]);
        }

        return response()->json(['success' => 1 /*, 'data'=>$piToken */]);
    }

    public function getVersion()
    {
        try {
            $data = Version::all();
            return response()->json(['success' => 1, 'data' => $data]);
        } catch (Exception $e) {
            return response()->json(['success' => 0, 'error' => $e->getMessage()]);
        }
    }

    /**
     * Mark chef safety quiz as completed
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function completeChefQuiz(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false)
            return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

        $user_id = $request->get('user_id');

        if (!$user_id) {
            return response()->json([
                'success' => 0,
                'error' => 'User ID is required'
            ]);
        }

        $user = Listener::find($user_id);

        if (!$user) {
            return response()->json([
                'success' => 0,
                'error' => 'User not found'
            ]);
        }

        // Verify user is a chef
        if ($user->user_type != 2) {
            return response()->json([
                'success' => 0,
                'error' => 'Only chefs can complete the safety quiz'
            ]);
        }

        // Update quiz completion status
        $user->quiz_completed = 1;
        $user->save();

        return response()->json([
            'success' => 1,
            'message' => 'Quiz completed successfully',
            'data' => $user
        ]);
    }


    // ===================================================================

}
