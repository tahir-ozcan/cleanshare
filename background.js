/* CleanShare background (MV3 service worker for Chrome / classic for Firefox)
   - Context menus
   - Keyboard shortcut: copy clean (canonical-preferred) URL
   - Clipboard write is performed in the content script (safer cross-browser)
*/

function cleanUrl(u) {
  try {
    const url = new URL(u);

    // 0) Common redirector resolvers
    if (url.hostname.endsWith("google.com") && (url.pathname === "/url" || url.pathname === "/imgres")) {
      const t = url.searchParams.get("url") || url.searchParams.get("q") || url.searchParams.get("imgurl");
      if (t) return cleanUrl(t);
    }
    if ((url.hostname === "l.facebook.com" || url.hostname === "lm.facebook.com") && url.pathname === "/l.php") {
      const t = url.searchParams.get("u");
      if (t) return cleanUrl(t);
    }

    // 1) Case-insensitive delete set
    const TRACK_PARAMS = new Set([
      "gclid","gbraid","wbraid","fbclid","msclkid","yclid","igshid","gclsrc",
      "mc_cid","mc_eid","mkt_tok","sr_share","si","spm","ref","ref_src","_hsenc","_hsmi",
      "vero_id","oly_anon_id","oly_enc_id","fb_action_ids","fb_action_types","s_cid"
    ]);

    // 2) Generic removal (utm_* + known trackers)
    for (const key of [...url.searchParams.keys()]) {
      const low = key.toLowerCase();
      if (low.startsWith("utm_") || TRACK_PARAMS.has(low)) url.searchParams.delete(key);
    }

    // 3) Host-specific whitelists / transforms
    const host = url.hostname;

    // Bing search => keep only q
    if (host.endsWith("bing.com") && url.pathname === "/search") {
      const q = url.searchParams.get("q");
      url.search = q ? new URLSearchParams({ q }).toString() : "";
    }

    // Google search => keep q (+tbm for verticals like images/news)
    if (host.endsWith("google.com") && url.pathname === "/search") {
      const q = url.searchParams.get("q") || "";
      const tbm = url.searchParams.get("tbm"); // images/videos/news...
      const kept = new URLSearchParams();
      if (q) kept.set("q", q);
      if (tbm) kept.set("tbm", tbm);
      url.search = kept.toString();
    }

    // DuckDuckGo => keep q
    if (host.endsWith("duckduckgo.com") && (url.pathname === "/" || url.pathname === "/")) {
      const q = url.searchParams.get("q");
      url.search = q ? new URLSearchParams({ q }).toString() : "";
    }

    // YouTube watch => keep v, t and playlist context (list, index)
    if (host.endsWith("youtube.com") && url.pathname === "/watch") {
      const kept = new URLSearchParams();
      const v = url.searchParams.get("v");
      const t = url.searchParams.get("t");
      const list = url.searchParams.get("list");
      const index = url.searchParams.get("index");
      if (v) kept.set("v", v);
      if (t) kept.set("t", t);
      if (list) kept.set("list", list);
      if (index) kept.set("index", index);
      url.search = kept.toString();
    }

    // Amazon product pages => strip query entirely
    if (/\.amazon\./.test(host) && (url.pathname.includes("/dp/") || url.pathname.includes("/gp/product/"))) {
      url.search = "";
    }

    // LinkedIn / Medium common params
    if (host.endsWith("linkedin.com")) {
      url.searchParams.delete("trk");
      url.searchParams.delete("originalSubdomain");
      url.search = url.searchParams.toString();
    }
    if (host.endsWith("medium.com")) {
      url.searchParams.delete("source");
      url.search = url.searchParams.toString();
    }

    // Fragment UTM cleanup (e.g., #utm_source=...)
    if (url.hash && /utm_/i.test(url.hash)) {
      const h = new URLSearchParams(url.hash.slice(1));
      for (const k of [...h.keys()]) if (k.toLowerCase().startsWith("utm_")) h.delete(k);
      const newHash = h.toString();
      url.hash = newHash ? `#${newHash}` : "";
    }

    // Final normalize
    url.search = url.searchParams.toString();
    return url.toString();
  } catch { return u; }
}

// Get canonical URL from the active tab (falls back to tab.url)
async function getCanonical(tabId) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const link = document.querySelector('link[rel="canonical"]');
        return link?.href || location.href;
      }
    });
    return result;
  } catch {
    return null;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "copyCleanLink",
    title: "Copy clean link",
    contexts: ["link"]
  });
  chrome.contextMenus.create({
    id: "copyCleanPage",
    title: "Copy clean page URL",
    contexts: ["page","action"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const raw = info.linkUrl || info.pageUrl || tab?.url || "";
  const cleaned = cleanUrl(raw);
  if (tab?.id) {
    await chrome.tabs.sendMessage(tab.id, { type: "copy", text: cleaned }).catch(() => {});
  }
});

chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd !== "copy-clean-url") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab?.url) return;
  const canonical = await getCanonical(tab.id);
  const cleaned = cleanUrl(canonical || tab.url);
  await chrome.tabs.sendMessage(tab.id, { type: "copy", text: cleaned }).catch(() => {});
});
