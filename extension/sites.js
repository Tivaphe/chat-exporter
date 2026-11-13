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
     collect  : (document, opts) => [{role, node, kind?, extra?}]
                role  : "user" | "assistant"
                node  : élément dont on prend le texte
                kind  : "message" (défaut) | "reasoning"  (raisonnement)
                extra : (optionnel) textes placés AVANT le message (pièces jointes)
                opts.includeReasoning : bool (pour décider quoi renvoyer)
   Si aucun site ne matche -> moteur GÉNÉRIQUE (voir engine.js).
   ===================================================================== */
(function (root) {
  const SITES = [
    {
      id: "chatgpt",
      match: (h) => h.includes("openai") || h.includes("chatgpt"),
      collect: (doc) => {
        const out = [];
        const seen = new Set();
        const nearest = (el, sel) => (el && el.closest ? el.closest(sel) : null);

        // 1) Pièces jointes / cartes de fichiers de l'interface actuelle
        //    (affichées dans un conteneur distinct du message) : on retient
        //    leur nom pour le placer AU-DESSUS du message du même tour.
        const cards = new Map(); // tour -> [textes]
        doc.querySelectorAll(".group\\/resource-card").forEach((card) => {
          const turn =
            nearest(card, "[data-turn-key], [data-content-search-turn-key]") || card.parentElement;
          const clone = card.cloneNode(true);
          clone.querySelectorAll("button, svg").forEach((e) => e.remove());
          const text = (clone.textContent || "").replace(/\s+/g, " ").trim();
          if (!turn || !text) return;
          if (nearest(card, "[data-response-body]")) return; // jamais dans une réponse IA
          if (!cards.has(turn)) cards.set(turn, []);
          cards.get(turn).push(text);
        });

        // 2) Messages : chaque message est un "bloc" = la bulle utilisateur
        //    (data-user-message-bubble) ou le corps de la réponse IA
        //    (data-response-body, le plus externe).
        const userUnitsInTurn = new Map();
        doc
          .querySelectorAll("[data-chatgpt-search-unit-key], [data-content-search-unit-key]")
          .forEach((unit) => {
            const bubble = unit.querySelector("[data-user-message-bubble]");
            if (!bubble) return;
            const turn = nearest(unit, "[data-turn-key], [data-content-search-turn-key]") || unit;
            if (!userUnitsInTurn.has(turn)) userUnitsInTurn.set(turn, []);
            userUnitsInTurn.get(turn).push(bubble);
          });

        const addBlock = (role, node, extra) => {
          if (!node || seen.has(node)) return;
          seen.add(node);
          const block = { role, node, kind: "message" };
          const ex = (extra || []).filter(Boolean);
          if (ex.length) block.extra = ex;
          out.push(block);
        };

        const addUserBubble = (bubble, unit) => {
          const turn = nearest(unit, "[data-turn-key], [data-content-search-turn-key]") || unit;
          const siblings = userUnitsInTurn.get(turn) || [];
          const isFirst = siblings[0] === bubble; // les pièces jointes précèdent le texte
          addBlock("user", bubble, isFirst ? cards.get(turn) || [] : []);
        };

        /* --- Interface actuelle (unités de conversation) ------------------
           <div data-chatgpt-search-unit-key="…:0:user">
             <div data-user-message-bubble="true">texte</div>
           <div data-chatgpt-search-unit-key="…:2:assistant">
             <div data-response-body="…">réponse markdown</div> */
        doc
          .querySelectorAll("[data-chatgpt-search-unit-key], [data-content-search-unit-key]")
          .forEach((unit) => {
            const bubble = unit.querySelector("[data-user-message-bubble]");
            if (bubble) return addUserBubble(bubble, unit);
            const body = unit.querySelector("[data-response-body]");
            if (body) {
              if (body.parentElement && nearest(body.parentElement, "[data-response-body]")) return;
              return addBlock("assistant", body);
            }
            const key =
              unit.getAttribute("data-chatgpt-search-unit-key") ||
              unit.getAttribute("data-content-search-unit-key") ||
              "";
            const hint = (key.split(":").pop() || "").toLowerCase();
            if (hint === "user" || hint === "assistant") addBlock(hint, unit);
          });

        /* --- Interface précédente ----------------------------------------
           <h4 data-conversation-role="user">Vous avez dit :</h4>
           puis le contenu (bulle ou corps de réponse) en frère suivant. */
        doc.querySelectorAll("[data-conversation-role]").forEach((h) => {
          const role = (h.getAttribute("data-conversation-role") || "").toLowerCase();
          if (role !== "user" && role !== "assistant") return;

          const pick = (root) => {
            if (!root) return null;
            if (role === "user") {
              const b = root.querySelector("[data-user-message-bubble]");
              if (b) return b;
              return root.querySelector(".whitespace-pre-wrap");
            }
            const b = root.querySelector("[data-response-body]");
            return b && !seen.has(b) ? b : null;
          };

          let node = pick(h.parentElement);
          for (let k = 0, n = h.parentElement; !node && n && k < 3; k++, n = n.parentElement) {
            node = pick(n);
          }
          if (role === "user" && node && node.getAttribute("data-user-message-bubble") !== null) {
            const turn = nearest(node, "[data-turn-key]") || h.parentElement;
            const extra = cards.get(nearest(h.parentElement, "[data-chatgpt-search-unit-key]")) || cards.get(turn) || [];
            return addBlock("user", node, extra);
          }
          addBlock(role, node);
        });

        /* --- Ancienne interface ------------------------------------------ */
        doc.querySelectorAll("[data-message-author-role]").forEach((el) => {
          const role = (el.getAttribute("data-message-author-role") || "").toLowerCase();
          if (role) addBlock(role, el);
        });

        /* --- Pièces jointes sans message (message = fichier seul) --------- */
        cards.forEach((list, turn) => {
          const hasBubble = (userUnitsInTurn.get(turn) || []).length > 0;
          if (hasBubble) return;
          const card = turn.querySelector && turn.querySelector(".group\\/resource-card");
          if (!card || seen.has(card)) return;
          seen.add(card);
          out.push({ role: "user", node: card, kind: "message", extra: list });
        });

        // Ordre du document (les entrées ci-dessus se recoupent parfois)
        return out.sort((a, b) => {
          if (a.node === b.node) return 0;
          return a.node.compareDocumentPosition(b.node) &
            (typeof Node !== "undefined" ? Node.DOCUMENT_POSITION_FOLLOWING : 4)
            ? -1
            : 1;
        });
      },
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
