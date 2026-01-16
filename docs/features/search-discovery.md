# Search & Discovery

Documentation of the chef search algorithm, location-based matching, and filtering system.

---

## Table of Contents

1. [Overview](#overview)
2. [Search Flow](#search-flow)
3. [Search Parameters](#search-parameters)
4. [Availability Calculation](#availability-calculation)
5. [Search Algorithm](#search-algorithm)
6. [Frontend Implementation](#frontend-implementation)
7. [Performance Optimization](#performance-optimization)

---

## Overview

The search system helps customers discover available chefs based on:
- **Location** - Service area by ZIP code
- **Date/Time** - When they want the order
- **Category** - Type of cuisine
- **Availability** - Chef's schedule and overrides

**Related Files:**
- Backend: `backend/app/Http/Controllers/MapiController.php` (`getSearchChefs`)
- Frontend: `frontend/app/screens/customer/(tabs)/(home)/home/`

---

## Search Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     CUSTOMER SEARCH                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────┐     ┌────────────┐     ┌────────────┐       │
│  │  Location  │────>│   Date &   │────>│  Category  │       │
│  │  (ZIP)     │     │   Time     │     │  (Optional)│       │
│  └────────────┘     └────────────┘     └────────────┘       │
│         │                 │                  │               │
│         └─────────────────┼──────────────────┘               │
│                           │                                  │
│                           ▼                                  │
│                  ┌────────────────┐                          │
│                  │  Search API    │                          │
│                  │  get_search_   │                          │
│                  │    chefs       │                          │
│                  └───────┬────────┘                          │
│                          │                                   │
│         ┌────────────────┼────────────────┐                  │
│         │                │                │                  │
│         ▼                ▼                ▼                  │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐           │
│  │   Filter   │   │   Check    │   │   Load     │           │
│  │   Active   │   │   Avail-   │   │   Menus &  │           │
│  │   Chefs    │   │   ability  │   │   Reviews  │           │
│  └────────────┘   └────────────┘   └────────────┘           │
│                          │                                   │
│                          ▼                                   │
│                  ┌────────────────┐                          │
│                  │  Chef Results  │                          │
│                  │  with Menus    │                          │
│                  └────────────────┘                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Search Parameters

### API Endpoint

```
GET /get_search_chefs/{zipcode_id}
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| zipcode_id | int | Yes | ZIP code ID (path param) |
| selected_date | string | No | Date (YYYY-MM-DD) |
| week_day | string | No | Day name (monday, etc.) |
| time_slot | string | No | breakfast, lunch, dinner, late |
| category_id | int | No | Filter by cuisine category |
| timezone | string | No | Customer's timezone |

### Time Slots

| Slot | Time Range |
|------|------------|
| breakfast | 6:00 - 11:00 |
| lunch | 11:00 - 15:00 |
| dinner | 15:00 - 21:00 |
| late | 21:00 - 24:00 |

---

## Availability Calculation

### Hierarchy

Chef availability is determined by:

1. **Override** (highest priority) - Day-specific override
2. **Weekly Schedule** - Recurring availability
3. **Online Status** - Real-time toggle

```php
function isChefAvailable($chef, $date, $time) {
    // 1. Check for override on this date
    $override = AvailabilityOverride::forChef($chef->id)
        ->forDate($date)
        ->first();

    if ($override) {
        if ($override->status === 'cancelled') {
            return false;
        }
        return $override->isAvailableAt($time);
    }

    // 2. Check weekly schedule
    $dayName = strtolower(date('l', strtotime($date)));
    $availability = Availabilities::where('user_id', $chef->id)->first();

    if (!$availability) {
        return false;
    }

    $startField = $dayName . '_start';
    $endField = $dayName . '_end';

    if (!$availability->$startField || !$availability->$endField) {
        return false;
    }

    // 3. Check if time falls within schedule
    return $time >= $availability->$startField
        && $time < $availability->$endField;
}
```

### Override Statuses

| Status | Meaning |
|--------|---------|
| confirmed | Chef confirmed regular hours |
| modified | Chef has different hours today |
| cancelled | Chef not available today |

---

## Search Algorithm

### Backend Implementation

```php
// MapiController@getSearchChefs
public function getSearchChefs(Request $request, $zipcodeId)
{
    $selectedDate = $request->selected_date;
    $weekDay = $request->week_day ?? strtolower(date('l', strtotime($selectedDate)));
    $timeSlot = $request->time_slot;
    $categoryId = $request->category_id;
    $timezone = $request->timezone ?? 'America/Chicago';

    // Get time range for slot
    $timeRange = $this->getTimeRangeForSlot($timeSlot);

    // Base query: Active, approved chefs
    $query = Listener::where('user_type', 2)
        ->where('is_pending', 0)
        ->whereNotNull('latitude')
        ->whereNotNull('longitude');

    // Join with availability to filter by schedule
    $startField = $weekDay . '_start';
    $endField = $weekDay . '_end';

    $query->whereHas('availability', function($q) use ($startField, $endField, $timeRange) {
        $q->whereNotNull($startField)
          ->whereNotNull($endField);

        if ($timeRange) {
            // Chef's hours overlap with requested time slot
            $q->where($startField, '<=', $timeRange['end'])
              ->where($endField, '>=', $timeRange['start']);
        }
    });

    // Apply override filtering
    if ($selectedDate) {
        $query->where(function($q) use ($selectedDate, $timeRange) {
            // No override OR override not cancelled
            $q->whereDoesntHave('availabilityOverrides', function($oq) use ($selectedDate) {
                $oq->where('override_date', $selectedDate)
                   ->where('status', 'cancelled');
            });

            // If has modified override, check times
            if ($timeRange) {
                $q->orWhereHas('availabilityOverrides', function($oq) use ($selectedDate, $timeRange) {
                    $oq->where('override_date', $selectedDate)
                       ->where('status', 'modified')
                       ->where('start_time', '<=', $timeRange['end'])
                       ->where('end_time', '>=', $timeRange['start']);
                });
            }
        });
    }

    // Filter by category
    if ($categoryId) {
        $query->whereHas('menus', function($mq) use ($categoryId) {
            $mq->where('is_live', 1)
               ->whereRaw("FIND_IN_SET(?, category_ids)", [$categoryId]);
        });
    }

    // Only chefs with live menus
    $query->whereHas('menus', function($mq) {
        $mq->where('is_live', 1);
    });

    // Execute query
    $chefs = $query->get();

    // Load related data
    $chefs->load(['menus' => function($q) {
        $q->where('is_live', 1);
    }, 'menus.customizations', 'reviews']);

    // Calculate ratings
    foreach ($chefs as $chef) {
        $chef->avg_rating = $chef->reviews->avg('rating') ?? 0;
        $chef->review_count = $chef->reviews->count();
    }

    return response()->json([
        'success' => true,
        'data' => $chefs,
    ]);
}

private function getTimeRangeForSlot($slot)
{
    switch ($slot) {
        case 'breakfast':
            return ['start' => '06:00', 'end' => '11:00'];
        case 'lunch':
            return ['start' => '11:00', 'end' => '15:00'];
        case 'dinner':
            return ['start' => '15:00', 'end' => '21:00'];
        case 'late':
            return ['start' => '21:00', 'end' => '24:00'];
        default:
            return null;
    }
}
```

---

## Frontend Implementation

### Search Screen

**File:** `frontend/app/screens/customer/(tabs)/(home)/home/index.tsx`

### State Management

```typescript
const [searchParams, setSearchParams] = useState({
  zipcode_id: null,
  selected_date: null,
  time_slot: null,
  category_id: null,
});

const [chefs, setChefs] = useState<IUser[]>([]);
const [loading, setLoading] = useState(false);
```

### Search API Call

```typescript
// frontend/app/services/api.ts
export const GetSearchChefAPI = async (params: {
  zipcode_id: number;
  selected_date?: string;
  week_day?: string;
  time_slot?: string;
  category_id?: number;
  timezone?: string;
}) => {
  const queryParams = new URLSearchParams();

  if (params.selected_date) queryParams.append('selected_date', params.selected_date);
  if (params.week_day) queryParams.append('week_day', params.week_day);
  if (params.time_slot) queryParams.append('time_slot', params.time_slot);
  if (params.category_id) queryParams.append('category_id', params.category_id.toString());
  if (params.timezone) queryParams.append('timezone', params.timezone);

  const url = `/get_search_chefs/${params.zipcode_id}?${queryParams.toString()}`;
  return await GET(url);
};
```

### UI Components

**Date Selection:**
```typescript
// Calendar showing next 30 days
const DateSelector = ({ selected, onSelect }) => {
  const dates = generateDateRange(30);

  return (
    <ScrollView horizontal>
      {dates.map(date => (
        <DateChip
          key={date}
          date={date}
          selected={date === selected}
          onPress={() => onSelect(date)}
        />
      ))}
    </ScrollView>
  );
};
```

**Time Slot Selection:**
```typescript
const TimeSlotSelector = ({ selected, onSelect }) => {
  const slots = [
    { id: 'breakfast', label: 'Breakfast', time: '6am-11am' },
    { id: 'lunch', label: 'Lunch', time: '11am-3pm' },
    { id: 'dinner', label: 'Dinner', time: '3pm-9pm' },
    { id: 'late', label: 'Late Night', time: '9pm-12am' },
  ];

  return (
    <View style={styles.slotContainer}>
      {slots.map(slot => (
        <SlotChip
          key={slot.id}
          {...slot}
          selected={slot.id === selected}
          onPress={() => onSelect(slot.id)}
        />
      ))}
    </View>
  );
};
```

**Category Filter:**
```typescript
const CategoryFilter = ({ categories, selected, onSelect }) => {
  return (
    <ScrollView horizontal>
      <CategoryChip
        label="All"
        selected={!selected}
        onPress={() => onSelect(null)}
      />
      {categories.map(cat => (
        <CategoryChip
          key={cat.id}
          label={cat.name}
          selected={cat.id === selected}
          onPress={() => onSelect(cat.id)}
        />
      ))}
    </ScrollView>
  );
};
```

### Chef Card Display

```typescript
const ChefCard = ({ chef }) => {
  return (
    <Pressable onPress={() => navigate.toCustomer.chefDetail({ chefId: chef.id })}>
      <Image source={{ uri: chef.photo }} style={styles.chefPhoto} />
      <Text style={styles.chefName}>{chef.first_name} {chef.last_name}</Text>
      <View style={styles.ratingRow}>
        <StarIcon />
        <Text>{chef.avg_rating.toFixed(1)}</Text>
        <Text>({chef.review_count} reviews)</Text>
      </View>
      <Text style={styles.menuCount}>{chef.menus.length} menu items</Text>
    </Pressable>
  );
};
```

---

## Performance Optimization

### Database Indexes

```sql
-- Chef search performance indexes
CREATE INDEX idx_users_chef_search ON tbl_users(user_type, is_pending, latitude, longitude);
CREATE INDEX idx_menus_live ON tbl_menus(user_id, is_live);
CREATE INDEX idx_availability_user ON tbl_availabilities(user_id);
CREATE INDEX idx_overrides_chef_date ON tbl_availability_overrides(chef_id, override_date);
```

### Query Optimization

1. **Eager Loading** - Load menus and reviews in single query
2. **Select Only Needed Fields** - Reduce data transfer
3. **Pagination** - Limit results for large datasets

```php
$query->select([
    'id', 'first_name', 'last_name', 'photo',
    'latitude', 'longitude', 'bio'
])
->with(['menus:id,user_id,title,price,photo,is_live', 'reviews:id,to_user_id,rating'])
->take(50);
```

### Caching

Consider caching for:
- Category list (rarely changes)
- Zipcode list (rarely changes)
- Chef availability (short TTL)

```php
$categories = Cache::remember('categories', 3600, function() {
    return Categories::where('status', 2)->get();
});
```

### Frontend Optimization

```typescript
// Debounce search on filter changes
const debouncedSearch = useMemo(
  () => debounce(performSearch, 300),
  []
);

// Memoize chef list
const sortedChefs = useMemo(() => {
  return chefs.sort((a, b) => b.avg_rating - a.avg_rating);
}, [chefs]);
```

---

## Error Handling

### No Results

```typescript
if (chefs.length === 0) {
  return (
    <EmptyState
      title="No chefs available"
      message="Try adjusting your filters or selecting a different date"
    />
  );
}
```

### Location Issues

```typescript
if (!selectedZipcode) {
  return (
    <LocationPrompt
      onSelectZipcode={(zip) => setSearchParams({ ...params, zipcode_id: zip.id })}
    />
  );
}
```
