# Documentation FetchYourKeys SDK

Bienvenue dans la documentation complète de FetchYourKeys SDK.

---

## 📚 Table des Matières

### Guides de Démarrage

- **[Guide de Démarrage Rapide](./GETTING_STARTED.md)** - Installation et configuration en 5 minutes
- **[Exemples d'Usage](./EXAMPLES.md)** - Cas d'usage pratiques (Express, Next.js, Discord, etc.)
- **[FAQ](./FAQ.md)** - Questions fréquentes et réponses

### Référence Technique

- **[API Reference Complète](./API.md)** - Documentation de toutes les méthodes et types
- **[Gestion d'Erreurs](./ERROR_HANDLING.md)** - Guide complet sur les erreurs et codes

### Ressources Supplémentaires

- **[Retour au README principal](../README.md)**
- **[Site Web](https://fetchyourkeys.vercel.app)**
- **[Support](mailto:support@fetchyourkeys.com)**

---

## 🚀 Démarrage Rapide (3 minutes)

### 1. Installation

```bash
npm install fetchyourkeys-sdk
```

### 2. Configuration

Créez un fichier `.env` :

```env
FYK_SECRET_KEY=votre_cle_secrete
```

### 3. Utilisation

```typescript
import FetchYourKeys from 'fetchyourkeys-sdk';

const fyk = new FetchYourKeys();

// Version simple
const groqKey = await fyk.safeGet('groq');
console.log(groqKey);

// Version avec gestion d'erreurs
const result = await fyk.get('openai');
if (result.success) {
  console.log('OpenAI:', result.data.value);
} else {
  console.error('Erreur:', result.error.message);
}
```

**C'est tout !** ✨

---

## 🎯 Guides par Cas d'Usage

Choisissez votre cas d'usage :

### Backend & API

- [Application Express.js](./EXAMPLES.md#application-expressjs)
- [Application Next.js API Routes](./EXAMPLES.md#application-nextjs)
- [Serverless Functions (AWS Lambda, Vercel)](./EXAMPLES.md#serverless-functions)

### Automatisation & Bots

- [Bot Discord](./EXAMPLES.md#bot-discord)
- [Bot de Trading](./EXAMPLES.md#bot-de-trading)
- [Scripts CLI](./EXAMPLES.md#scripts-cli)

### Tests & Développement

- [Tests Unitaires avec Jest](./EXAMPLES.md#tests-unitaires)
- [Mode Debug](./GETTING_STARTED.md#monitoring)

---

## 🔑 Concepts Clés

### Result<T>

Toutes les méthodes principales retournent un objet `Result` standardisé :

```typescript
interface Result<T> {
  success: boolean;      // true = succès, false = erreur
  data?: T;              // Données si succès
  error?: {              // Erreur si échec
    code: string;
    message: string;
    suggestion?: string;
  };
  metadata?: {           // Informations supplémentaires
    cached: boolean;
    online: boolean;
    timestamp: string;
  };
}
```

**Avantage** : Vous savez toujours ce que vous obtenez. Pas de surprise.

### Deux Modes de Récupération

#### `get()` - Gestion Fine

```typescript
const result = await fyk.get('groq');

if (result.success) {
  const key = result.data.value;
  // Utilisez la clé
} else {
  console.error(result.error.message);
  console.log('Suggestion:', result.error.suggestion);
}
```

#### `safeGet()` - Simple et Sûr

```typescript
// Ne crash JAMAIS, retourne la valeur ou le fallback
const key = await fyk.safeGet('groq', 'default-key');
console.log(key); // Toujours une string
```

### Cache Intelligent

Le SDK utilise un cache automatique :

- **Mode dev** : Cache disque chiffré (survit aux redémarrages)
- **Mode prod** : Cache RAM sécurisée (performances maximales)

Fonctionne **hors ligne** automatiquement si cache disponible.

---

## 🛡️ Sécurité

FetchYourKeys prend la sécurité très au sérieux :

- ✅ **Chiffrement AES-256-GCM** de bout en bout
- ✅ **Clés jamais en clair** dans le cache
- ✅ **Validation automatique** de la clé FYK
- ✅ **Cache isolé** par clé API

> Les détails cryptographiques sont gardés confidentiels pour renforcer la sécurité.

**À faire** :
- ✅ Stocker `FYK_SECRET_KEY` dans `.env`
- ✅ Ajouter `.env` au `.gitignore`
- ✅ Utiliser `environment: 'prod'` en production

**À éviter** :
- ❌ Hardcoder les clés dans le code
- ❌ Commit `.env` dans Git
- ❌ Utiliser le SDK côté client (navigateur)

---

## 📊 Monitoring

### Statistiques en Temps Réel

```typescript
const stats = fyk.getStats();

console.log('Status:', stats.status);           // 🟢 EN LIGNE
console.log('Clés en cache:', stats.cachedKeys); // 20
console.log('En ligne:', stats.isOnline);        // true
```

### Historique des Logs (Mode Debug)

```typescript
const fyk = new FetchYourKeys({ 
  debug: true, 
  silentMode: true 
});

// Récupérer l'historique
const logs = fyk.getLogHistory();
logs.forEach(log => {
  console.log(`[${log.timestamp}] ${log.message}`);
});
```

---

## ⚡ Performances

- **Premier appel** : ~2-3s (chargement API)
- **Appels suivants** : < 1ms (lecture cache)
- **Mode offline** : < 1ms (cache uniquement)

Le SDK charge **toutes les clés en une seule requête** au démarrage, puis utilise le cache.

---

## 🚨 Gestion d'Erreurs

### Codes d'Erreur Standardisés

| Code | Signification | Solution |
|------|---------------|----------|
| `MISSING_API_KEY` | Clé FYK manquante | Définir FYK_SECRET_KEY |
| `UNAUTHORIZED` | Clé FYK invalide | Vérifier la clé |
| `KEY_NOT_FOUND` | Clé inexistante | Vérifier le nom |
| `NETWORK_ERROR` | Erreur réseau | Vérifier connexion |
| `CACHE_INVALID` | Cache corrompu | Reconnecter |

**Tous les codes** dans [ERROR_HANDLING.md](./ERROR_HANDLING.md)

### Pattern Recommandé

```typescript
const result = await fyk.get('groq');

if (!result.success) {
  // Log pour debug
  console.error('Code:', result.error.code);
  console.error('Message:', result.error.message);
  console.log('💡', result.error.suggestion);
  
  // Gérer spécifiquement
  switch (result.error.code) {
    case 'KEY_NOT_FOUND':
      // Logique pour clé manquante
      break;
    case 'NETWORK_ERROR':
      // Mode offline
      break;
  }
}
```

---

## 🔄 Environnements

### Développement

```typescript
const fyk = new FetchYourKeys({
  environment: 'dev',
  debug: true,
  silentMode: false
});
```

- Cache disque chiffré
- Logs détaillés visibles
- Rechargements rapides

### Production

```typescript
const fyk = new FetchYourKeys({
  environment: 'prod',
  debug: false,
  silentMode: true
});
```

- Cache RAM sécurisée
- Pas de logs console
- Performances maximales

---

## 📖 Navigation de la Documentation

### Par Niveau d'Expérience

**Débutant** :
1. [Guide de Démarrage](./GETTING_STARTED.md)
2. [FAQ](./FAQ.md)
3. [Exemples Simples](./EXAMPLES.md)

**Intermédiaire** :
1. [API Reference](./API.md)
2. [Gestion d'Erreurs](./ERROR_HANDLING.md)
3. [Exemples Avancés](./EXAMPLES.md)

**Avancé** :
1. [API Reference Complète](./API.md)
2. [Patterns de Retry](./ERROR_HANDLING.md#exemples-de-patterns)
3. [Tests & Mocking](./EXAMPLES.md#tests-unitaires)

### Par Besoin

**"Je veux démarrer rapidement"** → [Guide de Démarrage](./GETTING_STARTED.md)

**"J'ai une erreur"** → [Gestion d'Erreurs](./ERROR_HANDLING.md) ou [FAQ](./FAQ.md)

**"Comment faire X ?"** → [Exemples](./EXAMPLES.md)

**"Quelle méthode utiliser ?"** → [API Reference](./API.md)

---

## 🤝 Support & Communauté

### Obtenir de l'Aide

1. **Documentation** : Vous êtes au bon endroit !
2. **FAQ** : [FAQ.md](./FAQ.md) - Questions courantes
3. **Discord** : [discord.gg/fetchyourkeys](https://discord.gg/fetchyourkeys)
4. **Email** : [support@fetchyourkeys.com](mailto:support@fetchyourkeys.com)
5. **GitHub** : [github.com/fetchyourkeys/sdk/issues](https://github.com/fetchyourkeys/sdk/issues)

### Contribuer

Le SDK est open-source ! Contributions bienvenues :

- 🐛 [Signaler un bug](https://github.com/fetchyourkeys/sdk/issues)
- 💡 [Proposer une feature](https://github.com/fetchyourkeys/sdk/discussions)
- 📝 [Améliorer la doc](https://github.com/fetchyourkeys/sdk/pulls)

---

## 🎓 Ressources Supplémentaires

- **[Site Web](https://fetchyourkeys.vercel.app)** - Dashboard et gestion de clés
- **[Blog](https://blog.fetchyourkeys.com)** - Tutorials et cas d'usage
- **[Changelog](https://github.com/fetchyourkeys/sdk/releases)** - Nouvelles versions
- **[Roadmap](https://github.com/fetchyourkeys/sdk/projects)** - Fonctionnalités à venir

---

## 📄 Licence

MIT © FetchYourKeys

---

**Prêt à commencer ?** → [Guide de Démarrage](./GETTING_STARTED.md)

**Besoin d'aide ?** → [support@fetchyourkeys.com](mailto:support@fetchyourkeys.com)
