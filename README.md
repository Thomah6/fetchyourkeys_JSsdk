# 🔑 FetchYourKeys SDK

Le SDK officiel pour interagir en lecture seule avec l'API FetchYourKeys. Gérez facilement vos clés API en toute sécurité depuis votre application backend.

## 📦 Installation

```bash
npm install fetchyourkeys
```

## 🚀 Utilisation Rapide

### Initialisation

```javascript
// CommonJS
const FetchYourKeys = require("fetchyourkeys");
const fyk = new FetchYourKeys({
  apiKey: process.env.FYK_SECRET_KEY,
});
// ou en ES modules
import FetchYourKeys from "fetchyourkeys";
const fyk = new FetchYourKeys({
  apiKey: process.env.FYK_SECRET_KEY,
});
```

### Configuration

Configurez via variable d'environnement `FYK_SECRET_KEY` (recommandé pour la sécurité).

## 📚 API Référence (Lecture Seule)

Le SDK fournit uniquement des méthodes de lecture. Pour les opérations d'écriture (ajout, suppression, mise à jour), utilisez le package compagnon `fetchyourkeys-cli`.

### `fyk.get(label)`
Récupère une clé par son label.

```javascript
const stripeKey = await fyk.get('stripe-production');
```

### `fyk.getAll()`
Récupère toutes les clés disponibles.

```javascript
const allKeys = await fyk.getAll();
```

## 🔄 Stratégie de Cache

🚀 **Cache au Démarrage : Set and Forget**
Au lancement de votre application, le SDK FetchYourKeys charge toutes vos clés API en mémoire une fois pour toutes. **À chaque démarrage du serveur backend, il recharge automatiquement les clés depuis l'API et écrase le cache précédent pour synchroniser avec les mises à jour potentielles.**

Pendant l'exécution, chaque appel pour récupérer une clé est instantané - nous puisons directement dans le cache mémoire sans aucun appel réseau. Vos endpoints répondent en quelques millisecondes, même sous forte charge.

🌐 **Résilience Hors Ligne** : Votre application continue de fonctionner même si notre service est temporairement indisponible.

🔄 **Quand les Clés Changent-elles ?** : Les clés API changent rarement ; cette approche s'aligne sur les cycles de déploiement.

## 🔒 Sécurité

- Toutes les communications sont chiffrées en HTTPS.
- Les clés sont stockées de manière sécurisée côté serveur FetchYourKeys.
- **Stockage Runtime** : Les clés récupérées sont conservées en mémoire (RAM) du serveur backend pour le cache. Pas de persistance disque, réduisant les risques de fuite statique. Vulnérabilités potentielles si le serveur est compromise (ex. : dumps mémoire) ; mitigez avec une infrastructure sécurisée (conteneurs, accès restreints).
- Variable d'environnement `FYK_SECRET_KEY` pour éviter les hardcodages.

## 🌐 Compatibilité

- Node.js 14+
- Navigateurs modernes (via module ES)
- Frameworks comme React, Vue, Angular (pour usage frontend si applicable).

## 📄 Licence

MIT

## 🤝 Support

Pour toute question, ouvrez une issue sur GitHub ou utilisez `fetchyourkeys-cli` pour la gestion.

