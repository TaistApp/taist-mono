<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanupNullCoordinates extends Command
{
    protected $signature = 'users:cleanup-null-coordinates';
    protected $description = 'Reset latitude/longitude fields that contain the string "null" to actual NULL';

    public function handle()
    {
        $affected = DB::table('tbl_users')
            ->where('latitude', 'null')
            ->orWhere('longitude', 'null')
            ->update(['latitude' => null, 'longitude' => null]);

        $this->info("Cleaned up {$affected} user(s) with invalid coordinates.");

        return 0;
    }
}
