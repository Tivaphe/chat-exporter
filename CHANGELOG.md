# Changelog

## [1.0.1] — 2026-11-13

### Corrigé
- **ChatGPT : nouvelle interface (2026)** — l'attribut `data-message-author-role`
  a disparu du DOM, l'export ne trouvait plus aucun message. Le collecteur ChatGPT
  gère maintenant **trois générations** de markup :
  - unités `data-chatgpt-search-unit-key` / `data-content-search-unit-key`
    avec `data-user-message-bubble` (messages utilisateur) et
    `data-response-body` (réponses de l'assistant) ;
  - en-têtes `data-conversation-role="user|assistant"` (interface précédente) ;
  - ancien attribut `data-message-author-role` (repli, toujours supporté).
- **Pièces jointes ChatGPT** : les cartes de fichiers (`.group/resource-card`,
  ex. `Texte collé(5).txt`) sont détectées et placées **avant** le message
  du même tour, au lieu d'être perdues ou dupliquées.
- **En-têtes de rôle** (« Vous avez dit : », « ChatGPT a dit : ») exclus du texte
  exporté dans tous les formats, y compris via le mode générique.

### Amélioré
- Mode générique : plus de faux doublons (un conteneur et son enfant qui matchent
  tous les deux ne produisent plus deux blocs) et reconnaissance de
  `data-conversation-role` pour nommer les rôles.
- `bookmarklet.txt` régénéré à partir de `extract-chat.js` (les deux versions
  restent synchronisées).

## [1.0.0] — 2026-06-14

### Ajouté
- Extension navigateur (Manifest V3) **compatible Chrome / Brave / Edge ET Firefox**
  (téléchargement effectué dans la page, `browser_specific_settings` pour Firefox).
- Support intégré : ChatGPT, Claude, Gemini, Perplexity, DeepSeek, Arena.
- Testé aussi via le mode générique : Grok, Qwen.
- Mode générique avec détection des rôles par alternance pour les autres sites (non testés).
- **Scroll automatique** avec fusion anti-doublon (gère les listes virtualisées).
- **3 formats** d'export : `.txt`, `.md`, `.json`.
- **Auto-diagnostic** (« Tester cette page »).
- **Sélecteurs personnalisés** via la page Options (ajout de site sans coder).
- Option **inclure/exclure le raisonnement** et les appels d'outils.
- Bookmarklet et script console équivalents.

### Corrigé
- L'export `.md` et `.json` sortait en `.txt` (type MIME forcé) → type correct par format.

### Modifié
- Téléchargement déplacé du *service worker* vers la page (Blob + ancre), pour une
  compatibilité Chrome/Firefox identique. Suppression de `background.js` et de la
  permission `downloads` (moins de permissions demandées).
