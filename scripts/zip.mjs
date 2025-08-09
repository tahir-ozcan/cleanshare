// scripts/zip.mjs
// Usage: node scripts/zip.mjs edge|chrome
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const target = process.argv[2];
if (!["edge", "chrome"].includes(target)) {
  console.error("Usage: node scripts/zip.mjs edge|chrome");
  process.exit(1);
}

// manifest.json'un mevcut olduğundan emin ol (prepare:chrome sonrası)
const manifestPath = path.join(process.cwd(), "manifest.json");
if (!fs.existsSync(manifestPath)) {
  console.error("manifest.json not found. Run `npm run prepare:chrome` first.");
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const version = manifest.version || "0.0.0";

const outDir = path.join(process.cwd(), "dist");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const outZip = path.join(outDir, `cleanshare_${target}-${version}.zip`);

// İçerik listesi
const files = [
  "manifest.json",
  "background.js",
  "content.js",
  "popup.html",
  "popup.css",
  "popup.js",
  "rules.json",
  "icons"
].filter(f => fs.existsSync(path.join(process.cwd(), f)));

try {
  const cmd = `zip -r -q ${JSON.stringify(outZip)} ${files.map(f => JSON.stringify(f)).join(" ")}`;
  execSync(cmd, { stdio: "inherit" });
  console.log(`✅ wrote ${outZip}`);
} catch (e) {
  console.error("❌ zip failed. Ensure 'zip' is installed (e.g., sudo apt install zip).");
  process.exit(1);
}
