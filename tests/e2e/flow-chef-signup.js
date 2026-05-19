/**
 * Flow 2: Chef Signup + Onboarding
 *
 * Tests the full chef onboarding journey:
 *  1. Register a new chef via email/password
 *  2. Login with those credentials
 *  3. Complete the safety quiz
 *  4. Create a menu item (so the chef is orderable)
 *  5. Set weekly availability
 *  6. Background check verification (SafeScreener bypass — DB flags only)
 *  7. Stripe Connect setup (Custom account via E2E helper)
 *  8. Duplicate registration guard
 */

const { ApiClient } = require('./api');
const config = require('./config');
const h = require('./helpers');

async function run() {
  h.logHeader('FLOW 2: Chef Signup');
  const results = { passed: 0, failed: 0, errors: [] };

  const chefData = h.testChef();
  let apiToken = null;
  let userId = null;
  let menuId = null;

  // ── 1. Register chef ───────────────────────────────────────────
  try {
    h.logInfo(`Registering chef: ${chefData.email}`);
    const api = new ApiClient();

    // Chefs require a photo — we'll send minimal data.
    // The backend accepts the photo as a file upload (multipart),
    // but also works with JSON if photo is not strictly enforced
    // on the staging environment. We'll try JSON first.
    const res = await api.post('register', chefData);

    if (res.body.success === 0 && res.body.error && res.body.error.includes('photo')) {
      // Photo is required — we need multipart. Create a tiny valid PNG.
      h.logInfo('Photo required — retrying with multipart upload...');
      const resMulti = await api.post('register', {
        ...chefData,
        photo: createMinimalPngBlob(),
      }, { multipart: true });
      h.assertSuccess(resMulti, 'Chef register (multipart)');
      h.assertHasFields(resMulti.body.data, ['api_token'], 'Chef register');
      apiToken = resMulti.body.data.api_token;
    } else {
      h.assertSuccess(res, 'Chef register');
      h.assertHasFields(res.body.data, ['api_token'], 'Chef register');
      apiToken = res.body.data.api_token;
    }

    h.logPass(`Chef registered — token: ${apiToken.slice(0, 12)}...`);
    results.passed++;
  } catch (e) {
    h.logFail(`Chef register: ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
    return results;
  }

  // ── 2. Login ───────────────────────────────────────────────────
  try {
    h.logInfo(`Logging in as chef: ${chefData.email}`);
    const api = new ApiClient();
    const res = await api.post('login', {
      email: chefData.email,
      password: chefData.password,
    });

    h.assertSuccess(res, 'Chef login');
    h.assertHasFields(res.body.data, ['api_token', 'user'], 'Chef login');
    h.assert(res.body.data.user.user_type === 2, 'User type should be 2 (chef)');

    userId = res.body.data.user.id;
    apiToken = res.body.data.api_token;

    h.logPass(`Chef login successful — user ID: ${userId}`);
    results.passed++;
  } catch (e) {
    h.logFail(`Chef login: ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
    return results;
  }

  // ── 3. Complete safety quiz ────────────────────────────────────
  try {
    h.logInfo('Completing safety quiz...');
    const api = new ApiClient(apiToken);
    const res = await api.post('complete_chef_quiz', { user_id: userId });

    h.assertSuccess(res, 'Complete chef quiz');
    h.logPass('Safety quiz completed');
    results.passed++;
  } catch (e) {
    h.logFail(`Safety quiz: ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
  }

  // ── 4. Create a menu item ──────────────────────────────────────
  try {
    h.logInfo('Creating test menu item...');
    const api = new ApiClient(apiToken);
    const res = await api.post('create_menu', {
      title: 'E2E Test Jollof Rice',
      description: 'Automated test menu item — spicy jollof rice with grilled chicken',
      price: 25.00,
      serving_size: 2,
      meals: 'Lunch,Dinner',
      category_ids: '1',
      allergens: '',
      appliances: 'Stove',
      estimated_time: 60,
      is_live: 1,
      customizations: JSON.stringify([
        { name: 'Extra Chicken', upcharge_price: 5.00 },
        { name: 'Plantains', upcharge_price: 3.00 },
      ]),
    });

    h.assertSuccess(res, 'Create menu');
    h.assertHasFields(res.body.data, ['id', 'title', 'price'], 'Create menu');
    menuId = res.body.data.id;

    h.logPass(`Menu item created — ID: ${menuId}, title: "${res.body.data.title}"`);
    results.passed++;
  } catch (e) {
    h.logFail(`Create menu: ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
  }

  // ── 5. Set weekly availability ─────────────────────────────────
  try {
    h.logInfo('Setting weekly availability (all days, 10am–8pm)...');
    const api = new ApiClient(apiToken);

    // Use unix timestamps for start/end (the DB stores them this way).
    // The values represent time-of-day offsets — we'll use HH:mm format
    // since the availability override system uses time strings,
    // but the weekly availability uses unix timestamps.
    // Looking at the DB, these are stored as unix timestamps representing
    // the time of day. We'll use a base date and set times.
    const baseDate = new Date('2024-01-01T00:00:00Z');
    const startTime = Math.floor(new Date('2024-01-01T10:00:00Z').getTime() / 1000);
    const endTime = Math.floor(new Date('2024-01-01T20:00:00Z').getTime() / 1000);

    const res = await api.post('create_availability', {
      bio: 'E2E Test Chef — professional home cook specializing in West African cuisine',
      monday_start: startTime,
      monday_end: endTime,
      tuesday_start: startTime,
      tuesday_end: endTime,
      wednesday_start: startTime,
      wednesday_end: endTime,
      thursday_start: startTime,
      thursday_end: endTime,
      friday_start: startTime,
      friday_end: endTime,
      saterday_start: startTime,  // Note: DB column typo
      saterday_end: endTime,
      sunday_start: startTime,
      sunday_end: endTime,
      minimum_order_amount: 15,
      max_order_distance: 30,
    });

    h.assertSuccess(res, 'Create availability');
    h.logPass('Weekly availability set (all days 10am–8pm)');
    results.passed++;
  } catch (e) {
    h.logFail(`Create availability: ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
  }

  // ── 6. Background check verification (SafeScreener bypass) ─────
  try {
    h.logInfo('Verifying chef (SafeScreener bypass — DB flags only)...');
    const api = new ApiClient(); // No auth needed, just API key
    const res = await api.post('e2e/verify_chef', {
      user_id: userId,
    });

    h.assertSuccess(res, 'Verify chef');
    h.logPass('Chef verified (is_pending=0, verified=1)');
    results.passed++;
  } catch (e) {
    h.logFail(`Verify chef: ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
  }

  // ── 7. Stripe Connect setup ───────────────────────────────────
  if (config.stripeSecretKey) {
    try {
      h.logInfo('Setting up Stripe Connect for chef via E2E helper...');
      const api = new ApiClient(); // No auth needed, just API key

      // Stripe verification is async even in test mode — Custom accounts take ~60s
      // for charges_enabled to become true after all info + identity doc are provided.
      let chargesEnabled = false;
      const maxRetries = 12;
      const retryIntervalMs = 10000;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const res = await api.post('e2e/setup_chef_stripe', {
          user_id: userId,
        });

        if (res.body.success === 1 && res.body.charges_enabled) {
          chargesEnabled = true;
          h.logPass(`Chef Stripe setup complete — charges_enabled: true (attempt ${attempt})`);
          results.passed++;
          break;
        } else if (res.body.success === 1 && !res.body.charges_enabled) {
          h.logInfo(`Stripe verification pending (attempt ${attempt}/${maxRetries})... waiting ${retryIntervalMs / 1000}s`);
          await new Promise(r => setTimeout(r, retryIntervalMs));
        } else {
          h.logFail(`Chef Stripe setup: ${res.body.error}`);
          results.failed++;
          results.errors.push(`Chef Stripe: ${res.body.error}`);
          break;
        }
      }

      if (!chargesEnabled) {
        h.logFail('Stripe charges not enabled after retries');
        results.failed++;
        results.errors.push('Stripe charges_enabled never became true');
      }
    } catch (e) {
      h.logFail(`Chef Stripe setup: ${e.message}`);
      results.failed++;
      results.errors.push(`Chef Stripe: ${e.message}`);
    }
  } else {
    h.logWarn('Stripe keys not configured — skipping chef Stripe setup');
  }

  // ── 8. Duplicate registration guard ────────────────────────────
  try {
    h.logInfo('Testing duplicate chef email rejection...');
    const api = new ApiClient();
    const res = await api.post('register', chefData);

    h.assert(res.body.success === 0, 'Should reject duplicate email');
    h.logPass('Duplicate chef email correctly rejected');
    results.passed++;
  } catch (e) {
    h.logFail(`Duplicate email check: ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
  }

  return { ...results, userId, apiToken, menuId };
}

/**
 * Create a minimal valid 1x1 PNG as a Blob for multipart upload.
 */
function createMinimalPngBlob() {
  // 1x1 red pixel PNG
  const pngBytes = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
    0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc,
    0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, // IEND chunk
    0x44, 0xae, 0x42, 0x60, 0x82,
  ]);

  return new Blob([pngBytes], { type: 'image/png' });
}

module.exports = { run };
