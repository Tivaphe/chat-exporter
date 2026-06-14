/* =====================================================================
   CONFIGURATION DES SITES  (la SEULE partie fragile à maintenir)
   ---------------------------------------------------------------------
   Pour réparer/ajouter un site intégré, édite ce tableau.
   (Pour AJOUTER un site sans coder, utilise plutôt la page Options de
    l'extension : tu y colles des sélecteurs CSS -> stockés comme données.)

   Chaque entrée :
     id       : identifiant court
     match    : (host) => bool            -> reconnaît le site
     subject  : (optionnel) "firstUserMessage" pour nommer le fichier
     collect  : (document, opts) => [{role, node, kind?}]
                role : "user" | "assistant"
                node : élément dont on prend le texte
                kind : "message" (défaut) | "reasoning"  (raisonnement)
                opts.includeReasoning : bool (pour décider quoi renvoyer)
   Si aucun site ne matche -> moteur GÉNÉRIQUE (voir engine.js).
   ===================================================================== */
(function (root) {
  const SITES = [
    {
      id: "chatgpt",
      match: (h) => h.includes("openai") || h.includes("chatgpt"),
      collect: (doc) =>
        [...doc.querySelectorAll("[data-message-author-role]")].map((el) => ({
          role: el.getAttribute("data-message-author-role"),
          node: el,
        })),
    },
    {
      id: "claude",
      match: (h) => h.includes("claude") || h.includes("anthropic"),
      collect: (doc) =>
        [
          ...doc.querySelectorAll(
            '[data-testid="user-message"], .font-claude-response, .font-claude-message'
          ),
        ].map((el) => {
          const isUser =
            el.getAttribute("data-testid") === "user-message" ||
            !!el.closest('[data-testid="user-message"]');
          return { role: isUser ? "user" : "assistant", node: el };
        }),
    },
    {
      id: "gemini",
      match: (h) => h.includes("gemini") || h.includes("bard"),
      collect: (doc) =>
        [...doc.querySelectorAll("user-query, model-response")].map((el) => ({
          role: el.tagName.toLowerCase() === "user-query" ? "user" : "assistant",
          node: el,
        })),
    },
    {
      id: "perplexity",
      match: (h) => h.includes("perplexity"),
      collect: (doc) =>
        [...doc.querySelectorAll('[class*="group/query"], .prose')]
          .filter((el) => !el.closest("textarea") && !el.closest("form"))
          .map((el) => ({
            role:
              (el.getAttribute("class") || "").indexOf("group/query") > -1
                ? "user"
                : "assistant",
            node: el,
          })),
    },
    {
      id: "deepseek",
      match: (h) => h.includes("deepseek"),
      collect: (doc, opts) => {
        const out = [];
        doc.querySelectorAll(".ds-message").forEach((m) => {
          let answer = null;
          m.querySelectorAll(".ds-markdown").forEach((x) => {
            if (!x.closest(".ds-think-content")) answer = x;
          });
          if (answer) {
            if (opts && opts.includeReasoning) {
              const think = m.querySelector(".ds-think-content");
              if (think) out.push({ role: "assistant", node: think, kind: "reasoning" });
            }
            out.push({ role: "assistant", node: answer, kind: "message" });
          } else {
            out.push({ role: "user", node: m, kind: "message" });
          }
        });
        return out;
      },
    },
    {
      id: "arena",
      match: (h) => h.includes("arena"),
      subject: "firstUserMessage",
      collect: (doc, opts) => {
        const out = [];
        // Messages = .prose (hors raisonnement font-mono et zone de saisie)
        [...doc.querySelectorAll(".prose")]
          .filter(
            (el) =>
              !el.closest(".font-mono") &&
              !el.closest(".tiptap") &&
              !el.closest(".ProseMirror") &&
              !el.closest("form")
          )
          .forEach((el) => {
            const isUser =
              el.closest(".bg-surface-raised") || el.closest(".items-end");
            out.push({ role: isUser ? "user" : "assistant", node: el, kind: "message" });
          });
        // Raisonnement / appels d'outils = blocs .font-mono (repliés)
        if (opts && opts.includeReasoning) {
          doc.querySelectorAll(".font-mono").forEach((el) => {
            if (el.closest("form")) return;
            out.push({ role: "assistant", node: el, kind: "reasoning" });
          });
        }
        // Remettre dans l'ordre du document
        out.sort((a, b) =>
          a.node.compareDocumentPosition(b.node) &
          (typeof Node !== "undefined" ? Node.DOCUMENT_POSITION_FOLLOWING : 4)
            ? -1
            : 1
        );
        return out;
      },
    },
  ];

  root.CHAT_SITES = SITES;
})(typeof window !== "undefined" ? window : globalThis);
