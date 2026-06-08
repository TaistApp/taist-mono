#!/usr/bin/env node
/**
 * Generate the 3 onboarding caricature illustrations (mask-free) via OpenAI's
 * image API (gpt-image-1) and write them to the app asset paths.
 *
 * WHY THIS EXISTS
 *   The in-app image tool has no credits and there's no OpenAI key on the dev
 *   machine — the key lives in Railway. This script lets you generate the art
 *   once, locally, using that key.
 *
 * REQUIREMENTS
 *   - Node 18+ (uses global fetch).
 *   - OPENAI_API_KEY in the environment.
 *   - The OpenAI org must have access to `gpt-image-1` (Settings →
 *     Organization → may require identity verification). If you only have
 *     DALL·E 3, set MODEL = "dall-e-3" below (note: it can't emit JPEG, so the
 *     files will be saved as PNG and you'll need to update the imports in
 *     app/screens/common/signup/onBoarding/index.tsx to .png).
 *
 * HOW TO RUN
 *   Easiest — use the Railway env that already has the key (run from backend
 *   service so OPENAI_API_KEY is injected):
 *       cd backend && railway run node ../frontend/scripts/generate-onboarding-art.mjs
 *
 *   Or pass the key directly:
 *       OPENAI_API_KEY=sk-... node frontend/scripts/generate-onboarding-art.mjs
 *
 *   Preview only (writes to /tmp instead of the asset paths):
 *       OPENAI_API_KEY=sk-... node frontend/scripts/generate-onboarding-art.mjs --preview
 *
 * The current images are backed up to app/assets/images/_onboarding_backup/
 * before anything is overwritten, so this is reversible.
 */

import { writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MODEL = "gpt-image-1";          // or "dall-e-3" (see header note)
const SIZE = "1024x1024";             // close to the originals' ~1170x1014
const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, "..", "app", "assets", "images");
const PREVIEW = process.argv.includes("--preview");
const OUT_DIR = PREVIEW ? "/tmp" : ASSETS;

// Shared style so the 3 slides read as one cohesive set, matching the app's
// existing flat-illustration aesthetic — and crucially, NO face masks.
const STYLE =
  "Flat vector illustration, modern minimalist app-onboarding style, soft muted " +
  "pastel palette, simple geometric shapes with subtle flat shading, clean light " +
  "off-white / pale-beige background, friendly approachable character. " +
  "IMPORTANT: the person is NOT wearing any face mask or medical mask — show the " +
  "full face with a warm, friendly expression. Centered composition with headroom.";

// Each entry maps to an existing asset filename + its onboarding caption scene.
const SPECS = [
  {
    file: "onboarding_3.jpg", // "Meals are cooked at your discretion 24/7!"
    scene:
      "A home cook standing at a kitchen stove cooking a meal in a pot, wearing " +
      "an apron, seen from the side, cozy home kitchen with cabinets behind.",
  },
  {
    file: "onboarding_1.jpg", // "Not enough time to cook? Fed up with delivery?"
    scene:
      "A home cook at a stovetop frying food in a pan while holding a spatula, " +
      "wearing an apron, fresh vegetables on the counter, cozy home kitchen.",
  },
  {
    file: "onboarding_2.jpg", // "No grocery shopping. No cooking. No cleaning."
    scene:
      "An older woman baking, rolling out dough on a kitchen island counter with " +
      "fresh bread loaves nearby, wearing a warm-yellow blouse, cozy home kitchen " +
      "with a small potted plant.",
  },
];

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) {
  console.error(
    "\n✗ OPENAI_API_KEY is not set.\n" +
      "  Run with the Railway key, e.g.:\n" +
      "    cd backend && railway run node ../frontend/scripts/generate-onboarding-art.mjs\n" +
      "  or:\n" +
      "    OPENAI_API_KEY=sk-... node frontend/scripts/generate-onboarding-art.mjs\n",
  );
  process.exit(1);
}

async function generate(spec) {
  const body = {
    model: MODEL,
    prompt: `${spec.scene}\n\n${STYLE}`,
    size: SIZE,
    n: 1,
  };
  if (MODEL === "gpt-image-1") {
    body.quality = "high";
    body.output_format = "jpeg";
    body.output_compression = 90;
  } else {
    body.response_format = "b64_json"; // dall-e-3 → PNG bytes
  }

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI ${res.status}: ${txt}`);
  }
  const json = await res.json();
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image data returned");
  return Buffer.from(b64, "base64");
}

async function main() {
  console.log(`Model: ${MODEL}  Size: ${SIZE}  ${PREVIEW ? "(preview → /tmp)" : ""}`);

  if (!PREVIEW) {
    const backup = join(ASSETS, "_onboarding_backup");
    mkdirSync(backup, { recursive: true });
    for (const { file } of SPECS) {
      const src = join(ASSETS, file);
      if (existsSync(src)) copyFileSync(src, join(backup, file));
    }
    console.log(`Backed up current images → ${backup}`);
  }

  for (const spec of SPECS) {
    process.stdout.write(`Generating ${spec.file} … `);
    const bytes = await generate(spec);
    const out = join(OUT_DIR, spec.file);
    writeFileSync(out, bytes);
    console.log(`✓ wrote ${out} (${(bytes.length / 1024).toFixed(0)} KB)`);
  }

  console.log(
    "\nDone. Review the images" +
      (PREVIEW ? " in /tmp" : " in app/assets/images") +
      ". Re-run to regenerate; tweak SPECS[].scene / STYLE for different looks.",
  );
}

main().catch((e) => {
  console.error("\n✗ Generation failed:", e.message);
  if (String(e.message).includes("403") || String(e.message).includes("must be verified")) {
    console.error(
      "  → Your org likely lacks gpt-image-1 access. Verify the org in OpenAI " +
        "settings, or switch MODEL to 'dall-e-3' at the top of this script.",
    );
  }
  process.exit(1);
});
