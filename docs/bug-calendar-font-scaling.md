# Bug: Calendar Day Row Clips on Large Font Sizes

**Status:** Fixed — verified on iOS at default and max accessibility font sizes
**Severity:** Medium (usability / accessibility)
**File:** `frontend/app/screens/customer/home/components/customCalendar.tsx`
**Screenshot:** [image000000.PNG](image000000.PNG)

---

## Problem

When a device's system font size is increased (iOS Dynamic Type / Android font_scale), the 7-day row in the home screen calendar overflows to the right. Friday is partially clipped and Saturday is completely off-screen.

**Root cause — three compounding issues:**

1. **`minWidth: 48`** on `dayContainer` (line 235) — 7 × 48 = 336px minimum, plus padding, easily exceeds screen width when text is scaled up
2. **No `maxFontSizeMultiplier`** on any `<Text>` — font sizes 11 and 18 get multiplied by the full system scale factor (up to ~3.5x on iOS)
3. **3-letter day names** (`'ddd'` → "TUE", "WED") take more horizontal space than needed

---

## Implementation Plan

All changes are in **one file**: `frontend/app/screens/customer/home/components/customCalendar.tsx`

### Change 1: Flexible day containers (line 231–238)

Replace `minWidth: 48` with `flex: 1` so each day gets exactly 1/7 of the row.

```diff
 // line 231–238
 dayContainer: {
   alignItems: 'center',
   paddingVertical: 10,
-  paddingHorizontal: 8,
-  minWidth: 48,
+  paddingHorizontal: 4,
+  flex: 1,
   borderRadius: 10,
   backgroundColor: 'transparent',
 },
```

Also reduce `paddingHorizontal` from 8 → 4 since `flex: 1` already spaces them and extra padding wastes room.

### Change 2: Cap font scaling with `maxFontSizeMultiplier={1.2}` (lines 158–171)

Add `maxFontSizeMultiplier={1.2}` to the four `<Text>` elements that can overflow. Value of 1.2 is the community-recommended floor for compact UI — still gives low-vision users a 20% size boost without breaking layout.

**Day name text (line 158–164):**
```diff
-              <Text style={[
+              <Text maxFontSizeMultiplier={1.2} style={[
                 styles.dayName,
                 isSelected && styles.selectedDayName,
                 isDisabled && styles.disabledText,
               ]}>
```

**Day number text (line 165–171):**
```diff
-              <Text style={[
+              <Text maxFontSizeMultiplier={1.2} style={[
                 styles.dayNumber,
                 isSelected && styles.selectedDayNumber,
                 isDisabled && styles.disabledText,
               ]}>
```

**Month/year header text (line 119):**
```diff
-         <Text style={styles.monthYearText}>{monthYearText}</Text>
+         <Text maxFontSizeMultiplier={1.2} style={styles.monthYearText}>{monthYearText}</Text>
```

**"Today" button text (line 125):**
```diff
-             <Text style={styles.todayButtonText}>Today</Text>
+             <Text maxFontSizeMultiplier={1.2} style={styles.todayButtonText}>Today</Text>
```

**Nav arrow text (lines 115, 133):**
```diff
-         <Text style={styles.navButtonText}>{'<'}</Text>
+         <Text maxFontSizeMultiplier={1.2} style={styles.navButtonText}>{'<'}</Text>
```
(same for the `>` arrow on line 133)

### Change 3: Shorten day names from 3-letter to 2-letter (line 144)

Moment `'dd'` format gives `Su Mo Tu We Th Fr Sa` — same pattern used by Apple Calendar and Google Calendar.

```diff
 // line 144
-           const dayName = date.format('ddd').toUpperCase();
+           const dayName = date.format('dd').toUpperCase();
```

Output changes: `SUN MON TUE WED THU FRI SAT` → `SU MO TU WE TH FR SA`

---

## Summary of All Edits

| Line(s) | What | Before | After |
|---------|------|--------|-------|
| 144 | Day name format | `date.format('ddd').toUpperCase()` | `date.format('dd').toUpperCase()` |
| 115 | Nav `<` text | `<Text style={...}>` | `<Text maxFontSizeMultiplier={1.2} style={...}>` |
| 119 | Month/year text | `<Text style={...}>` | `<Text maxFontSizeMultiplier={1.2} style={...}>` |
| 125 | "Today" button text | `<Text style={...}>` | `<Text maxFontSizeMultiplier={1.2} style={...}>` |
| 133 | Nav `>` text | `<Text style={...}>` | `<Text maxFontSizeMultiplier={1.2} style={...}>` |
| 158 | Day name text | `<Text style={...}>` | `<Text maxFontSizeMultiplier={1.2} style={...}>` |
| 165 | Day number text | `<Text style={...}>` | `<Text maxFontSizeMultiplier={1.2} style={...}>` |
| 234–235 | dayContainer style | `paddingHorizontal: 8, minWidth: 48` | `paddingHorizontal: 4, flex: 1` |

---

## Verification Plan

### Prerequisites
- iOS simulator booted (e.g., iPhone 16)
- Android emulator booted
- App built and running on both

### iOS — Change Font Size via Settings

Maestro can navigate the Settings app to adjust Dynamic Type:

```yaml
# Set iOS to largest accessibility font size
appId: com.apple.Preferences
---
- launchApp:
    appId: com.apple.Preferences
- tapOn: "Accessibility"
- tapOn: "Display & Text Size"
- tapOn: "Larger Text"
# Enable "Larger Accessibility Sizes" toggle if not already on
# Then drag the slider to the right for maximum size
- tapOn: "Larger Accessibility Sizes"
```

After changing the setting, relaunch the Taist app and navigate to the home screen.

Alternatively, use the Xcode environment override: **Debug → Environment Overrides → Text** and drag the Dynamic Type slider.

### Android — Change Font Size via ADB

```bash
# Set to largest standard font scale (1.3x)
adb shell settings put system font_scale 1.30

# Set to extra-large (beyond UI slider, 2x)
adb shell settings put system font_scale 2.0

# Reset to default
adb shell settings put system font_scale 1.0
```

### Test Matrix

| # | Platform | Font Scale | Check |
|---|----------|-----------|-------|
| 1 | iOS | Default | All 7 days visible, layout looks normal, day names show 2-letter abbreviations |
| 2 | iOS | Largest (non-accessibility) | All 7 days visible, no clipping, text readable |
| 3 | iOS | Largest Accessibility Size | All 7 days visible, text capped at 1.2x, no overflow |
| 4 | Android | 1.0 (default) | All 7 days visible, layout looks normal |
| 5 | Android | 1.30 (largest standard) | All 7 days visible, no clipping |
| 6 | Android | 2.0 (extreme) | All 7 days visible, text capped at 1.2x, no overflow |

### What to Verify at Each Size

1. **All 7 days visible** — SU through SA, none clipped or off-screen
2. **Day tappable** — tap Saturday, confirm it highlights with the orange border
3. **Month/year header** — not truncated, especially for long months like "September / October 2026"
4. **"Today" button** — visible and tappable
5. **Week navigation** — `<` and `>` arrows still visible and functional
6. **Swipe gesture** — swipe left/right to change weeks still works
7. **Selected state** — selected day shows orange border and text

### Maestro Smoke Test Flow (post-fix)

```yaml
appId: org.taist.taist
---
# Verify all 7 days are visible on the home screen calendar
- assertVisible: "SU"
- assertVisible: "MO"
- assertVisible: "TU"
- assertVisible: "WE"
- assertVisible: "TH"
- assertVisible: "FR"
- assertVisible: "SA"

# Tap Saturday to confirm it's interactive
- tapOn: "SA"

# Verify week navigation arrows work
- tapOn: ">"
- tapOn: "<"
```

---

## References

- [Font-Scaling in React Native Apps (Medium)](https://medium.com/@runawaytrike/font-scaling-in-react-native-apps-8d38a48fdf26) — `maxFontSizeMultiplier` guidance: 1.2 for compact UI, 1.5 standard, 2.0 body
- [Accessibility Font Sizes — Ignite Cookbook](https://ignitecookbook.com/docs/recipes/AccessibilityFontSizes/) — flexible layout + capped scaling pattern
- [Accessible Styling for Larger Text — Aviron Software](https://www.avironsoftware.com/blog/building-more-accessible-react-native-applications-conscious-styling-for-larger-text) — design flexible first, cap second
- [wix/react-native-calendars #831](https://github.com/wix/react-native-calendars/issues/831) — cautionary tale of using `allowFontScaling={false}` globally
- [ADB Accessibility Commands (GitHub Gist)](https://gist.github.com/mrk-han/67a98616e43f86f8482c5ee6dd3faabe) — `font_scale` values for Android testing
- [React Native Text docs](https://reactnative.dev/docs/text) — `maxFontSizeMultiplier` prop reference
