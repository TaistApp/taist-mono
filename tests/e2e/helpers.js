/**
 * Test helpers — utilities for generating test data and assertions.
 */

const config = require('./config');

// ── Unique test data generators ──────────────────────────────────

function testEmail(role) {
  return `${role}-${config.runId}@${config.testEmailDomain}`;
}

function testPassword() {
  return 'TestPass123!';
}

function testCustomer() {
  return {
    email: testEmail('customer'),
    password: testPassword(),
    first_name: 'E2E',
    last_name: 'Customer',
    phone: '5551230001',
    address: '123 Test St',
    city: 'Dallas',
    state: 'Texas',
    zip: '75201',
    user_type: 1,
  };
}

function testChef() {
  return {
    email: testEmail('chef'),
    password: testPassword(),
    first_name: 'E2E',
    last_name: 'Chef',
    phone: '5551230002',
    address: '456 Chef Ave',
    city: 'Dallas',
    state: 'Texas',
    zip: '75201',
    user_type: 2,
    // The app registers chefs as pending (awaiting admin approval). The login
    // step in the chef flow then covers the regression where pending chefs were
    // rejected with "account is currently deactivated" and locked out of onboarding.
    is_pending: 1,
  };
}

// ── Logging ──────────────────────────────────────────────────────

const PASS = '\x1b[32m  PASS\x1b[0m';
const FAIL = '\x1b[31m  FAIL\x1b[0m';
const INFO = '\x1b[36m  INFO\x1b[0m';
const WARN = '\x1b[33m  WARN\x1b[0m';
const HEADER = '\x1b[1;35m';
const RESET = '\x1b[0m';

function logHeader(title) {
  console.log(`\n${HEADER}${'═'.repeat(60)}${RESET}`);
  console.log(`${HEADER}  ${title}${RESET}`);
  console.log(`${HEADER}${'═'.repeat(60)}${RESET}\n`);
}

function logPass(msg) { console.log(`${PASS}  ${msg}`); }
function logFail(msg) { console.log(`${FAIL}  ${msg}`); }
function logInfo(msg) { console.log(`${INFO}  ${msg}`); }
function logWarn(msg) { console.log(`${WARN}  ${msg}`); }

// ── Assertion helpers ────────────────────────────────────────────

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertSuccess(res, context) {
  if (res.body.success !== 1) {
    const errMsg = res.body.error || res.body.message || JSON.stringify(res.body);
    throw new Error(`${context}: API returned failure — ${errMsg}`);
  }
}

function assertHasFields(obj, fields, context) {
  for (const field of fields) {
    if (obj[field] === undefined || obj[field] === null) {
      throw new Error(`${context}: Missing expected field "${field}" in response`);
    }
  }
}

// ── Date/time helpers ────────────────────────────────────────────

/**
 * Get tomorrow's date in YYYY-MM-DD format, in a given IANA timezone.
 */
function getTomorrow(timezone = config.timezone) {
  const now = new Date();
  // Shift to target timezone
  const options = { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-CA', options); // en-CA gives YYYY-MM-DD
  const todayStr = formatter.format(now);
  const tomorrow = new Date(todayStr + 'T12:00:00');
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatter.format(tomorrow);
}

/**
 * Get a safe order time — 3+ hours from now if same-day, or midday for tomorrow.
 */
function getSafeOrderTime() {
  return '14:00'; // 2 PM — safe default for tomorrow orders
}

/**
 * Get the day-of-week number (0=Sunday ... 6=Saturday) for a date string.
 */
function getDayOfWeek(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.getDay();
}

/**
 * Get the day name (lowercase) for a date string — matches DB column names.
 * Note: Saturday is misspelled as "saterday" in the DB.
 */
function getDayName(dateStr) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saterday'];
  return days[getDayOfWeek(dateStr)];
}

module.exports = {
  testEmail,
  testPassword,
  testCustomer,
  testChef,
  logHeader,
  logPass,
  logFail,
  logInfo,
  logWarn,
  assert,
  assertSuccess,
  assertHasFields,
  getTomorrow,
  getSafeOrderTime,
  getDayOfWeek,
  getDayName,
  PASS, FAIL, INFO, WARN,
};
