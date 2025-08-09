Kısacası: **neredeyse hazır**, ama iki küçük düzeltme yapalım:

1) **Development komutları** README’de eski kalmış. Bizde `lint:firefox`, `build:firefox` ve `prepare:chrome` var.  
2) İsteğe bağlı ama iyi olur: “Local install” talimatı ekleyelim (store’a girmeden denemek için).

Aşağıdaki **güncellenmiş README.md**’yi birebir koyabilirsin:

```md
# CleanShare — Link Cleaner (MV3)

Removes tracking junk from URLs when you browse, click, or copy. Privacy-first. Zero telemetry.

## Why
Clean, human-readable links. No UTM clutter. No redirectors.

## Features
- Auto-remove tracking params (`utm_*`, `gclid`, `fbclid`, etc.)
- Bypass Google/Facebook redirectors
- Right-click → **Copy clean link**
- Popup: one-tap **Copy** + **Copy canonical URL**
- Keyboard shortcut to copy the current page’s clean URL

## Install
- Firefox Add-ons: (coming soon)
- Microsoft Edge Add-ons: (coming soon)
- Chrome Web Store: (coming later)

## Development
```bash
npm i
# Firefox (lint + build + run temporary)
npm run lint:firefox
npm run build:firefox
npm run dev:firefox

# Chrome/Edge (prepare manifest, then Load unpacked)
npm run prepare:chrome
```

## Local Install (temporary)
- **Firefox:** `npm run dev:firefox` launches a temporary profile with the add-on loaded.
- **Chrome/Edge:** Go to `chrome://extensions` / `edge://extensions` → enable **Developer mode** → **Load unpacked** → select the project folder (after `npm run prepare:chrome`).

## Privacy
We collect **no** data. No analytics. No remote calls. Everything runs locally.

## Contributing
Please read `CONTRIBUTING.md`, open an issue, or send a PR.

## License
MIT © 2025 Tahir Özcan — see the full text in the `LICENSE` file.
```