#!/usr/bin/env node

/**
 * Taist E2E Test Runner
 *
 * Runs all 3 baseline flows against the staging API:
 *   1. Customer Signup
 *   2. Chef Signup
 *   3. Full Order (Customer → Chef → Completion → Review)
 *
 * Usage:
 *   node tests/e2e/run.js                   # Run all flows
 *   node tests/e2e/run.js --flow=customer   # Run only customer signup
 *   node tests/e2e/run.js --flow=chef       # Run only chef signup
 *   node tests/e2e/run.js --flow=order      # Run only order flow (needs prior setup)
 */

const config = require('./config');
const h = require('./helpers');
const customerFlow = require('./flow-customer-signup');
const chefFlow = require('./flow-chef-signup');
const orderFlow = require('./flow-order');

async function main() {
  const args = process.argv.slice(2);
  const flowArg = args.find(a => a.startsWith('--flow='))?.split('=')[1];

  console.log('\x1b[1;36m');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║           TAIST E2E TEST SUITE                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\x1b[0m');

  h.logInfo(`Target: ${config.baseUrl}`);
  h.logInfo(`Run ID: ${config.runId}`);
  h.logInfo(`Stripe: ${config.stripeSecretKey ? 'configured' : 'NOT configured (payment tests will be skipped)'}`);
  h.logInfo(`Timezone: ${config.timezone}`);
  console.log('');

  const totals = { passed: 0, failed: 0, errors: [] };

  let customerCtx = null;
  let chefCtx = null;

  // ── Flow 1: Customer Signup ────────────────────────────────────
  if (!flowArg || flowArg === 'customer' || flowArg === 'all') {
    try {
      const result = await customerFlow.run();
      totals.passed += result.passed;
      totals.failed += result.failed;
      totals.errors.push(...(result.errors || []));
      customerCtx = result;
    } catch (e) {
      h.logFail(`Flow 1 crashed: ${e.message}`);
      console.error(e.stack);
      totals.failed++;
      totals.errors.push(`Flow 1 crash: ${e.message}`);
    }
  }

  // ── Flow 2: Chef Signup ────────────────────────────────────────
  if (!flowArg || flowArg === 'chef' || flowArg === 'all') {
    try {
      const result = await chefFlow.run();
      totals.passed += result.passed;
      totals.failed += result.failed;
      totals.errors.push(...(result.errors || []));
      chefCtx = result;
    } catch (e) {
      h.logFail(`Flow 2 crashed: ${e.message}`);
      console.error(e.stack);
      totals.failed++;
      totals.errors.push(`Flow 2 crash: ${e.message}`);
    }
  }

  // ── Flow 3: Full Order ─────────────────────────────────────────
  if (!flowArg || flowArg === 'order' || flowArg === 'all') {
    if (customerCtx?.apiToken && chefCtx?.apiToken) {
      try {
        const result = await orderFlow.run(customerCtx, chefCtx);
        totals.passed += result.passed;
        totals.failed += result.failed;
        totals.errors.push(...(result.errors || []));
      } catch (e) {
        h.logFail(`Flow 3 crashed: ${e.message}`);
        console.error(e.stack);
        totals.failed++;
        totals.errors.push(`Flow 3 crash: ${e.message}`);
      }
    } else if (flowArg === 'order') {
      h.logFail('Order flow requires customer + chef signup flows to run first');
      totals.failed++;
    } else {
      h.logWarn('Skipping order flow — customer or chef signup failed');
    }
  }

  // ── Summary ────────────────────────────────────────────────────
  console.log('\n');
  console.log('\x1b[1m' + '═'.repeat(60) + '\x1b[0m');
  console.log('\x1b[1m  RESULTS SUMMARY\x1b[0m');
  console.log('\x1b[1m' + '═'.repeat(60) + '\x1b[0m');
  console.log('');
  console.log(`  \x1b[32m✓ Passed: ${totals.passed}\x1b[0m`);
  console.log(`  \x1b[31m✗ Failed: ${totals.failed}\x1b[0m`);
  console.log(`  Total:   ${totals.passed + totals.failed}`);

  if (totals.errors.length > 0) {
    console.log('\n  \x1b[31mErrors:\x1b[0m');
    for (const err of totals.errors) {
      console.log(`    • ${err}`);
    }
  }

  console.log('');

  if (totals.failed === 0) {
    console.log('  \x1b[1;32m✅ ALL TESTS PASSED — safe to push to staging\x1b[0m');
  } else {
    console.log('  \x1b[1;31m❌ TESTS FAILED — do NOT push to staging\x1b[0m');
  }

  console.log('');

  // Exit with appropriate code
  process.exit(totals.failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(2);
});
