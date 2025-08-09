// scripts/generate-assets.js
// Generate store listing images from SVG templates using sharp.
// - Sanitizes raw '&' in SVG text nodes
// - Logs which template fails, if any

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = process.cwd();
const TPL = path.join(ROOT, "assets", "templates");
const OUT = path.join(ROOT, "assets", "listing");
const BRAND = path.join(ROOT, "branding", "logo.svg");

const files = [
  { in: "screenshot-01.svg", out: "screenshot-01-1280x800.png", w: 1280, h: 800 },
  { in: "screenshot-02.svg", out: "screenshot-02-1280x800.png", w: 1280, h: 800 },
  { in: "promo-small.svg", out: "edge-promo-small-440x280.png", w: 440, h: 280 },
  { in: "promo-large.svg", out: "edge-promo-large-1400x560.png", w: 1400, h: 560 }
];

fs.mkdirSync(OUT, { recursive: true });

function sanitizeSvg(svgText) {
  // Replace any & that is NOT the start of a known entity with &amp;
  // Known entities: &amp; &lt; &gt; &quot; &apos; and numeric &#...; or &#x...;
  return svgText.replace(
    /&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g,
    "&amp;"
  );
}

(async () => {
  try {
    for (const f of files) {
      const svgPath = path.join(TPL, f.in);
      if (!fs.existsSync(svgPath)) {
        throw new Error(`Missing template: ${svgPath}`);
      }

      // Read + sanitize
      let svg = fs.readFileSync(svgPath, "utf8");
      svg = sanitizeSvg(svg);

      // Render SVG -> PNG
      let image = sharp(Buffer.from(svg)).resize(f.w, f.h, { fit: "cover" });

      // Optional brand badge bottom-right if logo exists
      if (fs.existsSync(BRAND)) {
        const logo = await sharp(BRAND).resize(48, 48).png().toBuffer();
        image = image
          .png()
          .composite([{ input: logo, left: f.w - 56, top: f.h - 56 }]);
      }

      const outPath = path.join(OUT, f.out);
      await image.png().toFile(outPath);
      console.log("wrote", outPath);
    }
    console.log("✅ All listing assets generated.");
  } catch (err) {
    console.error("❌ Asset generation failed:", err.message);
    process.exit(1);
  }
})();
