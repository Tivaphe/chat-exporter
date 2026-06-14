# 📥 Chat Exporter — Extension navigateur

Exporte la discussion LLM ouverte (ChatGPT, Claude, Gemini, Perplexity, DeepSeek,
Grok, Qwen, Arena + mode générique) en **.txt / .md / .json**, avec
**scroll automatique** pour charger tous les messages.

---

> ✅ **Une seule extension, compatible Chrome ET Firefox** (Manifest V3).

## 🚀 Installation sur Chrome / Brave / Edge

1. Ouvre `chrome://extensions` (ou `brave://extensions`, `edge://extensions`).
2. Active le **Mode développeur** (en haut à droite).
3. Clique **« Charger l'extension non empaquetée »**.
4. Sélectionne le dossier **`extension/`**.
5. L'icône 📥 apparaît dans la barre d'outils. Épingle-la si tu veux.

## 🦊 Installation sur Firefox

1. Ouvre `about:debugging#/runtime/this-firefox`.
2. Clique **« Charger un module complémentaire temporaire… »**.
3. Sélectionne le fichier **`extension/manifest.json`**.
4. L'icône 📥 apparaît. (Chargement temporaire = disparaît au redémarrage de Firefox ;
   pour un usage permanent, il faut signer l'extension via [addons.mozilla.org](https://addons.mozilla.org).)

### Utilisation
1. Va sur ta discussion (n'importe quel LLM).
2. Clique l'icône 📥 → choisis le **format**, le **scroll auto**, et si tu veux
   **inclure le raisonnement / appels d'outils** → **Exporter**.
3. Un indicateur en bas à droite montre la progression, puis le fichier se télécharge.

### 🔍 Auto-diagnostic (« Tester cette page »)
Le bouton **« 🔍 Tester cette page »** te dit, sans rien télécharger :
- quel **moteur** est utilisé (`claude`, `arena`, `custom:...` ou `generic`),
- combien de blocs sont détectés (moi / assistant / raisonnement),
- un **aperçu** des premiers messages.
Idéal pour repérer en 2 s si un site a changé et casse l'extraction.

### 💭 Raisonnement / appels d'outils
La case **« Inclure le raisonnement »** ajoute les blocs de réflexion (DeepSeek
`ds-think-content`, Arena blocs `font-mono`, etc.), marqués `===== RAISONNEMENT =====`.
Décochée (défaut) = seulement les vrais messages. Les messages multiples consécutifs
de l'assistant (vrais messages) sont **toujours préservés**.

### ⚙️ Ajouter un site sans coder (sélecteurs personnalisés)
Page **Options** (lien dans le popup, ou clic droit sur l'icône → Options) :
indique un bout du **domaine** + des **sélecteurs CSS** pour tes messages et ceux
de l'assistant (et, en option, raisonnement / éléments à exclure). C'est stocké
comme **données** (pas de code) et **prioritaire** sur les sites intégrés — pratique
pour réparer un site cassé en attendant une mise à jour.

---

## 🛠️ Maintenance : pourquoi c'est conçu pour durer

Le risque (tu l'as bien vu) : **les sites changent leur HTML** et un sélecteur casse.
L'architecture sépare donc le **fragile** du **stable** :

| Fichier | Rôle | Fréquence de modif |
|---|---|---|
| **`sites.js`** | Sélecteurs des sites intégrés (la partie fragile) | À éditer quand un site change |
| `engine.js` | Scroll auto, fusion, nettoyage, formats, raisonnement, diagnostic, repli générique | Rarement |
| `popup.*`, `options.*` | UI, sites personnalisés (le téléchargement se fait dans `engine.js`) | Quasi jamais |

> 💡 **Le plus souvent, tu n'as même pas à toucher au code** : si un site casse, ouvre
> la page **Options** et ajoute/corrige ses sélecteurs CSS (stockés comme données).
> Édite `sites.js` seulement pour intégrer durablement un site dans l'extension.

### Réparer un site cassé = éditer UNE entrée dans `sites.js`
Chaque site est un objet :
```js
{
  id: "monsite",
  match: (h) => h.includes("monsite"),     // reconnaît le domaine
  collect: (doc) => [ {role:"user"|"assistant", node} , ... ],
  subject: "firstUserMessage"              // (optionnel) nom du fichier
}
```
Pour trouver les bons sélecteurs : ouvre la discussion, `F12`, inspecte un message
utilisateur et un message assistant, repère un attribut/classe stable, mets-le dans
`collect`. Si aucun site ne matche, le **moteur générique** prend le relais
(détection des rôles par attributs, sinon par alternance).

### Filet de sécurité
- Si `collect` plante ou ne renvoie rien → bascule automatique sur le générique.
- Dé-doublonnage par chevauchement (sûr pour les listes virtualisées).
- Exclusions (blocs de raisonnement, zone de saisie) gérées par site.

---

## ✅ Sites testés
Support dédié : ChatGPT · Claude · Gemini · Perplexity · DeepSeek · Arena.
Via mode générique : Grok · Qwen.
(Aucun autre site n'a été testé pour l'instant — le générique ou les sélecteurs personnalisés peuvent aider.)

🔒 100 % local : rien n'est envoyé sur un serveur.
