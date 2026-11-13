/* =====================================================================
   MOTEUR D'EXTRACTION (partie STABLE, rarement à toucher)
   scroll auto + fusion anti-doublon + nettoyage + repli générique
   + sélecteurs personnalisés (données) + raisonnement optionnel
   + auto-diagnostic.
   Expose:
     window.ChatExporter.run(opts)      -> Promise<{count, filename, text, ...}>
     window.ChatExporter.diagnose(opts) -> {siteId, engine, total, users, assistants, reasoning, sample}
   ===================================================================== */
(function (root) {
  const SITES = root.CHAT_SITES || [];

  function siteName() {
    const p = location.hostname.replace(/^www\./, "").split(".");
    const skip = { chat: 1, app: 1, beta: 1, api: 1, www: 1, web: 1, console: 1, platform: 1 };
    while (p.length > 1 && skip[p[0]]) p.shift();
    return p[0] || "chat";
  }

  /* ---- Sites personnalisés (fournis par l'utilisateur via Options) ----
     Format d'une règle custom (JSON, aucune fonction = sûr) :
       { id, hostIncludes, userSelector, assistantSelector,
         reasoningSelector?, excludeSelector?, subject? }
     Convertis ici en un "site" compatible collect(). */
  function compileCustom(rule) {
    if (!rule || !rule.hostIncludes) return null;
    return {
      id: rule.id || rule.hostIncludes,
      _custom: true,
      match: (h) => h.includes(rule.hostIncludes),
      subject: rule.subject,
      collect: (doc, opts) => {
        const out = [];
        const ex = rule.excludeSelector;
        const keep = (el) => !(ex && el.closest(ex));
        if (rule.userSelector) {
          doc.querySelectorAll(rule.userSelector).forEach((el) => {
            if (keep(el)) out.push({ role: "user", node: el, kind: "message" });
          });
        }
        if (rule.assistantSelector) {
          doc.querySelectorAll(rule.assistantSelector).forEach((el) => {
            if (keep(el)) out.push({ role: "assistant", node: el, kind: "message" });
          });
        }
        if (opts && opts.includeReasoning && rule.reasoningSelector) {
          doc.querySelectorAll(rule.reasoningSelector).forEach((el) => {
            if (keep(el)) out.push({ role: "assistant", node: el, kind: "reasoning" });
          });
        }
        out.sort((a, b) =>
          a.node.compareDocumentPosition(b.node) &
          (typeof Node !== "undefined" ? Node.DOCUMENT_POSITION_FOLLOWING : 4)
            ? -1
            : 1
        );
        return out;
      },
    };
  }

  function allSites(opts) {
    const custom = ((opts && opts.customSites) || []).map(compileCustom).filter(Boolean);
    // les règles custom passent en premier (priorité à l'utilisateur)
    return custom.concat(SITES);
  }

  function matchSite(opts) {
    const h = location.hostname;
    return (
      allSites(opts).find((s) => {
        try { return s.match(h); } catch (e) { return false; }
      }) || null
    );
  }

  function roleOf(el) {
    const s = (
      (el.getAttribute("data-message-author-role") || "") + " " +
      (el.getAttribute("data-testid") || "") + " " +
      (el.getAttribute("data-role") || "") + " " +
      (el.getAttribute("data-conversation-role") || "") + " " +
      (el.getAttribute("aria-label") || "") + " " +
      (el.className || "")
    ).toLowerCase();
    if (/\buser\b|\bhuman\b|user-message|human-message/.test(s)) return "user";
    if (/assistant|\bmodel\b|response|\bbot\b|message-bubble--ai/.test(s)) return "assistant";
    return null;
  }

  function generic() {
    const sel =
      '[data-message-author-role],[data-conversation-role],[data-testid*="message"],[data-role],[class*="message-bubble"],[class*="claude-response"],[class*="claude-message"],[class*="chat-turn"],[class*="conversation-turn"],[class*="-message"],[class*="message-"]';
    const raw = [...document.querySelectorAll(sel)];
    const textOf = (n) => (n.innerText || n.textContent || "").trim();
    // 1) on ne garde que les candidats les plus externes (pas de doublon parent/enfant)
    const nodes = raw.filter((n) => {
      if (textOf(n).length < 1) return false;
      // les en-têtes de rôle ("Vous avez dit :") ne sont pas des messages
      if (n.getAttribute("data-conversation-role") !== null) return false;
      if ((n.getAttribute("role") || "") === "separator") return false;
      for (const o of raw) if (o !== n && textOf(o).length > 0 && n.contains(o)) return false;
      return true;
    });
    // 2) un même élément ne doit pas produire deux blocs
    const out = [];
    let expect = "user";
    nodes.forEach((n) => {
      const r = roleOf(n) || expect;
      expect = r === "user" ? "assistant" : "user";
      out.push({ role: r, node: n, kind: "message" });
    });
    return out;
  }

  // Renvoie {blocks, engine} : 'engine' = id du site, 'custom', ou 'generic'
  function getBlocksInfo(opts) {
    const site = matchSite(opts);
    if (site) {
      try {
        const b = site.collect(document, opts) || [];
        if (b.filter((x) => (x.node.innerText || x.node.textContent || "").trim()).length >= 1)
          return { blocks: b, engine: site._custom ? "custom:" + site.id : site.id, site };
      } catch (e) { /* fallback */ }
    }
    return { blocks: generic(), engine: "generic", site: null };
  }

  const LABELS = [
    /^vous avez dit\s*:?\.?$/i,
    /^you said\s*:?\.?$/i,
    /^(gemini|chatgpt|claude|grok|qwen|mistral|le chat|copilot|deepseek) (a dit|said)\s*:?\.?$/i,
  ];

  function clean(node, extra) {
    const c = node.cloneNode(true);
    if (c.querySelectorAll) {
      // boutons d'action et icônes (jamais de texte utile dedans)
      c.querySelectorAll("button, svg, style, script").forEach((b) => b.remove());
    }
    let t = c.innerText || c.textContent || "";
    t = t.replace(/\u00a0/g, " ");
    const lines = t.split("\n").filter((line) => {
      const L = line.trim();
      return !LABELS.some((re) => re.test(L));
    });
    const body = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    // éléments joints au message (pièces jointes, cartes…) détectés par le site
    const pre = (extra || []).map((e) => (e || "").trim()).filter(Boolean);
    return pre.length ? pre.join("\n") + "\n" + body : body;
  }

  function captureKeyed(opts) {
    const out = [];
    getBlocksInfo(opts).blocks.forEach((b) => {
      const kind = b.kind || "message";
      const content = clean(b.node, b.extra);
      if (!content) return;
      out.push({ role: b.role, kind, content, k: b.role + "\u0001" + kind + "\u0001" + content });
    });
    return out;
  }

  function merge(acc, cur) {
    if (acc.length === 0) return cur.slice();
    if (cur.length === 0) return acc;
    const maxK = Math.min(acc.length, cur.length);
    for (let k = maxK; k >= 1; k--) {
      let ok = true;
      for (let i = 0; i < k; i++) {
        if (acc[acc.length - k + i].k !== cur[i].k) { ok = false; break; }
      }
      if (ok) return acc.concat(cur.slice(k));
    }
    return acc.concat(cur);
  }

  function slug(s) {
    return (
      (s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "discussion"
    );
  }

  function getScroller(sample) {
    let n = sample;
    while (n && n !== document.body && n !== document.documentElement) {
      try {
        const st = getComputedStyle(n);
        if (/(auto|scroll)/.test(st.overflowY) && n.scrollHeight > n.clientHeight + 40) return n;
      } catch (e) {}
      n = n.parentElement;
    }
    return document.scrollingElement || document.documentElement;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---- Téléchargement DANS la page (compatible Chrome ET Firefox) ----
  function downloadInPage(text, filename, mime) {
    try {
      const blob = new Blob([text], { type: (mime || "text/plain") + ";charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      return true;
    } catch (e) {
      return false;
    }
  }

  // ---- AUTO-DIAGNOSTIC : que voit l'extension sur cette page ? ----
  function diagnose(opts) {
    opts = opts || {};
    const info = getBlocksInfo(opts);
    const caps = [];
    info.blocks.forEach((b) => {
      const content = clean(b.node, b.extra);
      if (content) caps.push({ role: b.role, kind: b.kind || "message", content });
    });
    const users = caps.filter((c) => c.role === "user").length;
    const reasoning = caps.filter((c) => c.kind === "reasoning").length;
    const assistants = caps.filter((c) => c.role === "assistant" && c.kind !== "reasoning").length;
    return {
      siteId: info.engine,
      engine: info.engine,
      host: location.hostname,
      total: caps.length,
      users,
      assistants,
      reasoning,
      sample: caps.slice(0, 4).map((c) => ({
        role: c.role,
        kind: c.kind,
        preview: c.content.slice(0, 80).replace(/\s+/g, " "),
      })),
    };
  }

  async function run(opts) {
    opts = opts || {};
    const onProgress = opts.onProgress || function () {};
    const includeReasoning = !!opts.includeReasoning;
    const info0 = getBlocksInfo(opts);
    const engine = info0.engine;
    const site = info0.site;

    let first = captureKeyed(opts);
    if (first.length === 0) throw new Error("Aucun message détecté sur cette page.");

    let acc = [];
    if (opts.autoscroll !== false) {
      const scroller = getScroller((info0.blocks[0] && info0.blocks[0].node) || document.body);
      const prevScroll = scroller.scrollTop;
      onProgress("Remontée en haut…", 0);
      for (let i = 0; i < 40; i++) {
        scroller.scrollTop = 0;
        await sleep(120);
        if (scroller.scrollTop === 0) break;
      }
      await sleep(300);
      const step = Math.max(250, (scroller.clientHeight || 600) * 0.7);
      let prevTop = -1, same = 0;
      const start = Date.now();
      while (true) {
        acc = merge(acc, captureKeyed(opts));
        onProgress("Lecture… " + acc.length + " messages", acc.length);
        const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 5;
        if (atBottom) {
          await sleep(300);
          acc = merge(acc, captureKeyed(opts));
          break;
        }
        scroller.scrollTop = scroller.scrollTop + step;
        await sleep(opts.delay || 300);
        if (scroller.scrollTop === prevTop) {
          if (++same >= 3) break;
        } else same = 0;
        prevTop = scroller.scrollTop;
        if (Date.now() - start > (opts.timeout || 90000)) break;
      }
      try { scroller.scrollTop = prevScroll; } catch (e) {}
    } else {
      acc = first;
    }

    // filtrage raisonnement (si non voulu) + dé-doublonnage consécutif
    const cleaned = [];
    acc.forEach((b) => {
      if (b.kind === "reasoning" && !includeReasoning) return;
      const last = cleaned[cleaned.length - 1];
      if (last && last.role === b.role && last.kind === b.kind && last.content === b.content) return;
      cleaned.push({ role: b.role, kind: b.kind, content: b.content });
    });
    if (cleaned.length === 0) throw new Error("Discussion vide.");

    const name = siteName();
    const fmt = opts.format || "txt";
    const labelTxt = (b) =>
      b.kind === "reasoning"
        ? "RAISONNEMENT"
        : b.role === "user"
        ? "MOI"
        : "ASSISTANT";

    let text, ext;
    if (fmt === "md") {
      ext = "md";
      text =
        "# Discussion (" + name + ")\n\n" +
        "> Source : " + location.href + "  \n> Date : " + new Date().toLocaleString() + "\n\n---\n\n";
      cleaned.forEach((b) => {
        const h =
          b.kind === "reasoning"
            ? "#### 💭 Raisonnement\n\n"
            : b.role === "user"
            ? "### 🧑 Moi\n\n"
            : "### 🤖 Assistant\n\n";
        text += h + b.content + "\n\n";
      });
    } else if (fmt === "json") {
      ext = "json";
      text = JSON.stringify(
        { site: name, url: location.href, date: new Date().toISOString(), messages: cleaned },
        null,
        2
      );
    } else {
      ext = "txt";
      text =
        "Discussion extraite de : " + location.href + "\n" +
        "Site : " + name + "\n" +
        "Date d'extraction : " + new Date().toLocaleString() + "\n" +
        "Nombre de blocs : " + cleaned.length + "\n" +
        "============================================================\n\n";
      cleaned.forEach((b) => {
        text += "===== " + labelTxt(b) + " =====\n" + b.content + "\n\n";
      });
    }

    let subject = "";
    const wantFirst = site && site.subject === "firstUserMessage";
    if (!wantFirst) {
      subject = (document.title || "").replace(
        /\s*[-|\u2013]\s*(ChatGPT|Claude|Gemini|Grok|Qwen|Mistral|Le Chat|Perplexity|Copilot|DeepSeek|Arena).*$/i,
        ""
      ).trim();
    }
    if (!subject || subject.length < 3) {
      const fu = cleaned.find((b) => b.role === "user");
      subject = fu ? fu.content : cleaned[0].content;
    }
    const filename = name + "_" + slug(subject) + "." + ext;
    const mime =
      ext === "json"
        ? "application/json"
        : ext === "md"
        ? "text/markdown"
        : "text/plain";

    let downloaded = false;
    if (opts.download !== false) {
      downloaded = downloadInPage(text, filename, mime);
    }

    return { count: cleaned.length, filename, text, engine, format: fmt, mime, downloaded };
  }

  root.ChatExporter = { run, diagnose };
})(typeof window !== "undefined" ? window : globalThis);
