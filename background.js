/* CleanShare background
   - Context menus
   - Keyboard shortcut: copy clean (canonical-preferred) URL
   - Clipboard write performed in the content script (cross-browser safe)
*/

function cleanUrl(u) {
  try {
    const url = new URL(u);

    // Redirector resolvers
    if (url.hostname.endsWith("google.com") && (url.pathname === "/url" || url.pathname === "/imgres")) {
      const t = url.searchParams.get("url") || url.searchParams.get("q") || url.searchParams.get("imgurl");
      if (t) return cleanUrl(t);
    }
    if ((url.hostname === "l.facebook.com" || url.hostname === "lm.facebook.com") && url.pathname === "/l.php") {
      const t = url.searchParams.get("u");
      if (t) return cleanUrl(t);
    }

    // Generic case-insensitive tracker removal
    const TRACK_PARAMS = new Set([
      "gclid","gbraid","wbraid","fbclid","msclkid","yclid","igshid","gclsrc",
      "mc_cid","mc_eid","mkt_tok","sr_share","si","spm","ref","ref_src","_hsenc","_hsmi",
      "vero_id","oly_anon_id","oly_enc_id","fb_action_ids","fb_action_types","s_cid"
    ]);
    for (const key of [...url.searchParams.keys()]) {
      const low = key.toLowerCase();
      if (low.startsWith("utm_") || TRACK_PARAMS.has(low)) url.searchParams.delete(key);
    }

    // Host-specific
    const host = url.hostname;

    // Bing search => only q
    if (host.endsWith("bing.com") && url.pathname === "/search") {
      const q = url.searchParams.get("q");
      url.search = q ? new URLSearchParams({ q }).toString() : "";
    }

    // Google search => keep q (+tbm vertical)
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

    // YouTube watch => keep v, t, list, index
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

    // Amazon product page => drop all query
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

    // Fragment cleanup (#utm_*)
    if (url.hash && /utm_/i.test(url.hash)) {
      const h = new URLSearchParams(url.hash.slice(1));
      for (const k of [...h.keys()]) if (k.toLowerCase().startsWith("utm_")) h.delete(k);
      url.hash = h.toString() ? `#${h.toString()}` : "";
    }

    url.search = url.searchParams.toString();
    return url.toString();
  } catch { return u; }
}

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
