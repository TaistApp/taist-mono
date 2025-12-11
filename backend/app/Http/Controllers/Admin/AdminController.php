<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use DB;

use App\Listener;
use App\Models\Admins;
use App\Models\Allergens;
use App\Models\Appliances;
use App\Models\Availabilities;
use App\Models\Categories;
use App\Models\Conversations;
use App\Models\Customizations;
use App\Models\Meals;
use App\Models\Menus;
use App\Models\Orders;
use App\Models\Reviews;
use App\Models\Tickets;
use App\Models\Transactions;
use App\Models\Zipcodes;
use App\Models\DiscountCodes;
use App\Models\DiscountCodeUsage;
use Kreait\Laravel\Firebase\Facades\Firebase;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Exception\FirebaseException;
use Illuminate\Support\Facades\Log;
use App\Notification;

require_once('api/SimpleXLSXGen.php');
use SimpleXLSXGen;

class AdminController extends Controller
{
    private $limit = 10;
    protected function guard() {
        return Auth::guard('admin');
    }
    
    private function _getFormattedData($data) {
        foreach ($data as &$aa) {
            if (isset($aa->updated_at) && strlen($aa->updated_at) > 10)
                $aa->updated_at = strtotime($aa->updated_at);
            if (isset($aa->created_at) && strlen($aa->created_at) > 10)
                $aa->created_at = strtotime($aa->created_at);
            if (isset($aa->invited_at) && strlen($aa->invited_at) > 10)
                $aa->invited_at = strtotime($aa->invited_at);
        }
        return $data;
    }

    private static function getUserStatus($st) {
        if ($st == 1)
            return "Active";
        else if ($st == 0)
            return "Pending";
        else if ($st == 2)
            return "Rejected";
        else if ($st == 3)
            return "Banned";
        else 
            return "None";
    }

    private static function getOrderStatus($st) {
        if ($st == 1)
            return "Requested";
        else if ($st == 2)
            return "Accepted";
        else if ($st == 3)
            return "Completed";
        else if ($st == 4)
            return "Cancelled";
        else if ($st == 5)
            return "Rejected";
        else if ($st == 6)
            return "Expired";
        else if ($st == 7)
            return "On My Way";
        else 
            return "None";
    }

    public function index(Request $request) {
        $data['title'] = "Taist - Admin Panel";
        $user = $this->guard()->user();
        $data['user'] = $user;

        return view("admin.chefs", $data);
    }

    public function chefs(Request $request) {
        $data['title'] = "Taist - Admin Panel";
        $user = $this->guard()->user();
        $data['user'] = $user;
        //$data['chefs'] = app(Listener::class)->where(['user_type'=>2, 'is_pending'=>0])->get();
        $data['chefs'] = app(Listener::class)->where(['user_type'=>2])->get();

        return view("admin.chefs", $data);
    }

    public function pendings(Request $request) {
        $data['title'] = "Taist - Admin Panel";
        $user = $this->guard()->user();
        $data['user'] = $user;
        $data['pendings'] = DB::table('tbl_users as u')
            ->leftJoin('tbl_availabilities as a', 'a.user_id', '=', 'u.id')
            ->where(['user_type' => 2, 'is_pending' => 1])
            ->select(['u.*', 'a.bio', 'a.monday_start', 'a.monday_end', 'a.tuesday_start', 'a.tuesday_end', 'a.wednesday_start', 'a.wednesday_end', 'a.thursday_start', 'a.thursday_end', 'a.friday_start', 'a.friday_end', 'a.saterday_start', 'a.saterday_end', 'a.sunday_start', 'a.sunday_end', 'a.minimum_order_amount', 'a.max_order_distance'])
            ->get();

        return view("admin.pendings", $data);
    }

    public function categories(Request $request) {
        $data['title'] = "Taist - Admin Panel";
        $user = $this->guard()->user();
        $data['user'] = $user;
        $data['categories'] = DB::table('tbl_categories as c')->leftJoin('tbl_users as u', 'c.chef_id', '=', 'u.id')
            ->select(['c.*', 'u.email as user_email'])->get();
        $data['requestedCount'] = DB::table('tbl_categories')->where('status', 1)->count();

        return view("admin.categories", $data);
    }

    public function menus(Request $request) {
        $data['title'] = "Taist - Admin Panel";
        $user = $this->guard()->user();
        $data['user'] = $user;

        // Simplified query - removed unnecessary GROUP BY
        $data['menus'] = DB::table('tbl_menus as m')
            ->leftJoin('tbl_users as u', 'm.user_id', '=', 'u.id')
            ->select(['m.*', 'u.email as user_email', 'u.first_name as user_first_name', 'u.last_name as user_last_name', 'u.photo as user_photo'])
            ->get();

        // Get all lookups in single queries instead of N+1
        $categories = app(Categories::class)->pluck('name', 'id')->toArray();
        $allergens = app(Allergens::class)->pluck('name', 'id')->toArray();
        $appliances = app(Appliances::class)->pluck('name', 'id')->toArray();

        foreach ($data['menus'] as &$a) {
            // Parse comma-separated IDs and map to names
            $a->category_list = (object)['title' => $this->mapIdsToNames($a->category_ids ?? '', $categories)];
            $a->allergen_list = (object)['title' => $this->mapIdsToNames($a->allergens ?? '', $allergens)];
            $a->appliance_list = (object)['title' => $this->mapIdsToNames($a->appliances ?? '', $appliances)];
        }

        return view("admin.menus", $data);
    }

    private function mapIdsToNames($idString, $lookup) {
        if (empty($idString)) return '';
        $ids = array_filter(explode(',', $idString));
        $names = array_map(fn($id) => $lookup[(int)$id] ?? '', $ids);
        return implode(',', array_filter($names));
    }

    public function editMenu(Request $request, $id) {
        $data['title'] = "Taist - Admin Panel";
        $user = $this->guard()->user();
        $data['user'] = $user;
        $data['menu'] = app(Menus::class)->where(['id'=>$id])->first();

        return view("admin.menus_edit", $data);
    }

    public function updateMenu(Request $request, $id) {
        app(Menus::class)->where(['id'=>$id])->update(['title'=>$request->title, 'description'=>$request->description, 'updated_at'=>time()]);

        return redirect()->to('/admin/menus');
    }

    public function customizations(Request $request) {
        $data['title'] = "Taist - Admin Panel";
        $user = $this->guard()->user();
        $data['user'] = $user;
        $data['customizations'] = DB::table('tbl_customizations as c')->leftJoin('tbl_menus as m', 'm.id', '=', 'c.menu_id')
            ->select(['c.*', 'm.title as menu_title'])->get();

        return view("admin.customizations", $data);
    }

    public function editCustomizations(Request $request, $id) {
        $data['title'] = "Taist - Admin Panel";
        $user = $this->guard()->user();
        $data['user'] = $user;
        $data['customization'] = app(Customizations::class)->where(['id'=>$id])->first();

        return view("admin.customizations_edit", $data);
    }

    public function updateCustomizations(Request $request, $id) {
        app(Customizations::class)->where(['id'=>$id])->update(['name'=>$request->name, 'updated_at'=>time()]);

        return redirect()->to('/admin/customizations');
    }

    public function profiles(Request $request) {
        $data['title'] = "Taist - Admin Panel";
        $user = $this->guard()->user();
        $data['user'] = $user;
        $data['profiles'] = DB::table('tbl_users as u')->leftJoin('tbl_availabilities as a', 'a.user_id', '=', 'u.id')->where(['user_type' => 2, 'is_pending' => 0, 'verified' => 1])
            ->select(['u.*', 'a.bio', 'a.monday_start', 'a.monday_end', 'a.tuesday_start', 'a.tuesday_end', 'a.wednesday_start', 'a.wednesday_end', 'a.thursday_start', 'a.thursday_end', 'a.friday_start', 'a.friday_end', 'a.saterday_start', 'a.saterday_end', 'a.sunday_start', 'a.sunday_end', 'a.minimum_order_amount', 'a.max_order_distance'])->get();

        return view("admin.profiles", $data);
    }

    public function editProfiles(Request $request, $id) {
        $data['title'] = "Taist - Admin Panel";
        $user = $this->guard()->user();
        $data['user'] = $user;
        $data['profile'] = app(Availabilities::class)->where(['user_id'=>$id])->first();

        return view("admin.profiles_edit", $data);
    }

    public function updateProfiles(Request $request, $id) {
        app(Availabilities::class)->where(['id'=>$id])->update(['bio'=>$request->bio, 'updated_at'=>time()]);

        return redirect()->to('/admin/profiles');
    }

    public function earnings(Request $request) {
        $data['title'] = "Taist - Admin Panel";
        $user = $this->guard()->user();
        $data['user'] = $user;
        $data['earnings'] = DB::table('tbl_users as u')->join('tbl_orders as o', 'o.chef_user_id', '=', 'u.id')
            ->where(['user_type' => 2, 'is_pending' => 0, 'verified' => 1])
            ->where(['status' => 3])
            ->selectRaw('u.*, SUM(CASE WHEN o.updated_at > DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN o.total_price ELSE 0 END) AS monthly_earning, SUM(CASE WHEN o.updated_at > DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN 1 ELSE 0 END) AS monthly_orders, SUM(CASE WHEN o.updated_at > DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN o.amount ELSE 0 END) AS monthly_items, SUM(CASE WHEN o.updated_at > DATE_SUB(NOW(), INTERVAL 1 YEAR) THEN o.total_price ELSE 0 END) AS yearly_earning, SUM(CASE WHEN o.updated_at > DATE_SUB(NOW(), INTERVAL 1 YEAR) THEN 1 ELSE 0 END) AS yearly_orders, SUM(CASE WHEN o.updated_at > DATE_SUB(NOW(), INTERVAL 1 YEAR) THEN o.amount ELSE 0 END) AS yearly_items')
            ->get();

        return view("admin.earnings", $data);
    }

    public function customers(Request $request) {
        $data['title'] = "Taist - Admin Panel";
        $user = $this->guard()->user();
        $data['user'] = $user;
        $data['customers'] = app(Listener::class)->where(['user_type'=>1])->get();

        return view("admin.customers", $data);
    }

    public function chats(Request $request) {
        $data['title'] = "Taist - Admin Panel";
        $user = $this->guard()->user();
        $data['user'] = $user;
        $data['chats'] = DB::table('tbl_conversations as c')->leftJoin('tbl_users as f', 'c.from_user_id', '=', 'f.id')->leftJoin('tbl_users as t', 'c.to_user_id', '=', 't.id')
            ->select(['c.*', 'f.email as from_user_email', 'f.first_name as from_first_name', 'f.last_name as from_last_name', 't.email as to_user_email', 't.first_name as to_first_name', 't.last_name as to_last_name'])->get();

        return view("admin.chats", $data);
    }

    public function orders(Request $request) {
        $data['title'] = "Taist - Admin Panel";
        $user = $this->guard()->user();
        $data['user'] = $user;
        
        // Fetch orders with all related data including cancellation details
        $data['orders'] = DB::table('tbl_orders as o')
            ->leftJoin('tbl_users as f', 'o.customer_user_id', '=', 'f.id')
            ->leftJoin('tbl_users as t', 'o.chef_user_id', '=', 't.id')
            ->leftJoin('tbl_menus as m', 'm.id', '=', 'o.menu_id')
            ->leftJoin('tbl_reviews as r', 'r.order_id', '=', 'o.id')
            ->leftJoin('tbl_users as c', 'o.cancelled_by_user_id', '=', 'c.id')
            ->select([
                'o.*', 
                'f.email as customer_user_email', 
                'f.first_name as customer_first_name', 
                'f.last_name as customer_last_name', 
                't.email as chef_user_email', 
                't.first_name as chef_first_name', 
                't.last_name as chef_last_name', 
                'm.title as menu_title', 
                'r.rating as rating', 
                'r.review as review', 
                'r.tip_amount as tip_amount',
                // Cancellation details
                'c.first_name as cancelled_by_first_name',
                'c.last_name as cancelled_by_last_name',
                'c.email as cancelled_by_email'
            ])
            ->orderBy('o.id', 'DESC')
            ->get();

        foreach ($data['orders'] as &$a) {
            $a->status_str = $this->getOrderStatus($a->status);
        }

        return view("admin.orders", $data);
    }

    public function reviews(Request $request) {
        $data['title'] = "Taist - Admin Panel";
        $user = $this->guard()->user();
        $data['user'] = $user;
        $data['reviews'] = DB::table('tbl_reviews as r')->leftJoin('tbl_users as f', 'r.from_user_id', '=', 'f.id')->leftJoin('tbl_users as t', 'r.to_user_id', '=', 't.id')
            ->select(['r.*', 'f.email as from_user_email', 't.email as to_user_email'])->get();

        return view("admin.reviews", $data);
    }

    public function contacts(Request $request) {
        $data['title'] = "Taist - Admin Panel";
        $user = $this->guard()->user();
        $data['user'] = $user;
        $data['contacts'] = DB::table('tbl_tickets as t')->leftJoin('tbl_users as u', 't.user_id', '=', 'u.id')
            ->select(['t.*', 'u.email as user_email'])->get();

        return view("admin.contacts", $data);
    }

    public function transactions(Request $request) {
        $data['title'] = "Taist - Admin Panel";
        $user = $this->guard()->user();
        $data['user'] = $user;
        $data['transactions'] = app(Transactions::class)->get();

        return view("admin.transactions", $data);
    }

    public function zipcodes(Request $request) {
        $data['title'] = "Taist - Admin Panel";
        $user = $this->guard()->user();
        $data['user'] = $user;
        $data['zipcodes'] = app(Zipcodes::class)->first();

        return view("admin.zipcodes", $data);
    }

    public function updateZipcodes(Request $request) {
        $zipcodesRecord = app(Zipcodes::class)->first();
        
        // Get old and new zip codes as arrays
        $oldZipcodes = array_filter(array_map('trim', explode(',', $zipcodesRecord->zipcodes)));
        $newZipcodes = array_filter(array_map('trim', explode(',', $request->zipcodes)));
        
        // Find newly added zip codes
        $addedZipcodes = array_diff($newZipcodes, $oldZipcodes);
        
        // Update the database
        $zipcodesRecord->update(['zipcodes'=>$request->zipcodes, 'updated_at'=>time()]);
        
        // If new zip codes were added, send notifications
        if (!empty($addedZipcodes)) {
            $this->notifyUsersAboutNewZipcodes($addedZipcodes);
        }

        return redirect()->to('/admin/zipcodes');
    }
    
    private function notifyUsersAboutNewZipcodes($newZipcodes)
    {
        try {
            $notification = Firebase::messaging();
            
            // Find users in the newly added zip codes who are customers
            $affectedUsers = app(Listener::class)
                ->where('user_type', 1) // Customers only
                ->whereIn('zip', $newZipcodes)
                ->whereNotNull('fcm_token')
                ->get();
            
            if ($affectedUsers->isEmpty()) {
                Log::info("No users found in new zip codes: " . implode(', ', $newZipcodes));
                return;
            }
            
            $zipList = implode(', ', array_slice($newZipcodes, 0, 3));
            if (count($newZipcodes) > 3) {
                $zipList .= ' and more';
            }
            
            $message = "Great news! Taist is now available in your area. Check out local chefs now!";
            
            foreach ($affectedUsers as $user) {
                try {
                    $fcmMessage = CloudMessage::fromArray([
                        'token' => $user->fcm_token,
                        'notification' => [
                            'title' => 'Taist Now Available in Your Area!',
                            'body' => $message,
                        ],
                        'data' => [
                            'type' => 'zipcode_update',
                            'role' => 'user',
                        ]
                    ]);
                    
                    $notification->send($fcmMessage);
                    
                    // Log notification for tracking
                    Notification::create([
                        'title' => 'Service Area Expansion',
                        'body' => $message,
                        'image' => 'N/A',
                        'fcm_token' => $user->fcm_token,
                        'user_id' => $user->id,
                        'navigation_id' => 0,
                        'role' => 'user',
                    ]);
                    
                } catch (FirebaseException $e) {
                    Log::error("Failed to send zip code notification to user {$user->id}: " . $e->getMessage());
                }
            }
            
            Log::info("Notified " . count($affectedUsers) . " users about new zip codes: " . implode(', ', $newZipcodes));
            
        } catch (\Exception $e) {
            Log::error("Error in notifyUsersAboutNewZipcodes: " . $e->getMessage());
        }
    }
    
    public function exportChefs(Request $request) {
        $user = $this->guard()->user();
        $data = [[
            'Email',
            'First name',
            'Last name',
            'Phone',
            'Birthday',
            'Address',
            'City',
            'State',
            'Zip',
            'Status',
            'Created at'
        ]];
        
        //$rows = app(Listener::class)->where(['user_type'=>2, 'is_pending'=>0])->get();
        $rows = app(Listener::class)->where(['user_type'=>2])->get();
        foreach ($rows as &$a) {
            $a['status'] = $this->getUserStatus($a['verified']);
            $data[] = [
                $a['email'],
                $a['first_name'],
                $a['last_name'],
                $a['phone'],
                date('Y-m-d', $a['birthday']),
                $a['address'],
                $a['city'],
                $a['state'],
                $a['zip'],
                $a['status'],
                date('Y-m-d H:i:s', ((int)$a['created_at'])),
            ];
        }

        $xlsx = SimpleXLSXGen::fromArray( $data );
        $xlsx->downloadAs('Taist - Chefs.xlsx');
    }

    public function exportPendings(Request $request) {
        $user = $this->guard()->user();
        $data = [[
            'Email',
            'First name',
            'Last name',
            'Phone',
            'Birthday',
            'Address',
            'City',
            'State',
            'Zip',
            'Status',
            'Created at'
        ]];
        
        $rows = app(Listener::class)->where(['user_type'=>2, 'is_pending'=>1])->get();
        foreach ($rows as &$a) {
            $a['status'] = $this->getUserStatus($a['verified']);
            $data[] = [
                $a['email'],
                $a['first_name'],
                $a['last_name'],
                $a['phone'],
                date('Y-m-d', $a['birthday']),
                $a['address'],
                $a['city'],
                $a['state'],
                $a['zip'],
                $a['status'],
                date('Y-m-d H:i:s', ((int)$a['created_at'])),
            ];
        }

        $xlsx = SimpleXLSXGen::fromArray( $data );
        $xlsx->downloadAs('Taist - Pending chefs.xlsx');
    }

    public function exportCustomers(Request $request) {
        $user = $this->guard()->user();
        $data = [[
            'Email',
            'First name',
            'Last name',
            'Phone',
            'Birthday',
            'Address',
            'City',
            'State',
            'Zip',
            'Status',
            'Created at'
        ]];
        
        $rows = app(Listener::class)->where(['user_type'=>1])->get();
        foreach ($rows as &$a) {
            $a['status'] = $this->getUserStatus($a['verified']);
            $data[] = [
                $a['email'],
                $a['first_name'],
                $a['last_name'],
                $a['phone'],
                date('Y-m-d', $a['birthday']),
                $a['address'],
                $a['city'],
                $a['state'],
                $a['zip'],
                $a['status'],
                date('Y-m-d H:i:s', ((int)$a['created_at'])),
            ];
        }

        $xlsx = SimpleXLSXGen::fromArray( $data );
        $xlsx->downloadAs('Taist - Customers.xlsx');
    }

    // Discount Codes Management

    public function discountCodes(Request $request) {
        $data['title'] = "Taist - Discount Codes";
        $user = $this->guard()->user();
        $data['user'] = $user;
        $data['codes'] = app(DiscountCodes::class)
            ->orderBy('created_at', 'desc')
            ->get();

        return view("admin.discount_codes", $data);
    }

    public function createDiscountCode(Request $request) {
        $request->validate([
            'code' => 'required|string|max:50|unique:tbl_discount_codes,code',
            'discount_type' => 'required|in:fixed,percentage',
            'discount_value' => 'required|numeric|min:0',
        ]);

        $code = app(DiscountCodes::class)->create([
            'code' => strtoupper($request->code),
            'description' => $request->description,
            'discount_type' => $request->discount_type,
            'discount_value' => $request->discount_value,
            'max_uses' => $request->max_uses,
            'max_uses_per_customer' => $request->max_uses_per_customer ?? 1,
            'valid_from' => $request->valid_from,
            'valid_until' => $request->valid_until,
            'minimum_order_amount' => $request->minimum_order_amount,
            'maximum_discount_amount' => $request->maximum_discount_amount,
            'is_active' => 1,
            'created_by_admin_id' => $this->guard()->user()->id,
        ]);

        return response()->json(['success' => 1, 'data' => $code]);
    }

    public function updateDiscountCode(Request $request, $id) {
        $code = app(DiscountCodes::class)->findOrFail($id);
        
        $updateData = [];
        if ($request->has('description')) $updateData['description'] = $request->description;
        if ($request->has('max_uses')) $updateData['max_uses'] = $request->max_uses;
        if ($request->has('max_uses_per_customer')) $updateData['max_uses_per_customer'] = $request->max_uses_per_customer;
        if ($request->has('valid_from')) $updateData['valid_from'] = $request->valid_from;
        if ($request->has('valid_until')) $updateData['valid_until'] = $request->valid_until;
        if ($request->has('minimum_order_amount')) $updateData['minimum_order_amount'] = $request->minimum_order_amount;
        if ($request->has('maximum_discount_amount')) $updateData['maximum_discount_amount'] = $request->maximum_discount_amount;

        $code->update($updateData);

        return response()->json(['success' => 1, 'data' => $code]);
    }

    public function deactivateDiscountCode(Request $request, $id) {
        $code = app(DiscountCodes::class)->findOrFail($id);
        $code->update(['is_active' => 0]);

        return response()->json(['success' => 1, 'message' => 'Code deactivated successfully']);
    }

    public function activateDiscountCode(Request $request, $id) {
        $code = app(DiscountCodes::class)->findOrFail($id);
        $code->update(['is_active' => 1]);

        return response()->json(['success' => 1, 'message' => 'Code activated successfully']);
    }

    public function viewDiscountCodeUsage(Request $request, $id) {
        $code = app(DiscountCodes::class)->findOrFail($id);
        $usages = app(DiscountCodeUsage::class)
            ->where('discount_code_id', $id)
            ->join('tbl_users', 'tbl_discount_code_usage.customer_user_id', '=', 'tbl_users.id')
            ->join('tbl_orders', 'tbl_discount_code_usage.order_id', '=', 'tbl_orders.id')
            ->select([
                'tbl_discount_code_usage.*',
                'tbl_users.first_name as customer_first_name',
                'tbl_users.last_name as customer_last_name',
                'tbl_users.email as customer_email',
                'tbl_orders.status as order_status'
            ])
            ->orderBy('tbl_discount_code_usage.used_at', 'desc')
            ->get();

        return response()->json(['success' => 1, 'data' => ['code' => $code, 'usages' => $usages]]);
    }

}
