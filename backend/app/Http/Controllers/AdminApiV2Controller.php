<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Models\Admins;
use App\Listener;
use App\Models\Categories;
use App\Models\Allergens;
use App\Models\Appliances;
use App\Models\Menus;
use App\Models\Customizations;
use App\Models\Availabilities;
use App\Models\Zipcodes;
use App\Models\DiscountCodes;
use App\Models\DiscountCodeUsage;
use App\Notification;
use DB;
use Illuminate\Support\Facades\Log;
use Kreait\Laravel\Firebase\Facades\Firebase;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Exception\FirebaseException;

class AdminApiV2Controller extends Controller
{
    /**
     * Login and return API token.
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = Admins::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'error' => 'The email or password is incorrect, please try again.',
            ], 401);
        }

        if ($user->active != 1) {
            return response()->json([
                'error' => 'Your account is not activated.',
            ], 403);
        }

        // Generate and store token (same pattern as existing LoginController)
        $token = uniqid() . Str::random(60);
        Admins::where('id', $user->id)->update(['api_token' => $token]);

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
            ],
        ]);
    }

    /**
     * Logout — clear the API token.
     */
    public function logout(Request $request)
    {
        $user = Auth::guard('adminapi')->user();
        if ($user) {
            Admins::where('id', $user->id)->update(['api_token' => null]);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Return the authenticated admin user.
     */
    public function me(Request $request)
    {
        $user = Auth::guard('adminapi')->user();

        return response()->json([
            'id' => $user->id,
            'email' => $user->email,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
        ]);
    }

    /**
     * Change the authenticated admin's password.
     */
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6|confirmed',
        ]);

        $user = Auth::guard('adminapi')->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['error' => 'Current password is incorrect.'], 422);
        }

        Admins::where('id', $user->id)->update([
            'password' => Hash::make($request->new_password),
        ]);

        return response()->json(['success' => true]);
    }

    /**
     * Dashboard stats.
     */
    public function dashboard()
    {
        $totalChefs = DB::table('tbl_users')->where('user_type', 2)->count();
        $totalCustomers = DB::table('tbl_users')->where('user_type', 1)->count();
        $totalOrders = DB::table('tbl_orders')->count();
        $pendingCount = DB::table('tbl_users')->where(['user_type' => 2, 'is_pending' => 1])->count();
        $monthlyRevenue = DB::table('tbl_orders')
            ->where('status', 3)
            ->where('updated_at', '>', DB::raw('DATE_SUB(NOW(), INTERVAL 1 MONTH)'))
            ->sum('total_price');

        return response()->json([
            'total_chefs' => $totalChefs,
            'total_customers' => $totalCustomers,
            'total_orders' => $totalOrders,
            'pending_count' => $pendingCount,
            'monthly_revenue' => round((float)$monthlyRevenue, 2),
        ]);
    }

    /**
     * All chefs with availability, overrides, and live menus.
     */
    public function chefs()
    {
        $tz = new \DateTimeZone('America/Los_Angeles');
        $now = new \DateTime('now', $tz);
        $today = $now->format('Y-m-d');
        $tomorrow = (clone $now)->modify('+1 day')->format('Y-m-d');

        $chefs = app(Listener::class)
            ->where(['user_type' => 2])
            ->with(['availability', 'availabilityOverrides' => function ($query) use ($today, $tomorrow) {
                $query->whereIn('override_date', [$today, $tomorrow])
                      ->orderBy('override_date');
            }, 'menus' => function ($query) {
                $query->where('is_live', 1);
            }])
            ->get();

        $result = $chefs->map(function ($chef) {
            $avail = $chef->availability;

            // Format weekly availability
            $weekly = [];
            if ($avail) {
                $days = [
                    'M' => ['monday_start', 'monday_end'],
                    'T' => ['tuesday_start', 'tuesday_end'],
                    'W' => ['wednesday_start', 'wednesday_end'],
                    'Th' => ['thursday_start', 'thursday_end'],
                    'F' => ['friday_start', 'friday_end'],
                    'Sa' => ['saterday_start', 'saterday_end'],
                    'Su' => ['sunday_start', 'sunday_end'],
                ];
                foreach ($days as $abbr => [$start, $end]) {
                    $s = $avail->$start;
                    $e = $avail->$end;
                    if ($s && $e) {
                        $weekly[] = "$abbr: $s-$e";
                    }
                }
            }

            // Format overrides
            $overrides = $chef->availabilityOverrides->map(function ($o) {
                return [
                    'date' => $o->override_date,
                    'start' => $o->start_time,
                    'end' => $o->end_time,
                    'status' => $o->status, // confirmed, cancelled, pending
                ];
            });

            // Determine status string
            if ($chef->is_pending == 1 || $chef->verified == 0) {
                $status = 'Pending';
            } elseif ($chef->verified == 1) {
                $status = 'Active';
            } elseif ($chef->verified == 2) {
                $status = 'Rejected';
            } elseif ($chef->verified == 3) {
                $status = 'Banned';
            } else {
                $status = 'Unknown';
            }

            return [
                'id' => $chef->id,
                'email' => $chef->email,
                'first_name' => $chef->first_name,
                'last_name' => $chef->last_name,
                'status' => $status,
                'verified' => $chef->verified,
                'is_pending' => $chef->is_pending,
                'phone' => $chef->phone,
                'birthday' => $chef->birthday,
                'address' => $chef->address,
                'city' => $chef->city,
                'state' => $chef->state,
                'zip' => $chef->zip,
                'latitude' => $chef->latitude,
                'longitude' => $chef->longitude,
                'photo' => $chef->photo,
                'created_at' => $chef->created_at,
                'weekly_availability' => $weekly,
                'live_overrides' => $overrides,
                'live_menus' => $chef->menus->pluck('title')->toArray(),
            ];
        });

        return response()->json($result);
    }

    /**
     * Pending chefs with availability details.
     */
    public function pendings()
    {
        $pendings = DB::table('tbl_users as u')
            ->leftJoin('tbl_availabilities as a', 'a.user_id', '=', 'u.id')
            ->where(['user_type' => 2, 'is_pending' => 1])
            ->select([
                'u.id', 'u.email', 'u.first_name', 'u.last_name', 'u.phone',
                'u.birthday', 'u.address', 'u.city', 'u.state', 'u.zip',
                'u.verified', 'u.is_pending', 'u.photo', 'u.created_at',
                'a.bio',
                'a.monday_start', 'a.monday_end',
                'a.tuesday_start', 'a.tuesday_end',
                'a.wednesday_start', 'a.wednesday_end',
                'a.thursday_start', 'a.thursday_end',
                'a.friday_start', 'a.friday_end',
                'a.saterday_start', 'a.saterday_end',
                'a.sunday_start', 'a.sunday_end',
                'a.minimum_order_amount', 'a.max_order_distance',
            ])
            ->get();

        $result = $pendings->map(function ($p) {
            $days = [
                'Mon' => [$p->monday_start, $p->monday_end],
                'Tue' => [$p->tuesday_start, $p->tuesday_end],
                'Wed' => [$p->wednesday_start, $p->wednesday_end],
                'Thu' => [$p->thursday_start, $p->thursday_end],
                'Fri' => [$p->friday_start, $p->friday_end],
                'Sat' => [$p->saterday_start, $p->saterday_end],
                'Sun' => [$p->sunday_start, $p->sunday_end],
            ];

            $availability = [];
            foreach ($days as $day => [$start, $end]) {
                $availability[$day] = ($start && $end) ? "$start - $end" : null;
            }

            return [
                'id' => $p->id,
                'email' => $p->email,
                'first_name' => $p->first_name,
                'last_name' => $p->last_name,
                'phone' => $p->phone,
                'birthday' => $p->birthday,
                'address' => $p->address,
                'city' => $p->city,
                'state' => $p->state,
                'zip' => $p->zip,
                'bio' => $p->bio,
                'photo' => $p->photo,
                'created_at' => strtotime($p->created_at),
                'availability' => $availability,
                'min_order_amount' => $p->minimum_order_amount,
                'max_order_distance' => $p->max_order_distance,
            ];
        });

        return response()->json($result);
    }

    /**
     * All categories with chef email and status counts.
     */
    public function categories()
    {
        $categories = DB::table('tbl_categories as c')
            ->leftJoin('tbl_users as u', 'c.chef_id', '=', 'u.id')
            ->leftJoin('tbl_menus as m', 'c.menu_id', '=', 'm.id')
            ->select(['c.*', 'u.email as chef_email', 'm.title as menu_title'])
            ->get();

        $requestedCount = DB::table('tbl_categories')->where('status', 1)->count();

        $result = $categories->map(function ($c) {
            $statusMap = [1 => 'Requested', 2 => 'Approved', 3 => 'Rejected'];
            return [
                'id' => $c->id,
                'name' => $c->name,
                'chef_id' => $c->chef_id,
                'chef_email' => $c->chef_email,
                'menu_id' => $c->menu_id,
                'menu_title' => $c->menu_title,
                'status' => $statusMap[$c->status] ?? 'Unknown',
                'status_code' => $c->status,
                'created_at' => strtotime($c->created_at),
            ];
        });

        return response()->json([
            'categories' => $result,
            'requested_count' => $requestedCount,
        ]);
    }

    /**
     * All customers.
     */
    public function customers()
    {
        $customers = app(Listener::class)->where(['user_type' => 1])->get();

        $result = $customers->map(function ($c) {
            if ($c->verified == 1) {
                $status = 'Active';
            } elseif ($c->verified == 0) {
                $status = 'Pending';
            } elseif ($c->verified == 2) {
                $status = 'Rejected';
            } elseif ($c->verified == 3) {
                $status = 'Banned';
            } else {
                $status = 'Unknown';
            }

            return [
                'id' => $c->id,
                'email' => $c->email,
                'first_name' => $c->first_name,
                'last_name' => $c->last_name,
                'phone' => $c->phone,
                'birthday' => $c->birthday,
                'address' => $c->address,
                'city' => $c->city,
                'state' => $c->state,
                'zip' => $c->zip,
                'status' => $status,
                'verified' => $c->verified,
                'latitude' => $c->latitude,
                'longitude' => $c->longitude,
                'created_at' => $c->created_at,
            ];
        });

        return response()->json($result);
    }

    /**
     * All orders with customer, chef, menu, review, and cancellation details.
     */
    public function orders()
    {
        // Check if cancellation columns exist (added in a later migration) — cached per process
        static $hasCancellationCols = null;
        if ($hasCancellationCols === null) {
            $hasCancellationCols = \Schema::hasColumn('tbl_orders', 'cancelled_by_user_id');
        }

        $query = DB::table('tbl_orders as o')
            ->leftJoin('tbl_users as f', 'o.customer_user_id', '=', 'f.id')
            ->leftJoin('tbl_users as t', 'o.chef_user_id', '=', 't.id')
            ->leftJoin('tbl_menus as m', 'm.id', '=', 'o.menu_id')
            ->leftJoin('tbl_reviews as r', 'r.order_id', '=', 'o.id');

        $selects = [
            'o.id', 'o.customer_user_id', 'o.chef_user_id', 'o.menu_id',
            'o.amount', 'o.total_price', 'o.addons', 'o.address',
            'o.order_date', 'o.order_date_new', 'o.order_time', 'o.status', 'o.notes', 'o.payment_token',
            'o.created_at', 'o.updated_at',
            'f.email as customer_email',
            'f.first_name as customer_first_name',
            'f.last_name as customer_last_name',
            't.email as chef_email',
            't.first_name as chef_first_name',
            't.last_name as chef_last_name',
            'm.title as menu_title',
            'r.rating', 'r.review', 'r.tip_amount',
        ];

        if ($hasCancellationCols) {
            $query->leftJoin('tbl_users as c', 'o.cancelled_by_user_id', '=', 'c.id');
            $selects = array_merge($selects, [
                'o.cancelled_by_user_id', 'o.cancelled_by_role',
                'o.cancellation_reason', 'o.cancelled_at', 'o.cancellation_type',
                'o.refund_amount', 'o.refund_percentage',
                'o.refund_processed_at', 'o.refund_stripe_id',
                'o.is_auto_closed',
                'c.first_name as cancelled_by_first_name',
                'c.last_name as cancelled_by_last_name',
                'c.email as cancelled_by_email',
            ]);
        }

        $orders = $query->select($selects)->orderBy('o.id', 'DESC')->get();

        $statusMap = [
            1 => 'Requested', 2 => 'Accepted', 3 => 'Completed',
            4 => 'Cancelled', 5 => 'Rejected', 6 => 'Expired', 7 => 'On My Way',
        ];

        $result = $orders->map(function ($o) use ($statusMap, $hasCancellationCols) {
            $row = [
                'id' => $o->id,
                'customer' => [
                    'name' => trim($o->customer_first_name . ' ' . $o->customer_last_name),
                    'email' => $o->customer_email,
                ],
                'chef' => [
                    'name' => trim($o->chef_first_name . ' ' . $o->chef_last_name),
                    'email' => $o->chef_email,
                ],
                'menu_title' => $o->menu_title,
                'quantity' => $o->amount,
                'total_price' => (float)$o->total_price,
                'order_date' => (int)$o->order_date,
                'order_date_new' => $o->order_date_new,
                'order_time' => $o->order_time,
                'status' => $statusMap[$o->status] ?? 'Unknown',
                'status_code' => (int)$o->status,
                'notes' => $o->notes,
                'cancelled_by' => null,
                'cancelled_at' => null,
                'cancellation_type' => null,
                'cancellation_reason' => null,
                'is_auto_closed' => false,
                'refund_amount' => null,
                'refund_percentage' => null,
                'refund_processed_at' => null,
                'refund_stripe_id' => null,
                'review' => $o->rating ? [
                    'rating' => (float)$o->rating,
                    'text' => $o->review,
                    'tip_amount' => (float)$o->tip_amount,
                ] : null,
                'created_at' => (int)$o->created_at,
            ];

            if ($hasCancellationCols && $o->cancelled_by_user_id) {
                $row['cancelled_by'] = [
                    'role' => $o->cancelled_by_role,
                    'name' => trim($o->cancelled_by_first_name . ' ' . $o->cancelled_by_last_name),
                    'email' => $o->cancelled_by_email,
                ];
                $row['cancelled_at'] = $o->cancelled_at;
                $row['cancellation_type'] = $o->cancellation_type;
                $row['cancellation_reason'] = $o->cancellation_reason;
                $row['refund_amount'] = $o->refund_amount ? (float)$o->refund_amount : null;
                $row['refund_percentage'] = $o->refund_percentage;
                $row['refund_processed_at'] = $o->refund_processed_at;
                $row['refund_stripe_id'] = $o->refund_stripe_id;
                $row['is_auto_closed'] = (bool)$o->is_auto_closed;
            }

            return $row;
        });

        return response()->json($result);
    }

    /**
     * Earnings per active chef (monthly and yearly aggregates).
     */
    public function earnings()
    {
        $earnings = DB::table('tbl_users as u')
            ->join('tbl_orders as o', 'o.chef_user_id', '=', 'u.id')
            ->where(['user_type' => 2, 'is_pending' => 0, 'verified' => 1])
            ->where('o.status', 3)
            ->selectRaw('u.id, u.email, u.first_name, u.last_name,
                SUM(CASE WHEN o.updated_at > DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN o.total_price ELSE 0 END) AS monthly_earning,
                SUM(CASE WHEN o.updated_at > DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN 1 ELSE 0 END) AS monthly_orders,
                SUM(CASE WHEN o.updated_at > DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN o.amount ELSE 0 END) AS monthly_items,
                SUM(CASE WHEN o.updated_at > DATE_SUB(NOW(), INTERVAL 1 YEAR) THEN o.total_price ELSE 0 END) AS yearly_earning,
                SUM(CASE WHEN o.updated_at > DATE_SUB(NOW(), INTERVAL 1 YEAR) THEN 1 ELSE 0 END) AS yearly_orders,
                SUM(CASE WHEN o.updated_at > DATE_SUB(NOW(), INTERVAL 1 YEAR) THEN o.amount ELSE 0 END) AS yearly_items')
            ->groupBy('u.id', 'u.email', 'u.first_name', 'u.last_name')
            ->get();

        $result = $earnings->map(function ($e) {
            return [
                'chef_id' => $e->id,
                'email' => $e->email,
                'name' => trim($e->first_name . ' ' . $e->last_name),
                'monthly_earning' => round((float)$e->monthly_earning, 2),
                'monthly_orders' => (int)$e->monthly_orders,
                'monthly_items' => (int)$e->monthly_items,
                'yearly_earning' => round((float)$e->yearly_earning, 2),
                'yearly_orders' => (int)$e->yearly_orders,
                'yearly_items' => (int)$e->yearly_items,
            ];
        });

        return response()->json($result);
    }

    /**
     * All contact tickets with parsed issue context.
     */
    public function contacts()
    {
        $tickets = DB::table('tbl_tickets as t')
            ->leftJoin('tbl_users as u', 't.user_id', '=', 'u.id')
            ->select(['t.*', 'u.email as user_email'])
            ->orderBy('t.id', 'DESC')
            ->get();

        $statusMap = [1 => 'In Review', 2 => 'Resolved'];

        $result = $tickets->map(function ($t) use ($statusMap) {
            // Parse message to extract issue context
            $rawMessage = $t->message ?? '';
            $marker = "\n---\nIssue Context:\n";
            $markerPos = strpos($rawMessage, $marker);

            $message = $rawMessage;
            $issueContext = null;

            if ($markerPos !== false) {
                $message = substr($rawMessage, 0, $markerPos);
                $contextText = substr($rawMessage, $markerPos + strlen($marker));
                $lines = explode("\n", $contextText);
                $issueContext = [];
                foreach ($lines as $line) {
                    $line = trim($line);
                    if (empty($line)) continue;
                    $colonPos = strpos($line, ':');
                    if ($colonPos !== false) {
                        $key = trim(substr($line, 0, $colonPos));
                        $value = trim(substr($line, $colonPos + 1));
                        $issueContext[$key] = $value;
                    }
                }
            }

            return [
                'id' => $t->id,
                'user_id' => $t->user_id,
                'email' => $t->user_email,
                'subject' => $t->subject,
                'message' => $message,
                'issue_context' => $issueContext,
                'status' => $statusMap[$t->status] ?? 'Unknown',
                'status_code' => (int)$t->status,
                'created_at' => strtotime($t->created_at),
            ];
        });

        return response()->json($result);
    }

    // ==================== Phase 5: Menus + Customizations + Profiles ====================

    /**
     * All menus with chef info and parsed category/allergen/appliance names.
     */
    public function menus()
    {
        $menus = DB::table('tbl_menus as m')
            ->leftJoin('tbl_users as u', 'm.user_id', '=', 'u.id')
            ->select(['m.*', 'u.email as user_email', 'u.first_name as user_first_name', 'u.last_name as user_last_name', 'u.photo as user_photo'])
            ->get();

        $categories = app(Categories::class)->pluck('name', 'id')->toArray();
        $allergens = app(Allergens::class)->pluck('name', 'id')->toArray();
        $appliances = app(Appliances::class)->pluck('name', 'id')->toArray();

        $result = $menus->map(function ($m) use ($categories, $allergens, $appliances) {
            return [
                'id' => $m->id,
                'user_email' => $m->user_email,
                'user_name' => trim($m->user_first_name . ' ' . $m->user_last_name),
                'user_photo' => $m->user_photo,
                'title' => $m->title,
                'description' => $m->description,
                'price' => (float)$m->price,
                'serving_size' => (int)$m->serving_size,
                'estimated_time' => (float)$m->estimated_time,
                'is_live' => (bool)$m->is_live,
                'category_names' => $this->mapIdsToNames($m->category_ids ?? '', $categories),
                'allergen_names' => $this->mapIdsToNames($m->allergens ?? '', $allergens),
                'appliance_names' => $this->mapIdsToNames($m->appliances ?? '', $appliances),
                'created_at' => is_numeric($m->created_at) ? (int)$m->created_at : strtotime($m->created_at),
            ];
        });

        return response()->json($result);
    }

    private function mapIdsToNames($idString, $lookup)
    {
        if (empty($idString)) return '';
        $ids = array_filter(explode(',', $idString));
        $names = array_map(fn($id) => $lookup[(int)$id] ?? '', $ids);
        return implode(', ', array_filter($names));
    }

    /**
     * Single menu for editing.
     */
    public function menuShow($id)
    {
        $menu = app(Menus::class)->where('id', $id)->first();
        if (!$menu) {
            return response()->json(['error' => 'Menu not found'], 404);
        }
        return response()->json([
            'id' => $menu->id,
            'title' => $menu->title,
            'description' => $menu->description,
        ]);
    }

    /**
     * Update menu title and description.
     */
    public function menuUpdate(Request $request, $id)
    {
        $request->validate(['title' => 'required|string', 'description' => 'required|string']);
        app(Menus::class)->where('id', $id)->update([
            'title' => $request->title,
            'description' => $request->description,
            'updated_at' => time(),
        ]);
        return response()->json(['success' => true]);
    }

    /**
     * All customizations with menu title.
     */
    public function customizations()
    {
        $customizations = DB::table('tbl_customizations as c')
            ->leftJoin('tbl_menus as m', 'm.id', '=', 'c.menu_id')
            ->select(['c.*', 'm.title as menu_title'])
            ->get();

        $result = $customizations->map(function ($c) {
            return [
                'id' => $c->id,
                'menu_id' => $c->menu_id,
                'menu_title' => $c->menu_title,
                'name' => $c->name,
                'upcharge_price' => (float)$c->upcharge_price,
                'created_at' => is_numeric($c->created_at) ? (int)$c->created_at : strtotime($c->created_at),
            ];
        });

        return response()->json($result);
    }

    /**
     * Single customization for editing.
     */
    public function customizationShow($id)
    {
        $c = app(Customizations::class)->where('id', $id)->first();
        if (!$c) {
            return response()->json(['error' => 'Customization not found'], 404);
        }
        return response()->json(['id' => $c->id, 'name' => $c->name]);
    }

    /**
     * Update customization name.
     */
    public function customizationUpdate(Request $request, $id)
    {
        $request->validate(['name' => 'required|string']);
        app(Customizations::class)->where('id', $id)->update([
            'name' => $request->name,
            'updated_at' => time(),
        ]);
        return response()->json(['success' => true]);
    }

    /**
     * All active verified chef profiles with availability.
     */
    public function profiles()
    {
        $profiles = DB::table('tbl_users as u')
            ->leftJoin('tbl_availabilities as a', 'a.user_id', '=', 'u.id')
            ->where(['user_type' => 2, 'is_pending' => 0, 'verified' => 1])
            ->select([
                'u.id', 'u.email', 'u.first_name', 'u.last_name',
                'u.phone', 'u.created_at',
                'a.id as availability_id', 'a.bio',
                'a.monday_start', 'a.monday_end',
                'a.tuesday_start', 'a.tuesday_end',
                'a.wednesday_start', 'a.wednesday_end',
                'a.thursday_start', 'a.thursday_end',
                'a.friday_start', 'a.friday_end',
                'a.saterday_start', 'a.saterday_end',
                'a.sunday_start', 'a.sunday_end',
                'a.minimum_order_amount', 'a.max_order_distance',
            ])
            ->get();

        $result = $profiles->map(function ($p) {
            $days = [
                'Mon' => [$p->monday_start, $p->monday_end],
                'Tue' => [$p->tuesday_start, $p->tuesday_end],
                'Wed' => [$p->wednesday_start, $p->wednesday_end],
                'Thu' => [$p->thursday_start, $p->thursday_end],
                'Fri' => [$p->friday_start, $p->friday_end],
                'Sat' => [$p->saterday_start, $p->saterday_end],
                'Sun' => [$p->sunday_start, $p->sunday_end],
            ];
            $availability = [];
            foreach ($days as $day => [$start, $end]) {
                $availability[$day] = ($start && $end) ? "$start - $end" : null;
            }

            return [
                'id' => $p->id,
                'email' => $p->email,
                'name' => trim($p->first_name . ' ' . $p->last_name),
                'bio' => $p->bio,
                'availability' => $availability,
                'min_order_amount' => $p->minimum_order_amount,
                'max_order_distance' => $p->max_order_distance,
                'created_at' => is_numeric($p->created_at) ? (int)$p->created_at : strtotime($p->created_at),
            ];
        });

        return response()->json($result);
    }

    /**
     * Single profile for editing.
     */
    public function profileShow($id)
    {
        $a = app(Availabilities::class)->where('user_id', $id)->first();
        if (!$a) {
            return response()->json(['error' => 'Profile not found'], 404);
        }
        return response()->json(['id' => $a->id, 'user_id' => $id, 'bio' => $a->bio]);
    }

    /**
     * Update profile bio.
     */
    public function profileUpdate(Request $request, $id)
    {
        $request->validate(['bio' => 'required|string']);
        app(Availabilities::class)->where('user_id', $id)->update([
            'bio' => $request->bio,
            'updated_at' => time(),
        ]);
        return response()->json(['success' => true]);
    }

    // ==================== Phase 6: Chats + Reviews + Transactions ====================

    /**
     * All chat conversations with sender/recipient names.
     */
    public function chats()
    {
        $chats = DB::table('tbl_conversations as c')
            ->leftJoin('tbl_users as f', 'c.from_user_id', '=', 'f.id')
            ->leftJoin('tbl_users as t', 'c.to_user_id', '=', 't.id')
            ->select([
                'c.*',
                'f.email as from_user_email', 'f.first_name as from_first_name', 'f.last_name as from_last_name',
                't.email as to_user_email', 't.first_name as to_first_name', 't.last_name as to_last_name',
            ])
            ->orderBy('c.id', 'DESC')
            ->get();

        $result = $chats->map(function ($c) {
            return [
                'id' => $c->id,
                'order_id' => $c->order_id,
                'from_user' => [
                    'name' => trim($c->from_first_name . ' ' . $c->from_last_name),
                    'email' => $c->from_user_email,
                ],
                'to_user' => [
                    'name' => trim($c->to_first_name . ' ' . $c->to_last_name),
                    'email' => $c->to_user_email,
                ],
                'message' => $c->message,
                'is_viewed' => (bool)$c->is_viewed,
                'created_at' => is_numeric($c->created_at) ? (int)$c->created_at : strtotime($c->created_at),
            ];
        });

        return response()->json($result);
    }

    /**
     * All reviews with customer and chef emails.
     */
    public function reviews()
    {
        $reviews = DB::table('tbl_reviews as r')
            ->leftJoin('tbl_users as f', 'r.from_user_id', '=', 'f.id')
            ->leftJoin('tbl_users as t', 'r.to_user_id', '=', 't.id')
            ->select(['r.*', 'f.email as from_user_email', 't.email as to_user_email'])
            ->orderBy('r.id', 'DESC')
            ->get();

        $result = $reviews->map(function ($r) {
            return [
                'id' => $r->id,
                'order_id' => $r->order_id,
                'from_user_email' => $r->from_user_email,
                'to_user_email' => $r->to_user_email,
                'rating' => (float)$r->rating,
                'review' => $r->review,
                'tip_amount' => (float)$r->tip_amount,
                'created_at' => is_numeric($r->created_at) ? (int)$r->created_at : strtotime($r->created_at),
            ];
        });

        return response()->json($result);
    }

    /**
     * All transactions with from/to user details.
     */
    public function transactions()
    {
        $transactions = DB::table('tbl_transactions as t')
            ->leftJoin('tbl_users as f', 't.from_user_id', '=', 'f.id')
            ->leftJoin('tbl_users as t2', 't.to_user_id', '=', 't2.id')
            ->select([
                't.*',
                'f.email as from_user_email', 'f.first_name as from_first_name', 'f.last_name as from_last_name',
                't2.email as to_user_email', 't2.first_name as to_first_name', 't2.last_name as to_last_name',
            ])
            ->orderBy('t.id', 'DESC')
            ->get();

        $result = $transactions->map(function ($t) {
            return [
                'id' => $t->id,
                'order_id' => $t->order_id,
                'from_user' => [
                    'name' => trim($t->from_first_name . ' ' . $t->from_last_name),
                    'email' => $t->from_user_email,
                ],
                'to_user' => [
                    'name' => trim($t->to_first_name . ' ' . $t->to_last_name),
                    'email' => $t->to_user_email,
                ],
                'amount' => (float)$t->amount,
                'notes' => $t->notes,
                'created_at' => is_numeric($t->created_at) ? (int)$t->created_at : strtotime($t->created_at),
            ];
        });

        return response()->json($result);
    }

    // ==================== Phase 7: Zipcodes + Discount Codes ====================

    /**
     * Get current zipcodes.
     */
    public function zipcodes()
    {
        $record = app(Zipcodes::class)->first();
        return response()->json([
            'id' => $record ? $record->id : null,
            'zipcodes' => $record ? $record->zipcodes : '',
        ]);
    }

    /**
     * Update zipcodes and notify affected customers about new service areas.
     */
    public function zipcodesUpdate(Request $request)
    {
        $request->validate(['zipcodes' => 'required|string']);
        $record = app(Zipcodes::class)->first();
        if (!$record) {
            return response()->json(['success' => false, 'error' => 'No zipcodes record found'], 404);
        }

        $oldZipcodes = array_filter(array_map('trim', explode(',', $record->zipcodes)));
        $newZipcodes = array_filter(array_map('trim', explode(',', $request->zipcodes)));
        $addedZipcodes = array_diff($newZipcodes, $oldZipcodes);

        $record->update(['zipcodes' => $request->zipcodes, 'updated_at' => time()]);

        $notified = 0;
        if (!empty($addedZipcodes)) {
            $notified = $this->notifyUsersAboutNewZipcodes($addedZipcodes);
        }

        return response()->json(['success' => true, 'notified_users' => $notified]);
    }

    private function notifyUsersAboutNewZipcodes($newZipcodes)
    {
        try {
            $messaging = Firebase::messaging();

            $affectedUsers = app(Listener::class)
                ->where('user_type', 1)
                ->whereIn('zip', $newZipcodes)
                ->whereNotNull('fcm_token')
                ->get();

            if ($affectedUsers->isEmpty()) {
                Log::info("No users found in new zip codes: " . implode(', ', $newZipcodes));
                return 0;
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

                    $messaging->send($fcmMessage);

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
            return count($affectedUsers);
        } catch (\Exception $e) {
            Log::error("Error in notifyUsersAboutNewZipcodes: " . $e->getMessage());
            return 0;
        }
    }

    /**
     * All discount codes.
     */
    public function discountCodes()
    {
        $codes = app(DiscountCodes::class)->orderBy('created_at', 'desc')->get();
        return response()->json($codes);
    }

    /**
     * Create a new discount code.
     */
    public function discountCodeCreate(Request $request)
    {
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
            'created_by_admin_id' => Auth::guard('adminapi')->user()->id,
        ]);

        return response()->json(['success' => 1, 'data' => $code]);
    }

    /**
     * Update mutable fields of a discount code.
     */
    public function discountCodeUpdate(Request $request, $id)
    {
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

        return response()->json(['success' => 1, 'data' => $code->fresh()]);
    }

    /**
     * Deactivate a discount code.
     */
    public function discountCodeDeactivate($id)
    {
        $code = app(DiscountCodes::class)->findOrFail($id);
        $code->update(['is_active' => 0]);
        return response()->json(['success' => 1]);
    }

    /**
     * Activate a discount code.
     */
    public function discountCodeActivate($id)
    {
        $code = app(DiscountCodes::class)->findOrFail($id);
        $code->update(['is_active' => 1]);
        return response()->json(['success' => 1]);
    }

    /**
     * Usage history for a discount code.
     */
    public function discountCodeUsage($id)
    {
        $code = app(DiscountCodes::class)->findOrFail($id);
        $usages = DB::table('tbl_discount_code_usage as u')
            ->join('tbl_users', 'u.customer_user_id', '=', 'tbl_users.id')
            ->join('tbl_orders', 'u.order_id', '=', 'tbl_orders.id')
            ->where('u.discount_code_id', $id)
            ->select([
                'u.*',
                'tbl_users.first_name as customer_first_name',
                'tbl_users.last_name as customer_last_name',
                'tbl_users.email as customer_email',
                'tbl_orders.status as order_status',
            ])
            ->orderBy('u.used_at', 'desc')
            ->get();

        return response()->json(['success' => 1, 'data' => ['code' => $code, 'usages' => $usages]]);
    }
}
