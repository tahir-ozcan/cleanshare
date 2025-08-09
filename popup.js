function cleanUrl(u) {
  try {
    const url = new URL(u);
    for (const k of [...url.searchParams.keys()]) {
      if (k.startsWith("utm_") || ["gclid","gbraid","wbraid","fbclid","mc_cid","mc_eid","igshid","yclid","gclsrc","ref","ref_src","_hsenc","_hsmi","si","spm","mkt_tok","sr_share"].includes(k)) {
        url.searchParams.delete(k);
      }
    }
    url.search = url.searchParams.toString();
    return url.toString();
  } catch { return u; }
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const out = document.getElementById("out");
  const url = tab?.url || "";
  out.value = cleanUrl(url);

  document.getElementById("copy").onclick = async () => {
    try { await navigator.clipboard.writeText(out.value); } catch {}
  };

  // Linkleri sonra güncelleriz (repo/donate)
  document.getElementById("repo").href = "https://github.com/tahir-ozcan/cleanshare";
  document.getElementById("donate").href = "https://your-donate-link";
}
init();
