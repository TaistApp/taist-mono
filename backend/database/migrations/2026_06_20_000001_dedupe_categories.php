<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Removes duplicate cuisine categories from tbl_categories.
 *
 * Categories were created with no uniqueness guard, so production ended up with
 * repeated chips on the customer Home screen (e.g. two "Indian", two
 * "Vegetarian"). This collapses each set of same-named categories — matched
 * case-insensitively and ignoring surrounding whitespace — down to the single
 * lowest id, repoints any menus tagged with the duplicate ids onto the kept id,
 * then deletes the duplicate rows.
 *
 * tbl_menus.category_ids is a comma-separated set filtered with FIND_IN_SET, so
 * menus must be repointed before the duplicate rows go away or those menus
 * would stop matching the surviving chip.
 *
 * Runs automatically on deploy via `php artisan migrate --force` (see Procfile).
 */
return new class extends Migration
{
    public function up(): void
    {
        $categories = DB::table('tbl_categories')->orderBy('id', 'ASC')->get();

        // Group by normalized name; keep the lowest id as canonical.
        $canonicalByName = [];   // normalized name => canonical id
        $remap = [];             // duplicate id => canonical id
        foreach ($categories as $cat) {
            $key = mb_strtolower(trim($cat->name));
            if ($key === '') continue;
            if (!isset($canonicalByName[$key])) {
                $canonicalByName[$key] = $cat->id;
            } else {
                $remap[$cat->id] = $canonicalByName[$key];
            }
        }

        if (empty($remap)) {
            return; // nothing to clean up
        }

        // Repoint any menus tagged with a duplicate id onto the canonical id.
        $menus = DB::table('tbl_menus')
            ->select('id', 'category_ids')
            ->get();

        foreach ($menus as $menu) {
            $ids = array_filter(array_map('trim', explode(',', (string) $menu->category_ids)), 'strlen');
            $changed = false;
            $mapped = [];
            foreach ($ids as $id) {
                if (isset($remap[$id])) {
                    $mapped[] = (string) $remap[$id];
                    $changed = true;
                } else {
                    $mapped[] = (string) $id;
                }
            }

            if (!$changed) continue;

            // Preserve order, drop dupes introduced by the remap.
            $mapped = array_values(array_unique($mapped));
            DB::table('tbl_menus')
                ->where('id', $menu->id)
                ->update(['category_ids' => implode(',', $mapped)]);
        }

        // Remove the duplicate category rows.
        DB::table('tbl_categories')->whereIn('id', array_keys($remap))->delete();
    }

    public function down(): void
    {
        // Irreversible: deleted duplicate rows cannot be restored.
    }
};
