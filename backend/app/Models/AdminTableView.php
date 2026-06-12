<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminTableView extends Model
{
    protected $table = 'tbl_admin_table_views';

    protected $fillable = [
        'admin_id', 'page_key', 'state',
    ];
}
