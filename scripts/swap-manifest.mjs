import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const mode = process.argv[2]; // "chrome" | "firefox"
if (!["chrome", "firefox"].includes(mode)) {
  console.error("Usage: node scripts/swap-manifest.mjs <chrome|firefox>");
  process.exit(1);
}

const src = join("manifests", `manifest.${mode}.json`);
const dst = "manifest.json";

if (!existsSync(src)) {
  console.error(`Missing ${src}.`);
  process.exit(1);
}

copyFileSync(src, dst);
console.log(`Wrote ${dst} from ${src}`);
