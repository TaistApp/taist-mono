# Notification System Refactor Plan

## Problem Statement

Current notification system uses database-stored templates (`tbl_notification_templates`) which creates several issues:
- **Lost Data**: Templates were lost during database migration, breaking chef activation
- **No Version Control**: Template changes not tracked in git
- **Tight Coupling**: Application depends on database state for core functionality
- **Deployment Complexity**: Requires manual database updates alongside code
- **Testing Difficulty**: Tests need database setup with correct template data

## Current Implementation Analysis

### Database Template Usage
Found 8 references to notification templates in codebase:

| Location | Template ID | Purpose |
|----------|-------------|---------|
| AdminapiController.php:93 | 1 | Chef approved/activated |
| MapiController.php:2293 | 6 | Unknown |
| MapiController.php:3414 | 6 | Unknown |
| MapiController.php:3433 | 10 | Unknown |
| MapiController.php:3462 | 15 | Unknown |
| MapiController.php:3512 | 4 | Unknown |
| MapiController.php:3531 | 20 | Unknown |
| MapiController.php:3560 | 14 | Unknown |

### Current Database Schema
```sql
CREATE TABLE `tbl_notification_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_name` varchar(100) NOT NULL,
  `subject` varchar(200) DEFAULT NULL,
  `email` text,
  `push` varchar(200) DEFAULT NULL,
  `text` varchar(200) DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '0',
  `created_at` varchar(50) DEFAULT NULL,
  `updated_at` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
)
```

### Current Notification Flow
```php
// Current pattern (AdminapiController.php:93-108)
$notification = app(NotificationTemplates::class)->where(['id'=>1])->first();
if ($notification) {
    $this->notification($fcm_token, $notification->subject, $notification->push, $role);
    Notification::create([
        'title' => $notification->template_name,
        'body' => $notification->push,
        // ... other fields
    ]);
}
```

## Proposed Solution: Laravel Notification Classes

### Phase 1: Identify All Notification Types (Research)
**Goal**: Document what each template ID is used for

**Tasks**:
1. Read code around each template usage to understand context
2. Document notification triggers and recipients
3. Create mapping of template IDs to business events
4. Identify if email/SMS/push are used for each type

**Deliverable**: Complete notification inventory table

### Phase 2: Create Laravel Notification Classes
**Goal**: Replace database templates with code-based notifications

**Tasks**:
1. Create notification classes in `app/Notifications/`:
   ```
   app/Notifications/
   ├── ChefApprovedNotification.php
   ├── OrderAcceptedNotification.php
   ├── OrderCancelledNotification.php
   └── ... (one per notification type)
   ```

2. Each notification class structure:
   ```php
   <?php
   namespace App\Notifications;

   use Illuminate\Notifications\Notification;
   use Illuminate\Notifications\Messages\MailMessage;

   class ChefApprovedNotification extends Notification
   {
       public function via($notifiable)
       {
           return ['database', 'firebase']; // Channels to use
       }

       public function toDatabase($notifiable)
       {
           return [
               'title' => 'Welcome to Taist!',
               'body' => 'Your chef account has been activated!',
               'role' => 'chef',
           ];
       }

       public function toFirebase($notifiable)
       {
           return [
               'title' => 'Welcome to Taist!',
               'body' => 'Your chef account has been activated!',
           ];
       }
   }
   ```

3. Create custom Firebase notification channel:
   ```php
   // app/Notifications/Channels/FirebaseChannel.php
   class FirebaseChannel
   {
       public function send($notifiable, Notification $notification)
       {
           $message = $notification->toFirebase($notifiable);
           // Use existing Firebase logic from notification() method
       }
   }
   ```

### Phase 3: Update Controllers
**Goal**: Replace database template queries with notification dispatches

**Before**:
```php
$notification = app(NotificationTemplates::class)->where(['id'=>1])->first();
if ($notification) {
    $this->notification($fcm_token, $notification->subject, $notification->push, 'chef');
    Notification::create([...]);
}
```

**After**:
```php
$approved_user->notify(new ChefApprovedNotification());
```

**Files to Update**:
- `app/Http/Controllers/AdminapiController.php` (1 location)
- `app/Http/Controllers/MapiController.php` (7 locations)

### Phase 4: Update User Model
**Goal**: Make User model notifiable

**Tasks**:
1. Add `Notifiable` trait to User model if not present
2. Add method to get FCM token for notifications:
   ```php
   public function routeNotificationForFirebase()
   {
       return $this->fcm_token;
   }
   ```

### Phase 5: Database Cleanup (After Testing)
**Goal**: Remove deprecated notification template table

**Tasks**:
1. Create migration to drop `tbl_notification_templates`
2. Remove `NotificationTemplates` model
3. Remove any admin panel UI for managing templates (if exists)

### Phase 6: Update `notifications` Table (Optional Enhancement)
**Goal**: Modernize notifications storage table

**Current**: Custom fields with timestamps as strings
**Proposed**: Standard Laravel notifications table structure

```php
Schema::create('notifications', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->string('type'); // Notification class name
    $table->morphs('notifiable'); // user_id + user_type
    $table->text('data'); // JSON payload
    $table->timestamp('read_at')->nullable();
    $table->timestamps();
});
```

**Note**: This is optional - current table can work with new system

## Benefits of New System

### For Development
- ✅ **Version Control**: All notification content tracked in git
- ✅ **Type Safety**: IDE autocomplete and type checking
- ✅ **Testable**: Easy to unit test notifications
- ✅ **Standard Practice**: Uses Laravel conventions
- ✅ **No Database Dependency**: App works without template data

### For Deployment
- ✅ **Atomic Deploys**: Code and notifications deploy together
- ✅ **Easy Rollback**: Git revert includes notification changes
- ✅ **Environment Parity**: Dev/staging/prod automatically in sync
- ✅ **No Manual Setup**: No database seeding required

### For Maintenance
- ✅ **Searchable**: Find notification usage with IDE search
- ✅ **Refactorable**: Safe to rename/modify with refactoring tools
- ✅ **Documented**: Code comments explain notification context
- ✅ **Reviewable**: PR reviews include notification changes

## Migration Strategy

### Option A: Big Bang (Recommended)
Replace all notifications at once
- **Pros**: Clean cutover, no dual system maintenance
- **Cons**: Larger PR, more testing required
- **Timeline**: 1 day for implementation + 1 day for testing

### Option B: Gradual Migration
Replace one notification type at a time
- **Pros**: Lower risk, smaller PRs
- **Cons**: Maintains both systems temporarily, more complex
- **Timeline**: 1-2 weeks (spread across multiple PRs)

### Recommended: Option A (Big Bang)
Since there are only ~8 notification types and the current system is already broken (missing templates), a complete replacement is cleaner and faster.

## Rollback Plan

If issues arise after deployment:
1. **Immediate**: Revert git commit (notifications back to database lookup)
2. **Short-term**: Fix bugs in new notification classes
3. **Long-term**: If fundamental issues, create seeder for old system

## Testing Strategy

### Unit Tests
```php
// tests/Unit/Notifications/ChefApprovedNotificationTest.php
public function test_chef_approved_notification_has_correct_content()
{
    $notification = new ChefApprovedNotification();
    $data = $notification->toDatabase($user);

    $this->assertEquals('Welcome to Taist!', $data['title']);
    $this->assertEquals('chef', $data['role']);
}
```

### Feature Tests
```php
// tests/Feature/Admin/ChefActivationTest.php
public function test_activating_chef_sends_notification()
{
    Notification::fake();

    $response = $this->post('/adminapi/change_chef_status', [
        'ids' => $chef->id,
        'status' => 1,
    ]);

    Notification::assertSentTo($chef, ChefApprovedNotification::class);
}
```

### Manual Testing Checklist
- [ ] Chef activation sends push notification
- [ ] Notification appears in app
- [ ] Notification stored in database
- [ ] Works when FCM token is missing (graceful degradation)
- [ ] Works across all 8 notification types

## Risk Assessment

### High Risk
- **Breaking existing notifications**: Mitigated by comprehensive testing
- **Lost notification types**: Mitigated by Phase 1 documentation

### Medium Risk
- **FCM integration issues**: Current `notification()` method needs testing
- **Performance changes**: Database queries replaced with code execution (likely faster)

### Low Risk
- **Deployment issues**: Standard code deploy, no database migrations required
- **Rollback complexity**: Single git revert restores old system

## Implementation Order

1. **Phase 1**: Research & document all notification types (2-3 hours)
2. **Phase 2**: Create Laravel notification classes (2-3 hours)
3. **Phase 3**: Update controllers to use new notifications (1-2 hours)
4. **Phase 4**: Update User model (30 minutes)
5. **Testing**: Unit + feature + manual testing (2-3 hours)
6. **Deploy to staging**: Test in real environment (1 hour)
7. **Deploy to production**: Monitor for issues (ongoing)
8. **Phase 5**: Cleanup old system after 1 week of stability (1 hour)

**Total Estimated Time**: 1-2 days of focused development

## Open Questions

1. **Email notifications**: Does the app send emails? (see `email` field in template table)
2. **SMS notifications**: Does the app send SMS? (see `text` field in template table)
3. **Admin editing**: Do non-technical admins need to edit notification copy?
   - If YES: Consider keeping database templates OR build admin UI for config files
   - If NO: Proceed with code-based notifications

4. **Production template data**: Can we export current notification templates from production database before migration?
   - This would help preserve exact wording in new notification classes

## Success Criteria

- ✅ All 7 notification types documented and mapped
- ✅ All notification infrastructure created (classes, channel)
- ✅ No database dependency for notifications to work
- ✅ All notification content tracked in git
- ✅ 100% test coverage for notification classes (12 tests, 45 assertions - ALL PASSING)
- ⏳ Controllers updated to use new system (PENDING - infrastructure only)
- ⏳ No errors in production for 1 week after deployment (PENDING - not yet deployed)

## Implementation Status

### ✅ COMPLETED - Infrastructure Phase

**Phase 1: Documentation** ✅
- Created comprehensive notification inventory ([NOTIFICATION_TYPES_INVENTORY.md](NOTIFICATION_TYPES_INVENTORY.md))
- Mapped all 7 notification types to business events
- Documented triggers, recipients, and channels

**Phase 2: Laravel Notification Classes** ✅
- Created 7 notification classes in `backend/app/Notifications/`:
  - `ChefApprovedNotification.php`
  - `NewOrderNotification.php`
  - `OrderAcceptedNotification.php`
  - `OrderReadyNotification.php`
  - `OrderCompletedNotification.php`
  - `OrderRejectedNotification.php`
  - `ChefOnTheWayNotification.php`

**Phase 3: Firebase Channel** ✅
- Created custom `FirebaseChannel` in `backend/app/Notifications/Channels/`
- Integrates with existing Firebase Cloud Messaging
- Graceful error handling for missing tokens and Firebase exceptions

**Phase 4: Listener Model Update** ✅
- Added `routeNotificationForFirebase()` method to `backend/app/Listener.php`
- Already has `Notifiable` trait (existing)

**Phase 5: Unit Tests** ✅
- Created comprehensive test suite in `backend/tests/Unit/Notifications/`
- **12 tests, 45 assertions - ALL PASSING** ✅
- Tests cover notification structure, channels, and error handling

**Phase 6: Documentation** ✅
- Created [NOTIFICATION_IMPLEMENTATION_GUIDE.md](NOTIFICATION_IMPLEMENTATION_GUIDE.md)
- Detailed activation instructions for controllers
- Testing checklist and rollback plan

### ⏳ PENDING - Activation Phase

**Next Step: Update Controllers** (NOT YET DONE - infrastructure only)
- `AdminapiController.php` - 1 location to update
- `MapiController.php` - 7 locations to update

**Testing in Staging** (PENDING)
- Manual testing of all notification types
- Verify push notifications work
- Verify database storage works

**Production Deployment** (PENDING)
- Deploy and monitor for 1 week
- Verify no errors in production

**Cleanup** (PENDING - after 1 week of stability)
- Drop `tbl_notification_templates` table
- Remove `NotificationTemplates` model
- Remove old `notification()` methods

## Next Steps

1. ✅ **Infrastructure Complete** - All notification classes and tests created
2. 📋 **Review Implementation Guide** - See [NOTIFICATION_IMPLEMENTATION_GUIDE.md](NOTIFICATION_IMPLEMENTATION_GUIDE.md)
3. 🚀 **When Ready to Activate**: Update controllers following the implementation guide
4. 🧪 **Test in Staging**: Deploy and test all notification types
5. 🎯 **Deploy to Production**: Monitor for issues
6. 🧹 **Cleanup**: Remove old template system after 1 week
