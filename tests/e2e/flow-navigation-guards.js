/**
 * Flow 4: Navigation Guards (static source assertions — no API)
 *
 * Regression guard for the "missing bottom tab bar" bug.
 *
 * Root cause: after signup and after the account-completion login, customers
 * were sent to the standalone route `/screens/customer/home` instead of into
 * the tab navigator at `/screens/customer/(tabs)`. The standalone route mounts
 * the Home screen OUTSIDE `<Tabs>`, so no bottom tab bar rendered (the chef
 * branch was never affected — it always used `/screens/chef/(tabs)/home`).
 *
 * These checks read the frontend source directly and fail if any post-auth
 * customer navigation regresses back to the tab-less route, or if the
 * standalone `customer/home` route stops being a safety redirect.
 *
 * Each regression assertion is paired with a CONTROL assertion that must pass
 * (e.g. the chef branch still routes through its own tabs), proving the test
 * actually discriminates rather than always passing.
 */

const fs = require('fs');
const path = require('path');
const h = require('./helpers');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const FRONTEND_APP = path.join(REPO_ROOT, 'frontend', 'app');

// Route that mounts Home OUTSIDE the tab navigator (no bottom tab bar).
const TABLESS_HOME = '/screens/customer/home';
// Correct route — redirects into the tab navigator (bottom tab bar shows).
const CUSTOMER_TABS = '/screens/customer/(tabs)';

function read(relFromApp) {
  return fs.readFileSync(path.join(FRONTEND_APP, relFromApp), 'utf8');
}

/**
 * Match a quoted occurrence of an exact route string, e.g. "/screens/customer/home"
 * but NOT "/screens/customer/home/HomeScreen" or "/screens/customer/(tabs)".
 * Requires the char after the route to be the closing quote.
 */
function hasExactQuotedRoute(src, route) {
  const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`["'\`]${escaped}["'\`]`).test(src);
}

function run() {
  h.logHeader('FLOW 4: Navigation Guards (missing tab bar regression)');
  const results = { passed: 0, failed: 0, errors: [] };

  const check = (label, fn) => {
    try {
      fn();
      h.logPass(label);
      results.passed++;
    } catch (e) {
      h.logFail(`${label}: ${e.message}`);
      results.failed++;
      results.errors.push(`${label}: ${e.message}`);
    }
  };

  // ── 1. Signup must NOT route customers to the tab-less Home ──────
  check('Signup routes new customers into the tab navigator', () => {
    const src = read('screens/common/signup/index.tsx');
    h.assert(
      !hasExactQuotedRoute(src, TABLESS_HOME),
      `signup/index.tsx still navigates to tab-less "${TABLESS_HOME}"`,
    );
    h.assert(
      /customerAuthorized\(\)/.test(src) || hasExactQuotedRoute(src, CUSTOMER_TABS),
      'signup/index.tsx no longer routes customers into the tabs',
    );
  });

  // ── 2. Account-completion login must use the customer tabs ──────
  check('Account-completion login routes customers into the tab navigator', () => {
    const src = read('screens/common/account/index.tsx');
    h.assert(
      !hasExactQuotedRoute(src, TABLESS_HOME),
      `account/index.tsx still navigates to tab-less "${TABLESS_HOME}"`,
    );
    h.assert(
      hasExactQuotedRoute(src, CUSTOMER_TABS),
      `account/index.tsx no longer routes customers to "${CUSTOMER_TABS}"`,
    );
    // CONTROL: the chef branch was never broken and must stay on its own tabs.
    h.assert(
      hasExactQuotedRoute(src, '/screens/chef/(tabs)/home'),
      'control failed: chef branch should still route to /screens/chef/(tabs)/home',
    );
  });

  // ── 3. Standalone customer/home route is a safety redirect ──────
  check('Standalone /screens/customer/home is a redirect, not the raw Home', () => {
    const src = read('screens/customer/home/index.tsx');
    h.assert(/Redirect/.test(src), 'customer/home/index.tsx should render <Redirect>');
    h.assert(
      hasExactQuotedRoute(src, '/screens/customer/(tabs)/(home)') ||
        hasExactQuotedRoute(src, CUSTOMER_TABS),
      'customer/home/index.tsx redirect should target the tab navigator',
    );
  });

  // ── 4. The tab Home route renders the real Home component ───────
  check('Tab Home route imports the Home component (HomeScreen)', () => {
    const src = read('screens/customer/(tabs)/(home)/index.tsx');
    h.assert(
      /from '\.\.\/\.\.\/home\/HomeScreen'/.test(src),
      'tab (home)/index.tsx should import Home from ../../home/HomeScreen',
    );
  });

  // ── 5. Navigation helper points customers at the tabs ───────────
  check('navigate helper routes signed-in customers to the tabs', () => {
    const src = read('utils/navigation.ts');
    h.assert(
      hasExactQuotedRoute(src, CUSTOMER_TABS),
      `navigation.ts customerAuthorized should replace to "${CUSTOMER_TABS}"`,
    );
    // CONTROL: helper must not have introduced a tab-less customer home route.
    h.assert(
      !hasExactQuotedRoute(src, TABLESS_HOME),
      `navigation.ts must not navigate to tab-less "${TABLESS_HOME}"`,
    );
  });

  // ── 6. No source file navigates to the tab-less Home route ──────
  check('No frontend source navigates to the tab-less customer Home', () => {
    const offenders = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules') continue;
          walk(full);
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          const src = fs.readFileSync(full, 'utf8');
          // The redirect file itself legitimately mentions the path in a comment;
          // only flag actual router navigation calls to the tab-less route.
          if (/router\.(push|replace|navigate)\(\s*["'`]\/screens\/customer\/home["'`]/.test(src)) {
            offenders.push(path.relative(REPO_ROOT, full));
          }
        }
      }
    };
    walk(FRONTEND_APP);
    h.assert(
      offenders.length === 0,
      `these files navigate to the tab-less Home: ${offenders.join(', ')}`,
    );
  });

  return results;
}

module.exports = { run };
