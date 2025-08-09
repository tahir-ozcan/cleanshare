// scripts/bump-version.mjs
import fs from "node:fs";
import path from "node:path";

const pkgPath = path.join(process.cwd(), "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const version = pkg.version;

const files = [
  "manifests/manifest.chrome.json",
  "manifests/manifest.firefox.json"
];

for (const file of files) {
  const p = path.join(process.cwd(), file);
  const json = JSON.parse(fs.readFileSync(p, "utf8"));
  json.version = version;
  fs.writeFileSync(p, JSON.stringify(json, null, 2) + "\n", "utf8");
  console.log(`updated ${file} → ${version}`);
}

console.log(`✅ version propagated: ${version}`);
