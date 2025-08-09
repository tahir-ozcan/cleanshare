function cleanUrl(u) {
  try {
    const url = new URL(u);
    // içerikle aynı temizleyici (kısaltılmış)
    const del = k => (url.searchParams.delete(k), null);
    for (const k of [...url.searchParams.keys()]) if (k.startsWith("utm_")) del(k);
    for (const k of ["gclid","gbraid","wbraid","fbclid","mc_cid","mc_eid","igshid","yclid","gclsrc","ref","ref_src","_hsenc","_hsmi","si","spm","mkt_tok","sr_share"]) del(k);
    url.search = url.searchParams.toString();
    return url.toString();
  } catch { return u; }
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
  const raw = info.linkUrl || info.pageUrl;
  const cleaned = cleanUrl(raw);
  if (tab?.id) {
    await chrome.tabs.sendMessage(tab.id, { type: "copy", text: cleaned }).catch(() => {});
  }
});
