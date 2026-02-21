# Maestro testID Audit

Comprehensive audit of missing `testID` props across the Taist app. Adding these makes Maestro flows reliable and device-size-independent.

**Convention:** `{screen}.{element}` or `{screen}.{element}.{index}` — see `docs/maestro-conventions.md`

**Current state:** All 4 phases complete. ~120 testIDs added across 23 screens + 8 wizard steps.

---

## Phase 1 — Auth Flows (HIGH priority)

### login/index.tsx ✅ DONE
| Element | testID | Status |
|---------|--------|--------|
| Email input | `login.emailInput` | ✅ |
| Password input | `login.passwordInput` | ✅ |
| Password visibility toggle | `login.togglePassword` | ✅ |
| Log In button | `login.submitButton` | ✅ |
| Forgot Password link | `login.forgotButton` | ✅ |
| Sign Up link | `login.signupButton` | ✅ |

### signup/index.tsx ✅ DONE
| Element | testID | Status |
|---------|--------|--------|
| "I am a customer" button | `signup.customerButton` | ✅ |
| "I want to be a chef" button | `signup.chefButton` | ✅ |
| Email input | `signup.emailInput` | ✅ |
| Password input | `signup.passwordInput` | ✅ |
| Password visibility toggle | `signup.togglePassword` | ✅ |
| Continue button | `signup.continueButton` | ✅ |
| Back button | `signup.backButton` | N/A — back is in sub-step components |
| Login link | `signup.loginLink` | ✅ |

### forgot/index.tsx ✅ DONE
| Element | testID | Status |
|---------|--------|--------|
| Email input | `forgotPassword.emailInput` | ✅ |
| Reset code input | `forgotPassword.codeInput` | ✅ |
| New password input | `forgotPassword.passwordInput` | ✅ |
| Confirm password input | `forgotPassword.confirmPasswordInput` | ✅ |
| Submit button | `forgotPassword.submitButton` | ✅ |
| Back/Login link | `forgotPassword.backButton` | ✅ |

---

## Phase 2 — Customer Core Flows (HIGH priority)

### customer/home/index.tsx ✅ DONE
| Element | testID | Status |
|---------|--------|--------|
| Location/ZIP button | `customerHome.locationButton` | ✅ |
| Calendar date buttons | `customerHome.dateButton.{dayIndex}` | Skipped — inside CustomCalendar |
| Time slot buttons | `customerHome.timeSlot.{id}` | ✅ |
| Category filter buttons | `customerHome.categoryFilter.{id}` | ✅ |
| Chef cards | `customerHome.chefCard.{index}` | ✅ |

### customer/home/components/chefCard.tsx ✅ DONE
| Element | testID | Status |
|---------|--------|--------|
| Card touchable (main) | `customerHome.chefCard.{index}` | ✅ (from parent) |
| Menu toggle button | `{testID}.toggleMenu` | ✅ (derived) |

### customer/chefDetail/index.tsx ✅ DONE
| Element | testID | Status |
|---------|--------|--------|
| Menu items | `chefDetail.menuItem.{index}` | ✅ |
| Reviews section | `chefDetail.reviewsSection` | ✅ |
| Checkout button | `chefDetail.checkoutButton` | ✅ (bonus) |
| Clear cart button | `chefDetail.clearCartButton` | ✅ (bonus) |
| Availability times | `chefDetail.availabilityTime.{index}` | Skipped — inside AvailabilitySection |

### customer/addToOrder/index.tsx ✅ DONE
| Element | testID | Status |
|---------|--------|--------|
| Quantity minus | `addToOrder.quantityMinus` | ✅ |
| Quantity value | `addToOrder.quantityValue` | ✅ |
| Quantity plus | `addToOrder.quantityPlus` | ✅ |
| Add to cart button | `addToOrder.addCartButton` | ✅ |

### customer/cart/index.tsx ✅ DONE
| Element | testID | Status |
|---------|--------|--------|
| Cart items | `cart.cartItem.{index}` | ✅ |
| Clear button per chef | `cart.clearButton.{chefId}` | ✅ |
| Checkout button | `cart.checkoutButton` | ✅ |
| Empty state | `cart.emptyState` | ✅ |

### customer/checkout/index.tsx ✅ DONE
| Element | testID | Status |
|---------|--------|--------|
| Payment method selector | `checkout.paymentMethodSelector` | ✅ |
| Appliance switch | `checkout.applianceSwitch` | ✅ |
| Place order button | `checkout.placeOrderButton` | ✅ |
| Date/Time selectors | N/A | Dynamic pills, targetable by text |
| Discount code | N/A | Inside DiscountCodeInput component |

### customer/orders/index.tsx ✅ DONE
| Element | testID | Status |
|---------|--------|--------|
| Status tab buttons | `customerOrders.statusTab.{index}` | ✅ |
| Order cards | `customerOrders.orderCard.{index}` | ✅ |
| Date calendar | `customerOrders.calendar` | N/A — no calendar on this screen |

### customer/orderDetail/index.tsx ✅ DONE
| Element | testID | Status |
|---------|--------|--------|
| Chat button | `customerOrderDetail.chatButton` | ✅ |
| Call button | `customerOrderDetail.callButton` | ✅ |
| Cancel order button | `customerOrderDetail.cancelButton` | ✅ |
| Review text input | `customerOrderDetail.reviewInput` | ✅ |
| Submit review button | `customerOrderDetail.submitReviewButton` | ✅ |
| Rating input | N/A | StarRating widget, targetable by text |
| Tip buttons | N/A | Targetable by text (15%, 18%, etc.) |

---

## Phase 3 — Chef Core Flows (HIGH priority)

### chef/home/index.tsx ✅ DONE
| Element | testID | Status |
|---------|--------|--------|
| Tab buttons (REQUESTED/ACCEPTED) | `chefHome.tab.{idx}` | ✅ |
| Order cards | `chefHome.orderCard.{idx}` | ✅ |

### chef/home/components/chefOrderCard.tsx ✅ DONE
| Element | testID | Status |
|---------|--------|--------|
| Card touchable (main) | `chefHome.orderCard.{idx}` | ✅ (from parent) |

### chef/orders/index.tsx ✅ DONE
| Element | testID | Status |
|---------|--------|--------|
| Date calendar | N/A | Inside CustomCalendar component |
| Status tab buttons | `chefOrders.statusTab.{idx}` | ✅ (custom tab function) |
| Order cards | `chefOrders.orderCard.{idx}` | ✅ |

### chef/orders/components/chefOrderCard.tsx ✅ DONE
| Element | testID | Status |
|---------|--------|--------|
| Card touchable (main) | `chefOrders.orderCard.{idx}` | ✅ (from parent) |

### chef/orderDetail/index.tsx ✅ DONE
| Element | testID | Status |
|---------|--------|--------|
| Accept button | `chefOrderDetail.acceptButton` | ✅ |
| Reject button | `chefOrderDetail.rejectButton` | ✅ |
| On My Way button | `chefOrderDetail.onMyWayButton` | ✅ |
| Order Completed button | `chefOrderDetail.completedButton` | ✅ |
| Cancel button | `chefOrderDetail.cancelButton` | ✅ |
| Call button | `chefOrderDetail.callButton` | ✅ |
| Chat button | `chefOrderDetail.chatButton` | ✅ |
| Map button | `chefOrderDetail.mapButton` | ✅ |

### chef/menu/index.tsx ✅ DONE
| Element | testID | Status |
|---------|--------|--------|
| Tab buttons (AVAILABLE/NOT) | `chefMenu.tab.{idx}` | ✅ |
| Menu item cards | `chefMenu.menuItem.{idx}` | ✅ |
| Edit button per item | N/A | Tap on card opens edit (no separate button) |
| Add new item button | `chefMenu.addButton` | ✅ |

### chef/addMenuItem/ (wizard steps) ✅ DONE
All 8 wizard steps have testIDs. Common across all steps: `menuWizard.continueButton`, `menuWizard.backButton`

**StepMenuItemName:**
| Element | testID | Status |
|---------|--------|--------|
| Name input | `menuWizard.nameInput` | ✅ |
| Continue button | `menuWizard.continueButton` | ✅ |
| Back button | `menuWizard.backButton` | ✅ |

**StepMenuItemDescription:**
| Element | testID | Status |
|---------|--------|--------|
| Description input | `menuWizard.descriptionInput` | ✅ |
| Continue button | `menuWizard.continueButton` | ✅ |
| Back button | `menuWizard.backButton` | ✅ |

**StepMenuItemCategories:**
| Element | testID | Status |
|---------|--------|--------|
| Category buttons | `menuWizard.category.{idx}` | ✅ |
| New category switch | `menuWizard.newCategorySwitch` | ✅ |
| New category input | `menuWizard.newCategoryInput` | ✅ |
| Continue button | `menuWizard.continueButton` | ✅ |
| Back button | `menuWizard.backButton` | ✅ |

**StepMenuItemAllergens:**
| Element | testID | Status |
|---------|--------|--------|
| Allergen toggles | `menuWizard.allergen.{idx}` | ✅ |
| Continue button | `menuWizard.continueButton` | ✅ |
| Back button | `menuWizard.backButton` | ✅ |

**StepMenuItemKitchen:**
| Element | testID | Status |
|---------|--------|--------|
| Appliance buttons | `menuWizard.appliance.{idx}` | ✅ |
| Completion time buttons | `menuWizard.completionTime.{idx}` | ✅ |
| Continue button | `menuWizard.continueButton` | ✅ |
| Back button | `menuWizard.backButton` | ✅ |

**StepMenuItemPricing:**
| Element | testID | Status |
|---------|--------|--------|
| Serving slider | `menuWizard.servingSlider` | ✅ |
| Price input | `menuWizard.priceInput` | ✅ |
| Continue button | `menuWizard.continueButton` | ✅ |
| Back button | `menuWizard.backButton` | ✅ |

**StepMenuItemCustomizations:**
| Element | testID | Status |
|---------|--------|--------|
| Add add-on button | `menuWizard.addCustomizationButton` | ✅ |
| Continue/Skip button | `menuWizard.continueButton` | ✅ |
| Back button | `menuWizard.backButton` | ✅ |

**StepMenuItemReview:**
| Element | testID | Status |
|---------|--------|--------|
| Display on menu switch | `menuWizard.displaySwitch` | ✅ |
| Save button | `menuWizard.saveButton` | ✅ |
| Back to Edit button | `menuWizard.backButton` | ✅ |

### chef/profile/index.tsx ✅ DONE
| Element | testID | Status |
|---------|--------|--------|
| Bio input | `chefProfile.bioInput` | ✅ |
| Day toggles | `chefProfile.dayToggle.{dayId}` | ✅ (0=Sun..6=Sat) |
| Start time pickers | `chefProfile.startTime.{dayId}` | ✅ |
| End time pickers | `chefProfile.endTime.{dayId}` | ✅ |
| Save button | `chefProfile.saveButton` | ✅ |

### chef/earnings/index.tsx ✅ DONE (N/A)
| Element | testID | Status |
|---------|--------|--------|
| N/A | N/A | Display-only screen, no interactive elements needing testIDs |

---

## Phase 4 — Secondary Flows (MEDIUM priority)

### account/index.tsx ✅ DONE
| Element | testID | Status |
|---------|--------|--------|
| First name input | `account.firstNameInput` | ✅ |
| Last name input | `account.lastNameInput` | ✅ |
| Email input | N/A | Not on this screen (set during signup) |
| Phone input | `account.phoneInput` | ✅ |
| Birthday picker | `account.birthdayPicker` | ✅ |
| State dropdown | N/A | Third-party SelectList component |
| Address input | `account.addressInput` | ✅ |
| City input | `account.cityInput` | ✅ |
| ZIP input | `account.zipInput` | ✅ |
| Get location button | `account.getLocationButton` | ✅ |
| Push notifications toggle | `account.pushNotificationsToggle` | ✅ |
| Location services toggle | `account.locationServicesToggle` | ✅ |
| Save button | `account.saveButton` | ✅ |

### inbox/index.tsx ✅ DONE
| Element | testID | Status |
|---------|--------|--------|
| Conversation cards | `chatInbox.conversationCard.{idx}` | ✅ |

### inbox/components/inboxRecord.tsx ✅ DONE
| Element | testID | Status |
|---------|--------|--------|
| Card touchable (main) | `chatInbox.conversationCard.{idx}` | ✅ (from parent) |

### chat/index.tsx ✅ DONE
| Element | testID | Status |
|---------|--------|--------|
| Message input | `chatDetail.messageInput` | ✅ |
| Send button | `chatDetail.sendButton` | ✅ |

### reportIssue/index.tsx ✅ DONE
| Element | testID | Status |
|---------|--------|--------|
| Subject input | `reportIssue.subjectInput` | ✅ (already existed) |
| Description input | `reportIssue.descriptionInput` | ✅ (already existed) |
| Photo picker button | `reportIssue.photoPickerButton` | ✅ |
| Remove screenshot button | `reportIssue.removeScreenshotButton` | ✅ |
| Submit button | `reportIssue.submitButton` | ✅ (already existed) |

---

## Shared Components to Update

| Component | Issue | Fix |
|-----------|-------|-----|
| **StyledTextInput** | Now passes `testID` to outer Pressable | Done |
| **StyledButton** | Already passes via `...props` spread | Done |
| **StyledSwitch** | Already has explicit `testID` prop | Done |
| **StyledTabButton** | Already passes via `...props` spread | Done |
| **EmptyListView** | Added `testID` prop | Done |
| **ChefOrderCard** (home) | Added `testID` prop | Done |
| **ChefOrderCard** (orders) | Added `testID` prop | Done |
| **OrderCard** (customer) | Added `testID` prop | Done |
| **ChefMenuItem** | Added `testID` prop | Done |
| **InboxRecord** | Added `testID` prop | Done |

---

## Summary

| Phase | Screens | Elements | Priority |
|-------|---------|----------|----------|
| 1 — Auth | 3 | ~20 | HIGH |
| 2 — Customer | 8 | ~45 | HIGH |
| 3 — Chef | 7 | ~35 | HIGH |
| 4 — Secondary | 5 | ~20 | MEDIUM |
| **Total** | **23** | **~120** | |

**Quick win:** Phase 1 (auth) unblocks every E2E flow since login is always the first step.
