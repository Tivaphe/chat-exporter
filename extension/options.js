const $ = (id) => document.getElementById(id);

function load() {
  chrome.storage.sync.get(["customSites"], (p) => render(p.customSites || []));
}

function save(rules, cb) {
  chrome.storage.sync.set({ customSites: rules }, cb || (() => {}));
}

function render(rules) {
  const list = $("list");
  if (!rules.length) {
    list.innerHTML = '<p class="hint">Aucune règle pour l\'instant.</p>';
    return;
  }
  list.innerHTML = "";
  rules.forEach((r, i) => {
    const div = document.createElement("div");
    div.className = "rule";
    div.innerHTML =
      "<h3>🌐 " + escapeHtml(r.hostIncludes) + "</h3>" +
      "<div class='hint'>Moi : <code>" + escapeHtml(r.userSelector || "—") + "</code><br>" +
      "Assistant : <code>" + escapeHtml(r.assistantSelector || "—") + "</code>" +
      (r.reasoningSelector ? "<br>Raisonnement : <code>" + escapeHtml(r.reasoningSelector) + "</code>" : "") +
      (r.excludeSelector ? "<br>Exclure : <code>" + escapeHtml(r.excludeSelector) + "</code>" : "") +
      "</div>";
    const btn = document.createElement("button");
    btn.className = "del";
    btn.textContent = "Supprimer";
    btn.style.marginTop = "8px";
    btn.addEventListener("click", () => {
      rules.splice(i, 1);
      save(rules, () => render(rules));
    });
    div.appendChild(btn);
    list.appendChild(div);
  });
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

$("add").addEventListener("click", () => {
  const rule = {
    id: ($("host").value || "").trim(),
    hostIncludes: ($("host").value || "").trim(),
    userSelector: ($("userSel").value || "").trim(),
    assistantSelector: ($("asstSel").value || "").trim(),
    reasoningSelector: ($("reasonSel").value || "").trim() || undefined,
    excludeSelector: ($("excludeSel").value || "").trim() || undefined,
  };
  if (!rule.hostIncludes || (!rule.userSelector && !rule.assistantSelector)) {
    $("saved").textContent = "⚠️ Domaine + au moins un sélecteur requis.";
    $("saved").style.color = "#b91c1c";
    return;
  }
  // validation basique des sélecteurs
  for (const key of ["userSelector", "assistantSelector", "reasoningSelector", "excludeSelector"]) {
    const v = rule[key];
    if (v) {
      try { document.querySelector(v); }
      catch (e) {
        $("saved").textContent = "⚠️ Sélecteur invalide : " + v;
        $("saved").style.color = "#b91c1c";
        return;
      }
    }
  }
  chrome.storage.sync.get(["customSites"], (p) => {
    const rules = p.customSites || [];
    const idx = rules.findIndex((r) => r.hostIncludes === rule.hostIncludes);
    if (idx >= 0) rules[idx] = rule; else rules.push(rule);
    save(rules, () => {
      ["host", "userSel", "asstSel", "reasonSel", "excludeSel"].forEach((id) => ($(id).value = ""));
      $("saved").textContent = "✅ Enregistré";
      $("saved").style.color = "#137a45";
      render(rules);
      setTimeout(() => ($("saved").textContent = ""), 2000);
    });
  });
});

load();
