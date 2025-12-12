# Plan: Swipeable Week Calendar Navigation

## Problem Statement
The user wants to swipe between weeks in the calendar without triggering a loading screen. Currently:
- Arrow buttons change the `selectedDate` which triggers `onDateSelect`
- `onDateSelect` triggers `loadData()` via useEffect dependency on `DAY`
- This causes a full chef search API call with loading indicator

**Desired behavior**: Swipe/scroll to browse weeks visually, only trigger search when tapping a specific day.

---

## Current Architecture Analysis

### CustomCalendar Component (`frontend/app/screens/customer/home/components/customCalendar.tsx`)

```typescript
interface CustomCalendarProps {
  selectedDate: moment.Moment;      // Currently selected date (triggers search)
  onDateSelect: (date) => void;     // Callback that triggers parent's loadData
  minDate: moment.Moment;
  maxDate: moment.Moment;
}
```

**Current behavior:**
- `weekDates` is derived from `selectedDate.startOf('week')`
- `navigateWeek()` calls `onDateSelect(newDate)` → triggers search
- `handleDayPress()` calls `onDateSelect(date)` → triggers search

### Parent Component (`frontend/app/screens/customer/home/index.tsx`)

```typescript
const [DAY, onChangeDAY] = useState(moment());

// This useEffect triggers loadData on DAY change
useEffect(() => {
  loadData();
}, [categoryId, timeSlotId, DAY]);

const handleDayPress = (day: moment.Moment) => {
  onChangeDAY(day);  // This triggers the useEffect above
};

<CustomCalendar
  selectedDate={DAY}
  onDateSelect={handleDayPress}
  minDate={startDate}
  maxDate={endDate}
/>
```

---

## Solution Options

### Option A: Internal `viewedWeek` State (Recommended)
Add internal state to track which week is being *viewed* vs which day is *selected*.

**Pros:**
- No changes needed to parent component
- Same API contract maintained
- Clean separation of concerns

**Cons:**
- Need to sync `viewedWeek` when `selectedDate` changes externally

### Option B: Separate Callbacks
Add `onWeekChange` callback that doesn't trigger search.

```typescript
interface CustomCalendarProps {
  selectedDate: moment.Moment;
  onDateSelect: (date) => void;        // Only for day taps
  onWeekChange?: (weekStart) => void;  // Optional, for analytics/tracking
  minDate: moment.Moment;
  maxDate: moment.Moment;
}
```

**Pros:**
- Explicit API
- Parent has visibility into week changes

**Cons:**
- Breaking change to component interface
- Need to update all 3 calendar usages

### Option C: Use Existing Library
Replace custom calendar with `react-native-calendar-strip` which has built-in support.

**Pros:**
- Battle-tested solution
- Infinite scroll built-in
- `scrollable={true}` + `scrollerPaging={true}` for week pagination
- Separate `onDateSelected` and `onWeekChanged` callbacks

**Cons:**
- New dependency
- Need to match existing styling
- May have different behavior edge cases

---

## Recommended Approach: Option A (Internal State)

### Implementation Plan

#### Step 1: Add Internal `viewedWeekStart` State
```typescript
const [viewedWeekStart, setViewedWeekStart] = useState(() =>
  selectedDate.clone().startOf('week')
);
```

#### Step 2: Sync When `selectedDate` Changes Externally
```typescript
useEffect(() => {
  const selectedWeekStart = selectedDate.clone().startOf('week');
  if (!selectedWeekStart.isSame(viewedWeekStart, 'day')) {
    setViewedWeekStart(selectedWeekStart);
  }
}, [selectedDate]);
```

#### Step 3: Generate Week Dates from `viewedWeekStart`
```typescript
const weekDates = useMemo(() => {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    dates.push(viewedWeekStart.clone().add(i, 'days'));
  }
  return dates;
}, [viewedWeekStart]);
```

#### Step 4: Update `navigateWeek` to Only Change View
```typescript
const navigateWeek = (direction: 'prev' | 'next') => {
  const newWeekStart = viewedWeekStart.clone().add(direction === 'next' ? 7 : -7, 'days');
  const newWeekEnd = newWeekStart.clone().add(6, 'days');

  // Allow navigation if ANY day in the new week is within bounds
  if (newWeekEnd.isSameOrAfter(minDate, 'day') && newWeekStart.isSameOrBefore(maxDate, 'day')) {
    setViewedWeekStart(newWeekStart);
  }
};
```

#### Step 5: Keep `handleDayPress` Unchanged
```typescript
const handleDayPress = (date: moment.Moment) => {
  if (date.isBetween(minDate, maxDate, 'day', '[]')) {
    onDateSelect(date);  // Only this triggers search
  }
};
```

#### Step 6: (Optional) Add Swipe Gesture
Use `react-native-gesture-handler` Pan gesture to detect swipes:

```typescript
const panGesture = Gesture.Pan()
  .activeOffsetX([-20, 20])  // Require 20px before activating
  .onEnd((e) => {
    if (e.translationX < -50) {
      navigateWeek('next');  // Now just changes view
    } else if (e.translationX > 50) {
      navigateWeek('prev');  // Now just changes view
    }
  });
```

---

## Visual Behavior After Implementation

| User Action | What Happens | Loading? |
|-------------|--------------|----------|
| Swipe left | View next week | No |
| Swipe right | View previous week | No |
| Tap arrow buttons | View prev/next week | No |
| Tap a day | Select day, trigger search | Yes |
| Tap "Today" button | Select today, trigger search | Yes |

---

## Edge Cases to Handle

### 1. Viewing Week Different from Selected Week
When user swipes to a different week, the previously selected day may not be visible.

**Solution:** Keep showing the orange border on selected day even if not in current view. User can always see which day is selected via the header or by swiping back.

### 2. "Today" Button Logic
Currently shows when `selectedDate !== today`. Should also show when viewing a different week.

**Solution:**
```typescript
const showTodayButton = !viewedWeekStart.isSame(moment().startOf('week'), 'day')
                     || !selectedDate.isSame(moment(), 'day');
```

### 3. Month/Year Header
Should reflect the VIEWED week, not the selected date.

**Solution:**
```typescript
const monthYearText = useMemo(() => {
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];
  // ... format based on viewed week
}, [weekDates]);
```

### 4. External Selection Changes
If parent changes `selectedDate` (e.g., from a different screen), the viewed week should follow.

**Solution:** The useEffect in Step 2 handles this.

---

## Files to Modify

1. `frontend/app/screens/customer/home/components/customCalendar.tsx`
2. `frontend/app/screens/chef/orders/components/customCalendar.tsx`
3. `frontend/app/screens/customer/checkout/components/customCalendar.tsx`

All three have identical structure; apply same pattern to each.

---

## Testing Checklist

- [ ] Swiping left shows next week without loading
- [ ] Swiping right shows previous week without loading
- [ ] Arrow buttons work the same (no loading)
- [ ] Tapping a day triggers search with loading
- [ ] Selected day shows highlight even when viewing different week
- [ ] "Today" button appears when viewing different week
- [ ] "Today" button selects today AND navigates view to today's week
- [ ] Cannot swipe beyond minDate/maxDate bounds
- [ ] Month header updates to reflect viewed week
- [ ] External date changes (from other screens) update the view

---

## Dependencies Already Available

- `react-native-gesture-handler` - v2.28.0 (installed)
- `react-native-reanimated` - v4.1.1 (installed)
- `moment` - already in use

No new dependencies required.

---

## References

- [react-native-gesture-handler Pan Gesture Docs](https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/pan-gesture/)
- [react-native-calendar-strip](https://github.com/BugiDev/react-native-calendar-strip) - reference for scroll/paging API
- [react-native-swipe-calendar](https://github.com/computerjazz/react-native-swipe-calendar) - infinite pager approach
- [react-native-pager-view](https://github.com/callstack/react-native-pager-view) - native paging component

---

## Estimated Complexity

- **Low-Medium** for Option A (internal state)
- Changes are localized to calendar component
- No breaking changes to parent components
- Straightforward state management pattern
