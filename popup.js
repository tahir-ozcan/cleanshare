// Lightweight cleaner for showing a "cleaned" URL in the popup
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

const status = (msg, ok = true) => {
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
    const res = await chrome.tabs.sendMessage(tabId, { type: "getCanonical" });
    return res?.canonical;
  } catch {
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

// Güvenilir sekme açma yardımcıları (Chrome/Edge/Firefox uyumlu)
function openUrlInNewTab(url) {
  try {
    if (chrome?.tabs?.create) {
      chrome.tabs.create({ url });
    } else if (typeof browser !== "undefined" && browser?.tabs?.create) {
      browser.tabs.create({ url });
    } else {
      window.open(url, "_blank", "noopener");
    }
  } catch {
    window.open(url, "_blank", "noopener");
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

  // Link tıklamalarını API ile açarak tüm tarayıcılarda garanti altına al
  document.getElementById("donate").addEventListener("click", (e) => {
    e.preventDefault();
    openUrlInNewTab("https://www.patreon.com/tahirozcan");
  });
  document.getElementById("repo").addEventListener("click", (e) => {
    e.preventDefault();
    openUrlInNewTab("https://github.com/tahir-ozcan/cleanshare");
  });
}

init();
