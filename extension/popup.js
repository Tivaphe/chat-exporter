const $ = (id) => document.getElementById(id);

chrome.storage.sync.get(["format", "autoscroll", "reasoning"], (p) => {
  if (p.format) $("format").value = p.format;
  if (typeof p.autoscroll === "boolean") $("autoscroll").checked = p.autoscroll;
  if (typeof p.reasoning === "boolean") $("reasoning").checked = p.reasoning;
});

function setStatus(msg) { $("status").textContent = msg; }

async function getCustomSites() {
  return new Promise((res) =>
    chrome.storage.sync.get(["customSites"], (p) => res(p.customSites || []))
  );
}

async function inject(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["sites.js", "engine.js"],
  });
}

$("optionsLink").addEventListener("click", () => chrome.runtime.openOptionsPage());

// ---- Auto-diagnostic ----
$("diagBtn").addEventListener("click", async () => {
  setStatus("");
  const diag = $("diag");
  diag.style.display = "block";
  diag.textContent = "⏳ Analyse…";
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) { diag.textContent = "❌ Onglet introuvable."; return; }
  try {
    await inject(tab.id);
    const customSites = await getCustomSites();
    const reasoning = $("reasoning").checked;
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (opts) => window.ChatExporter.diagnose(opts),
      args: [{ customSites, includeReasoning: reasoning }],
    });
    const d = res && res.result;
    if (!d) { diag.textContent = "❌ Analyse impossible."; return; }
    let html =
      "Moteur : <b>" + d.engine + "</b><br>" +
      "Détecté : <b>" + d.total + "</b> blocs " +
      "(" + d.users + " moi, " + d.assistants + " assistant" +
      (d.reasoning ? ", " + d.reasoning + " raisonnement" : "") + ")<br>";
    if (d.total === 0) {
      html += "<br>⚠️ Rien trouvé. Ce site n'est pas reconnu — ajoute des sélecteurs via ⚙️.";
    } else {
      html += "<br>Aperçu :<br>";
      d.sample.forEach((s) => {
        html += "• <b>" + (s.kind === "reasoning" ? "💭" : s.role === "user" ? "🧑" : "🤖") +
          "</b> " + (s.preview || "").replace(/</g, "&lt;") + "…<br>";
      });
    }
    diag.innerHTML = html;
  } catch (e) {
    diag.textContent = "❌ " + e.message;
  }
});

// ---- Export ----
$("go").addEventListener("click", async () => {
  const format = $("format").value;
  const autoscroll = $("autoscroll").checked;
  const reasoning = $("reasoning").checked;
  chrome.storage.sync.set({ format, autoscroll, reasoning });

  setStatus("⏳ Extraction en cours…");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) { setStatus("❌ Onglet introuvable."); return; }

  try {
    await inject(tab.id);
    const customSites = await getCustomSites();

    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (opts) => {
        let box = document.getElementById("__chatexp_box");
        if (!box) {
          box = document.createElement("div");
          box.id = "__chatexp_box";
          box.style.cssText =
            "position:fixed;z-index:2147483647;right:16px;bottom:16px;background:#4f46e5;color:#fff;font:600 13px system-ui,sans-serif;padding:10px 14px;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.3);max-width:280px";
          document.body.appendChild(box);
        }
        box.textContent = "⏳ Préparation…";
        return window.ChatExporter.run({
          format: opts.format,
          autoscroll: opts.autoscroll,
          includeReasoning: opts.reasoning,
          customSites: opts.customSites,
          download: true,
          onProgress: (m) => { box.textContent = "⏳ " + m; },
        }).then((r) => {
          box.textContent = "✅ " + r.count + " blocs exportés !";
          setTimeout(() => box.remove(), 2500);
          return r;
        }).catch((e) => {
          box.textContent = "❌ " + e.message;
          setTimeout(() => box.remove(), 3000);
          return { error: e.message };
        });
      },
      args: [{ format, autoscroll, reasoning, customSites }],
    });

    const r = res && res.result;
    if (!r || r.error) { setStatus("❌ " + ((r && r.error) || "Échec")); return; }

    // Le téléchargement est déclenché DANS la page par le moteur (compatible Chrome + Firefox).
    if (r.downloaded) {
      setStatus("✅ " + r.count + " blocs → " + r.filename);
    } else {
      setStatus("⚠️ " + r.count + " blocs extraits, mais le téléchargement a échoué.");
    }
  } catch (e) {
    setStatus("❌ " + e.message);
  }
});
