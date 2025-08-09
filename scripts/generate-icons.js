const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const SIZES = [16, 32, 48, 128];
const inSvg = path.join(__dirname, "../branding/logo.svg");
const outDir = path.join(__dirname, "../icons");

fs.mkdirSync(outDir, { recursive: true });

(async () => {
  for (const s of SIZES) {
    const out = path.join(outDir, `icon${s}.png`);
    await sharp(inSvg).resize(s, s).png().toFile(out);
    console.log("wrote", out);
  }
})();
