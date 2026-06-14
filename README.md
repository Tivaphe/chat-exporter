<div align="center">

<img src="extension/icons/icon128.png" width="96" height="96" alt="Chat Exporter" />

# 📥 Chat Exporter

**Exporte n'importe quelle discussion avec un LLM en fichier `.txt`, `.md` ou `.json`.**

Testé sur ChatGPT, Claude, Gemini, Perplexity, DeepSeek, Arena, Grok et Qwen,
avec un **mode générique** qui tente de gérer les autres. Avec **scroll automatique** pour tout charger.

[Extension](#-extension-recommandé) · [Bookmarklet](#-bookmarklet-sans-installation) · [Maintenance](#️-maintenance) · [Confidentialité](#-confidentialité)

</div>

---

## ✨ Fonctionnalités

- 🌐 **Compatible Chrome ET Firefox** : une seule extension (Manifest V3).
- 🔌 **Multi-sites testés** : ChatGPT, Claude, Gemini, Perplexity, DeepSeek, Arena, Grok, Qwen (+ mode générique pour tenter les autres).
- 🧾 **3 formats** : texte brut (`.txt`), Markdown (`.md`), JSON structuré (`.json`).
- 🔄 **Scroll automatique** : charge tous les messages, même sur les listes « virtualisées » (DeepSeek).
- 👤🤖 **Séparation claire** entre tes messages (`MOI`) et ceux de l'assistant (`ASSISTANT`).
- 💭 **Raisonnement optionnel** : inclure/exclure les blocs de réflexion et appels d'outils.
- 🔍 **Auto-diagnostic** : un bouton qui dit ce que l'extension détecte sur la page.
- ⚙️ **Sélecteurs personnalisés** : ajoute un site **sans coder** (page Options).
- 🔒 **100 % local** : aucune donnée n'est envoyée sur un serveur.

---

## ✅ Sites testés

| Site | Support |
|---|---|
| ChatGPT | ✅ Dédié |
| Claude | ✅ Dédié |
| Gemini | ✅ Dédié |
| Perplexity | ✅ Dédié |
| DeepSeek | ✅ Dédié (raisonnement séparable) |
| Arena | ✅ Dédié (raisonnement séparable) |
| Grok | ✅ via mode générique |
| Qwen | ✅ via mode générique |
| Autres | ⚙️ Non testés — le mode générique peut fonctionner, sinon ajoute des sélecteurs (page Options) |

> Seuls les 8 sites ci-dessus ont été testés. Pour un autre site, essaie : si ça ne marche pas, le mode générique ou les **sélecteurs personnalisés** prennent le relais.

## 🧩 Extension (recommandé)

**Chrome / Brave / Edge :**
1. Télécharge / clone ce dépôt.
2. Ouvre `chrome://extensions` (ou `brave://extensions`, `edge://extensions`).
3. Active le **Mode développeur**.
4. **« Charger l'extension non empaquetée »** → choisis le dossier [`extension/`](extension/).

**Firefox :**
1. Ouvre `about:debugging#/runtime/this-firefox`.
2. **« Charger un module complémentaire temporaire… »** → choisis [`extension/manifest.json`](extension/manifest.json).

Puis : va sur ta discussion, clique l'icône 📥, choisis le format, **Exporter**.

📖 Détails complets (Firefox permanent, diagnostic, sélecteurs custom…) : [`extension/README.md`](extension/README.md).

---

## 🔖 Bookmarklet (sans installation)

Si tu ne veux pas installer d'extension :

1. Ouvre [`bookmarklet.txt`](bookmarklet.txt) et copie tout son contenu.
2. Crée un favori, colle ce contenu dans le champ **URL** (il commence par `javascript:`).
3. Sur ta discussion, clique le favori → le `.txt` se télécharge.

> Version console lisible (commentée) : [`extract-chat.js`](extract-chat.js).

---

## 🛠️ Maintenance

Les interfaces des sites changent souvent. L'architecture isole donc le **fragile** du **stable** :

| Fichier | Rôle |
|---|---|
| [`extension/sites.js`](extension/sites.js) | Sélecteurs des sites intégrés (à éditer si un site change) |
| [`extension/engine.js`](extension/engine.js) | Scroll, fusion, nettoyage, formats, diagnostic (stable) |
| `popup.*` / `options.*` | Interface + sites personnalisés |

💡 **Le plus souvent, pas besoin de coder** : si un site casse, ouvre la page **Options**
de l'extension et ajoute ses sélecteurs CSS. Voir le guide dans
[`extension/README.md`](extension/README.md#️-maintenance--pourquoi-cest-conçu-pour-durer).

---

## 🔒 Confidentialité

- Tout s'exécute **dans ton navigateur**. Aucune requête réseau, aucun tracking.
- Le code ne contient **que des sélecteurs techniques**, jamais de contenu de discussion.

---

## 🤝 Contribuer

Un site mal géré ? Ouvre une *issue* avec : le nom du site, et idéalement les
sélecteurs CSS d'un message utilisateur et d'un message assistant
(`F12` → inspecter). Les PR sur [`extension/sites.js`](extension/sites.js) sont bienvenues.

## 📄 Licence

[MIT](LICENSE) — libre d'utilisation, modification et partage.
