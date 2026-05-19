/**
 * E2E Test Configuration
 *
 * Credentials are loaded from environment variables.
 * Copy .env.e2e.example to .env.e2e and fill in your values.
 */

const path = require('path');

// Load .env.e2e if it exists
try {
  const envPath = path.join(__dirname, '.env.e2e');
  const fs = require('fs');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const val = trimmed.slice(eqIndex + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
} catch (e) {
  // Silently continue — env vars may be set externally
}

const config = {
  // API target
  baseUrl: process.env.E2E_BASE_URL || 'https://api-staging.taist.app/mapi',
  apiKey: 'ra_jk6YK9QmAVqTazHIrF1vi3qnbtagCIJoZAzCR51lCpYY9nkTN6aPVeX15J49k',

  // Stripe test keys (required for order/payment flow)
  stripeSecretKey: process.env.E2E_STRIPE_SECRET_KEY || '',
  stripePublishableKey: process.env.E2E_STRIPE_PUBLISHABLE_KEY || '',

  // Test user naming convention (easy to identify + clean up)
  testEmailDomain: 'e2e-test.taist.app',

  // Unique run ID to avoid collisions between parallel runs
  runId: Date.now().toString(36),

  // Timezone for order tests (US Central — matches most Taist chefs)
  timezone: 'America/Chicago',
};

module.exports = config;
