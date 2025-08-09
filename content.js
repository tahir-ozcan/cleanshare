/* CleanShare content script
   - Early redirect resolve (Google/Facebook redirectors)
   - Case-insensitive tracker removal
   - Host-specific URL whitelists (Bing/Google/DDG/YT/Amazon/LinkedIn/Medium)
   - Rewrites anchors in DOM
   - Handles clipboard writes on request from background
*/

const TRACK_PARAMS = new Set([
  "gclid","gbraid","wbraid","fbclid","msclkid","yclid","igshid","gclsrc",
  "mc_cid","mc_eid","mkt_tok","sr_share","si","spm","ref","ref_src","_hsenc","_hsmi",
  "vero_id","oly_anon_id","oly_enc_id","s_cid"
]);

function cleanUrl(u) {
  try {
    const url = new URL(u);

    // Common redirectors
    if (url.hostname.endsWith("google.com") && (url.pathname === "/url" || url.pathname === "/imgres")) {
      const t = url.searchParams.get("url") || url.searchParams.get("q") || url.searchParams.get("imgurl");
      if (t) return cleanUrl(t);
    }
    if ((url.hostname === "l.facebook.com" || url.hostname === "lm.facebook.com") && url.pathname === "/l.php") {
      const t = url.searchParams.get("u");
      if (t) return cleanUrl(t);
    }

    // Generic removal (utm_* + known trackers), case-insensitive
    for (const key of [...url.searchParams.keys()]) {
      const low = key.toLowerCase();
      if (low.startsWith("utm_") || TRACK_PARAMS.has(low)) url.searchParams.delete(key);
    }

    // Host-specific rules
    const host = url.hostname;

    // Bing search => keep only q
    if (host.endsWith("bing.com") && url.pathname === "/search") {
      const q = url.searchParams.get("q");
      url.search = q ? new URLSearchParams({ q }).toString() : "";
    }

    // Google search => keep q (+tbm)
    if (host.endsWith("google.com") && url.pathname === "/search") {
      const q = url.searchParams.get("q") || "";
      const tbm = url.searchParams.get("tbm");
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

    // YouTube watch => keep v, t and playlist context
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

    // Amazon product page => strip query
    if (/\.amazon\./.test(host) && (url.pathname.includes("/dp/") || url.pathname.includes("/gp/product/"))) {
      url.search = "";
    }

    // LinkedIn / Medium cleanup
    if (host.endsWith("linkedin.com")) {
      url.searchParams.delete("trk");
      url.searchParams.delete("originalSubdomain");
      url.search = url.searchParams.toString();
    }
    if (host.endsWith("medium.com")) {
      url.searchParams.delete("source");
      url.search = url.searchParams.toString();
    }

    // Fragment UTM cleanup
    if (url.hash && /utm_/i.test(url.hash)) {
      const h = new URLSearchParams(url.hash.slice(1));
      for (const k of [...h.keys()]) if (k.toLowerCase().startsWith("utm_")) h.delete(k);
      url.hash = h.toString() ? `#${h.toString()}` : "";
    }

    url.search = url.searchParams.toString();
    return url.toString();
  } catch {
    return u;
  }
}

// 1) Early redirect to the final cleaned URL (avoid flicker loops)
(function earlyRedirect() {
  try {
    const before = location.href;
    const after = cleanUrl(before);
    if (after !== before) location.replace(after);
  } catch {}
})();

// 2) Rewrite links within the page
function rewriteLinks(root = document) {
  root.querySelectorAll("a[href]").forEach((a) => {
    const raw = a.getAttribute("href");
    const cleaned = cleanUrl(raw);
    if (cleaned && cleaned !== raw) a.setAttribute("href", cleaned);
  });
}
document.addEventListener("DOMContentLoaded", () => rewriteLinks());
document.addEventListener("click", (e) => {
  const a = e.target?.closest?.("a[href]");
  if (!a) return;
  const cleaned = cleanUrl(a.href);
  if (cleaned !== a.href) a.href = cleaned;
});

// 3) Clipboard copy + canonical fetch bridge for background/popup
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "copy") {
    navigator.clipboard.writeText(msg.text).then(
      () => sendResponse({ ok: true }),
      () => sendResponse({ ok: false })
    );
    return true; // async
  }
  if (msg?.type === "getCanonical") {
    try {
      const link = document.querySelector('link[rel="canonical"]');
      sendResponse({ canonical: link?.href || location.href });
    } catch {
      sendResponse({ canonical: location.href });
    }
  }
});
