// Small shared cleaner (kept in popup too for user-visible output)
function cleanUrl(u) {
  try {
    const url = new URL(u);
    const TRACK_PARAMS = new Set([
      "gclid","gbraid","wbraid","fbclid","msclkid","yclid","igshid","gclsrc",
      "mc_cid","mc_eid","mkt_tok","sr_share","si","spm","ref","ref_src","_hsenc","_hsmi"
    ]);
    for (const k of [...url.searchParams.keys()]) {
      const low = k.toLowerCase();
      if (low.startsWith("utm_") || TRACK_PARAMS.has(low)) url.searchParams.delete(k);
    }
    // Host-specific quick rules kept minimal in popup:
    if (url.hostname.endsWith("bing.com") && url.pathname === "/search") {
      const q = url.searchParams.get("q");
      url.search = q ? new URLSearchParams({ q }).toString() : "";
    }
    if (url.hostname.endsWith("google.com") && url.pathname === "/search") {
      const q = url.searchParams.get("q") || "";
      const tbm = url.searchParams.get("tbm");
      const kept = new URLSearchParams();
      if (q) kept.set("q", q);
      if (tbm) kept.set("tbm", tbm);
      url.search = kept.toString();
    }
    if (/\.amazon\./.test(url.hostname) && (url.pathname.includes("/dp/") || url.pathname.includes("/gp/product/"))) {
      url.search = "";
    }
    url.search = url.searchParams.toString();
    return url.toString();
  } catch { return u; }
}

const status = (msg, ok=true) => {
  const el = document.getElementById("status");
  el.textContent = msg || "";
  el.className = "status " + (ok ? "ok" : "err");
};

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function getCanonicalFromTab(tabId) {
  try {
    // ask content script first (faster if already injected)
    const res = await chrome.tabs.sendMessage(tabId, { type: "getCanonical" });
    return res?.canonical;
  } catch {
    // fallback: inject function
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const link = document.querySelector('link[rel="canonical"]');
        return link?.href || location.href;
      }
    });
    return result;
  }
}

async function init() {
  const tab = await getActiveTab();
  const out = document.getElementById("out");
  const url = tab?.url || "";
  out.value = cleanUrl(url);

  document.getElementById("copy").onclick = async () => {
    try {
      await navigator.clipboard.writeText(out.value);
      status("Copied.");
    } catch {
      status("Copy failed.", false);
    }
  };

  document.getElementById("copy-canonical").onclick = async () => {
    try {
      const canonical = await getCanonicalFromTab(tab.id);
      const cleaned = cleanUrl(canonical || url);
      await navigator.clipboard.writeText(cleaned);
      status("Canonical copied.");
    } catch {
      status("Could not read canonical.", false);
    }
  };

  document.getElementById("repo").href = "https://github.com/tahir-ozcan/cleanshare";
  document.getElementById("donate").href = "https://github.com/patreon/tahirozcan";
}

init();
