# Changelog

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
