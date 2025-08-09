const TRACK_PARAMS = new Set([
  "utm_source","utm_medium","utm_campaign","utm_term","utm_content",
  "gclid","gbraid","wbraid","fbclid","mc_cid","mc_eid","igshid",
  "yclid","gclsrc","ref","ref_src","_hsenc","_hsmi","si","spm",
  "mkt_tok","sr_share"
]);

function cleanUrl(u) {
  try {
    const url = new URL(u);
    // Google/Facebook redirect patternlerini doğrudan çözüyoruz
    if (url.hostname.endsWith("google.com") && (url.pathname === "/url" || url.pathname === "/imgres")) {
      const t = url.searchParams.get("url") || url.searchParams.get("q") || url.searchParams.get("imgurl");
      if (t) return cleanUrl(t);
    }
    if ((url.hostname === "l.facebook.com" || url.hostname === "lm.facebook.com") && url.pathname === "/l.php") {
      const t = url.searchParams.get("u");
      if (t) return cleanUrl(t);
    }
    // İzleme parametrelerini sil
    for (const key of [...url.searchParams.keys()]) {
      if (TRACK_PARAMS.has(key) || key.startsWith("utm_")) url.searchParams.delete(key);
    }
    // Boş query ise '?' kaldır
    url.search = url.searchParams.toString();
    return url.toString();
  } catch { return u; }
}

// 1) Yönlendirme sayfasında doğrudan hedefe atla
(function earlyRedirect(){
  try {
    const here = new URL(location.href);
    const before = here.toString();
    const after = cleanUrl(before);
    if (after !== before) location.replace(after);
  } catch {}
})();

// 2) Sayfadaki linkleri temize çek
function rewriteLinks(root = document) {
  root.querySelectorAll("a[href]").forEach(a => {
    const cleaned = cleanUrl(a.getAttribute("href"));
    if (cleaned !== a.href) a.setAttribute("href", cleaned);
  });
}
document.addEventListener("DOMContentLoaded", () => rewriteLinks());
document.addEventListener("click", (e) => {
  // Yakalanan tıklamalarda son bir temizlik
  const a = e.target.closest("a[href]");
  if (!a) return;
  const cleaned = cleanUrl(a.href);
  if (cleaned !== a.href) a.href = cleaned;
});

// Arka planın 'copyClean' isteğine yanıt
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "copy") {
    navigator.clipboard.writeText(msg.text).then(() => sendResponse({ ok: true }));
    return true; // async
  }
});
