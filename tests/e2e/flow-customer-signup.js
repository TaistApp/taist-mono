/**
 * Flow 1: Customer Signup
 *
 * Tests:
 *  1. Register a new customer via email/password
 *  2. Login with those credentials
 *  3. Verify the returned token works for authenticated endpoints
 *  4. Social login path (Google/Apple) — validates the endpoint accepts
 *     the expected payload shape (token verification will fail without
 *     a real provider token, but we confirm the endpoint is reachable
 *     and returns an expected error vs a 500)
 */

const { ApiClient } = require('./api');
const h = require('./helpers');

async function run() {
  h.logHeader('FLOW 1: Customer Signup');
  const results = { passed: 0, failed: 0, errors: [] };

  const customerData = h.testCustomer();
  let apiToken = null;
  let userId = null;

  // ── 1. Register ────────────────────────────────────────────────
  try {
    h.logInfo(`Registering customer: ${customerData.email}`);
    const api = new ApiClient();
    const res = await api.post('register', customerData);

    h.assertSuccess(res, 'Customer register');
    h.assertHasFields(res.body.data, ['api_token'], 'Customer register');
    apiToken = res.body.data.api_token;

    h.logPass(`Customer registered — token: ${apiToken.slice(0, 12)}...`);
    results.passed++;
  } catch (e) {
    h.logFail(`Customer register: ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
    // Can't continue without registration
    return results;
  }

  // ── 2. Login ───────────────────────────────────────────────────
  try {
    h.logInfo(`Logging in as: ${customerData.email}`);
    const api = new ApiClient();
    const res = await api.post('login', {
      email: customerData.email,
      password: customerData.password,
    });

    h.assertSuccess(res, 'Customer login');
    h.assertHasFields(res.body.data, ['api_token', 'user'], 'Customer login');
    h.assert(res.body.data.user.user_type === 1, 'User type should be 1 (customer)');
    h.assert(res.body.data.user.email === customerData.email, 'Email should match');

    userId = res.body.data.user.id;
    apiToken = res.body.data.api_token;

    h.logPass(`Customer login successful — user ID: ${userId}`);
    results.passed++;
  } catch (e) {
    h.logFail(`Customer login: ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
    return results;
  }

  // ── 3. Authenticated endpoint check ────────────────────────────
  try {
    h.logInfo('Testing authenticated access (get payment methods)...');
    const api = new ApiClient(apiToken);
    const res = await api.post('get_payment_methods');

    // Should succeed (empty list is fine) — not return 401
    h.assertSuccess(res, 'Authenticated endpoint');
    h.logPass('Authenticated endpoint accessible with token');
    results.passed++;
  } catch (e) {
    h.logFail(`Authenticated endpoint: ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
  }

  // ── 4. Social login endpoint reachability ──────────────────────
  // We can't generate real Google/Apple tokens from CLI, but we verify
  // the endpoint returns a proper validation error (not a 500).
  try {
    h.logInfo('Testing social login endpoint (Google — expects token error)...');
    const api = new ApiClient();
    const res = await api.post('social-login', {
      provider: 'google',
      token: 'fake-test-token-will-fail-verification',
      email: 'social-test@example.com',
      first_name: 'Social',
      last_name: 'Test',
    });

    // Should fail gracefully with a validation error, NOT a 500
    h.assert(res.status !== 500, 'Social login should not 500 on invalid token');
    h.assert(res.body.success === 0, 'Should return success=0 for invalid token');

    h.logPass(`Social login (Google) endpoint reachable — got expected error`);
    results.passed++;
  } catch (e) {
    h.logFail(`Social login (Google) endpoint: ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
  }

  try {
    h.logInfo('Testing social login endpoint (Apple — expects token error)...');
    const api = new ApiClient();
    const res = await api.post('social-login', {
      provider: 'apple',
      token: 'fake-test-token-will-fail-verification',
      email: 'social-test@example.com',
      first_name: 'Social',
      last_name: 'Test',
    });

    h.assert(res.status !== 500, 'Social login should not 500 on invalid token');
    h.assert(res.body.success === 0, 'Should return success=0 for invalid token');

    h.logPass(`Social login (Apple) endpoint reachable — got expected error`);
    results.passed++;
  } catch (e) {
    h.logFail(`Social login (Apple) endpoint: ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
  }

  // ── 5. Duplicate registration guard ────────────────────────────
  try {
    h.logInfo('Testing duplicate email rejection...');
    const api = new ApiClient();
    const res = await api.post('register', customerData);

    h.assert(res.body.success === 0, 'Should reject duplicate email');
    h.logPass('Duplicate email correctly rejected');
    results.passed++;
  } catch (e) {
    h.logFail(`Duplicate email check: ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
  }

  // ── 6. Bad password login ──────────────────────────────────────
  try {
    h.logInfo('Testing wrong password rejection...');
    const api = new ApiClient();
    const res = await api.post('login', {
      email: customerData.email,
      password: 'WrongPassword999!',
    });

    h.assert(res.body.success === 0, 'Should reject wrong password');
    h.logPass('Wrong password correctly rejected');
    results.passed++;
  } catch (e) {
    h.logFail(`Wrong password check: ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
  }

  return { ...results, userId, apiToken };
}

module.exports = { run };
