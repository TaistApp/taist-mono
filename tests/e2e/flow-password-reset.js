/**
 * Flow 5: Password Reset
 *
 * Covers the contract behind the app's Forgot Password screen. A chef from
 * Indeed reported "reset button not working", and the screen gave almost no
 * feedback when the server rejected a code — so these assertions pin down
 * which side is at fault next time.
 *
 * Tests:
 *  1. forgot on an unknown email is rejected
 *  2. forgot on a real account issues a 6-digit code
 *  3. reset_password with a wrong code says "incorrect", NOT "expired"
 *     (an "expired" answer here means the server-side code cache is not
 *     surviving between requests — e.g. a per-instance file cache behind
 *     multiple Railway replicas — which breaks reset for everyone)
 *  4. reset_password with the right code succeeds
 *  5. the new password works and the old one does not
 *  6. a used code cannot be replayed
 *  7. resending invalidates the previous code and issues a working one
 *     (backs the "Resend code" button on the reset screen)
 */

const { ApiClient } = require('./api');
const config = require('./config');
const h = require('./helpers');

const NEW_PASSWORD = 'ResetPass456!';
const SECOND_PASSWORD = 'ResetPass789!';

async function run() {
  h.logHeader('FLOW 5: Password Reset');
  const results = { passed: 0, failed: 0, errors: [] };

  // Own email prefix — the customer signup flow has already claimed
  // customer-<runId>@… by the time this flow runs.
  const user = { ...h.testCustomer(), email: h.testEmail('reset') };
  let code = null;

  // ── 0. Seed an account to reset ────────────────────────────────
  try {
    h.logInfo(`Registering reset-target account: ${user.email}`);
    const res = await new ApiClient().post('register', user);
    h.assertSuccess(res, 'Reset-target register');
    h.logPass('Reset-target account created');
    results.passed++;
  } catch (e) {
    h.logFail(`Reset-target register: ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
    return results; // nothing below can run without an account
  }

  // ── 1. Unknown email is rejected ───────────────────────────────
  try {
    const res = await new ApiClient().post('forgot', {
      email: `no-such-user-${config.runId}@${config.testEmailDomain}`,
    });
    h.assert(res.body.success === 0, 'forgot on an unknown email should fail');
    h.logPass(`Unknown email rejected — "${res.body.error}"`);
    results.passed++;
  } catch (e) {
    h.logFail(`Unknown-email check: ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
  }

  // ── 2. Request a code ──────────────────────────────────────────
  try {
    h.logInfo('Requesting a reset code');
    const res = await new ApiClient().post('forgot', { email: user.email });
    h.assertSuccess(res, 'forgot');
    code = String(res.body.data ?? '');
    h.assert(/^\d{6}$/.test(code), `Reset code should be 6 digits, got "${code}"`);
    h.logPass(`Reset code issued: ${code}`);
    results.passed++;
  } catch (e) {
    h.logFail(`forgot: ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
    return results; // the rest of the flow needs a code
  }

  // ── 3. Wrong code → "incorrect", not "expired" ─────────────────
  try {
    const wrong = code === '000000' ? '111111' : '000000';
    const res = await new ApiClient().post('reset_password', {
      email: user.email,
      code: wrong,
      password: NEW_PASSWORD,
    });
    h.assert(res.body.success === 0, 'A wrong reset code must be rejected');
    h.assert(
      !/expired/i.test(res.body.error || ''),
      `Wrong code returned "${res.body.error}" — the reset code cache is not ` +
        'persisting between requests, so every reset will fail',
    );
    h.logPass(`Wrong code rejected as expected — "${res.body.error}"`);
    results.passed++;
  } catch (e) {
    h.logFail(`Wrong-code check: ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
  }

  // ── 4. Correct code resets the password ────────────────────────
  try {
    const res = await new ApiClient().post('reset_password', {
      email: user.email,
      code,
      password: NEW_PASSWORD,
    });
    h.assertSuccess(res, 'reset_password');
    h.logPass('Password reset accepted');
    results.passed++;
  } catch (e) {
    h.logFail(`reset_password: ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
  }

  // ── 5. New password works, old one does not ────────────────────
  try {
    const res = await new ApiClient().post('login', {
      email: user.email,
      password: NEW_PASSWORD,
    });
    h.assertSuccess(res, 'Login with new password');
    h.logPass('Login with the new password succeeds');
    results.passed++;
  } catch (e) {
    h.logFail(`Login with new password: ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
  }

  try {
    // Control: the reset must actually replace the old credential.
    const res = await new ApiClient().post('login', {
      email: user.email,
      password: user.password,
    });
    h.assert(res.body.success === 0, 'The old password must stop working after a reset');
    h.logPass('Old password correctly rejected');
    results.passed++;
  } catch (e) {
    h.logFail(`Old-password check: ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
  }

  // ── 6. Codes are single-use ────────────────────────────────────
  try {
    const res = await new ApiClient().post('reset_password', {
      email: user.email,
      code,
      password: SECOND_PASSWORD,
    });
    h.assert(res.body.success === 0, 'A consumed reset code must not be replayable');
    h.logPass(`Code replay rejected — "${res.body.error}"`);
    results.passed++;
  } catch (e) {
    h.logFail(`Code-replay check: ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
  }

  // ── 7. Resend invalidates the previous code ────────────────────
  try {
    h.logInfo('Requesting a second code (Resend button path)');
    const first = await new ApiClient().post('forgot', { email: user.email });
    h.assertSuccess(first, 'forgot (first of resend pair)');
    const staleCode = String(first.body.data ?? '');

    const second = await new ApiClient().post('forgot', { email: user.email });
    h.assertSuccess(second, 'forgot (resend)');
    const freshCode = String(second.body.data ?? '');

    if (staleCode === freshCode) {
      // Same six random digits twice running — nothing to prove, so skip
      // rather than fail on a 1-in-900k coincidence.
      h.logWarn('Resend produced an identical code; skipping stale-code assertion');
    } else {
      const stale = await new ApiClient().post('reset_password', {
        email: user.email,
        code: staleCode,
        password: SECOND_PASSWORD,
      });
      h.assert(
        stale.body.success === 0,
        'The code from before a resend must no longer work',
      );
      h.logPass(`Stale code rejected after resend — "${stale.body.error}"`);
      results.passed++;
    }

    const fresh = await new ApiClient().post('reset_password', {
      email: user.email,
      code: freshCode,
      password: SECOND_PASSWORD,
    });
    h.assertSuccess(fresh, 'reset_password with the resent code');
    h.logPass('Resent code resets the password');
    results.passed++;
  } catch (e) {
    h.logFail(`Resend check: ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
  }

  return results;
}

module.exports = { run };
