# FetchYourKeys SDK

<div align="center">

![FetchYourKeys](https://img.shields.io/badge/FetchYourKeys-v2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)

**La façon la plus simple et sécurisée de gérer vos clés API**

[Documentation](./docs/README.md) • [Démarrage Rapide](#-démarrage-rapide) • [Exemples](./docs/EXAMPLES.md) • [API Reference](./docs/API.md)

</div>

---

## 🎯 Pourquoi FetchYourKeys ?

Gérer des clés API dans votre application est un casse-tête : environnements multiples, sécurité, partage d'équipe, rotation des clés... **FetchYourKeys résout tout ça**.

### ✨ Avantages

- **🔐 Sécurité maximale** : Vos clés sont chiffrées de bout en bout avec une technologie avancée
- **🚀 Zéro configuration** : 3 lignes de code et c'est parti
- **📦 Offline-first** : Fonctionne même sans connexion grâce au cache intelligent
- **💪 Production-ready** : Gestion d'erreurs claire, messages user-friendly, mode silent
- **🎨 Developer Experience** : TypeScript natif, API intuitive, zéro surprise

### 🔥 Ce qui rend FetchYourKeys unique

```typescript
// ❌ Avant : clés en dur, erreurs cryptiques, crashes
const apiKey = process.env.GROQ_API_KEY; // undefined ?
console.log(apiKey.substring(0, 10)); // 💥 Cannot read properties of undefined

// ✅ Avec FetchYourKeys : simple, sûr, jamais de crash
import FetchYourKeys from 'fetchyourkeys-sdk';

const fyk = new FetchYourKeys();
const key = await fyk.safeGet('groq', 'fallback'); // Ne crash JAMAIS
```

---

## 🚀 Démarrage Rapide

### Installation

```bash
npm install fetchyourkeys-sdk
# ou
yarn add fetchyourkeys-sdk
```

### Configuration (30 secondes)

1. **Créez votre compte** sur [FetchYourKeys](https://fetchyourkeys.vercel.app)
2. **Générez votre clé secrète** (FYK_SECRET_KEY)
3. **Ajoutez vos clés API** sur le dashboard
4. **C'est tout !**

### Premier exemple

```typescript
import FetchYourKeys from 'fetchyourkeys-sdk';

// 1. Initialisation (validation automatique de votre clé FYK)
const fyk = new FetchYourKeys({
  apiKey: process.env.FYK_SECRET_KEY
});

// 2. Récupération d'une clé - Version simple
const groqKey = await fyk.safeGet('groq');
console.log(groqKey); // Votre clé Groq, ou '' si non trouvée

// 3. Récupération avec gestion d'erreurs fine
const result = await fyk.get('openai');
if (result.success) {
  console.log('OpenAI key:', result.data.value);
} else {
  console.error(result.error.message); // Message clair
  console.log('Suggestion:', result.error.suggestion); // Solution
}
```

**C'est aussi simple que ça.** Pas de configuration complexe, pas d'erreurs cryptiques.

---

## 📚 Fonctionnalités Principales

### 🔑 Récupération de Clés

```typescript
// Version simple (recommandée)
const key = await fyk.safeGet('stripe', 'fallback-key');

// Version avec Result (gestion fine)
const result = await fyk.get('stripe');
if (result.success) {
  const stripeKey = result.data.value;
}

// Récupération multiple
const result = await fyk.getMultiple(['stripe', 'openai', 'groq']);
console.log(result.data.stripe?.value);
```

### 🛡️ Sécurité & Cache

- **Chiffrement de bout en bout** : Vos clés sont protégées avec des algorithmes de chiffrement avancés
- **Cache intelligent** : Fonctionne offline automatiquement
- **Mode dev/prod** : Cache disque en dev, cache RAM en production

```typescript
const fyk = new FetchYourKeys({
  environment: 'prod', // Cache sécurisé en RAM
  silentMode: true     // Pas de logs en production
});
```

### 📊 Monitoring & Debug

```typescript
// Statistiques en temps réel
const stats = fyk.getStats();
console.log(stats.isOnline);      // true/false
console.log(stats.cachedKeys);    // Nombre de clés
console.log(stats.status);        // 🟢 EN LIGNE

// Historique des logs (mode debug)
const logs = fyk.getLogHistory();
```

### ⚡ Gestion d'Erreurs

**Fini les erreurs cryptiques.** FetchYourKeys vous donne des messages clairs avec des solutions.

```typescript
const result = await fyk.get('ma-cle');

if (!result.success) {
  console.log(result.error.code);        // KEY_NOT_FOUND
  console.log(result.error.message);     // "La clé 'ma-cle' n'existe pas"
  console.log(result.error.suggestion);  // "Vérifiez le nom sur votre dashboard"
  console.log(result.error.details?.availableKeys); // Liste des clés disponibles
}
```

**Codes d'erreur** : `KEY_NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `NETWORK_ERROR`, `CACHE_INVALID`

---

## 🎯 Cas d'Usage

### Application Express.js

```typescript
import express from 'express';
import FetchYourKeys from 'fetchyourkeys-sdk';

const app = express();
const fyk = new FetchYourKeys({ environment: 'prod', silentMode: true });

app.get('/api/chat', async (req, res) => {
  const groqKey = await fyk.safeGet('groq');
  
  if (!groqKey) {
    return res.status(500).json({ error: 'Service indisponible' });
  }
  
  // Utiliser groqKey pour appeler l'API Groq
  // ...
});
```

### Bot Discord/Trading

```typescript
const fyk = new FetchYourKeys({ environment: 'prod' });

async function startBot() {
  const discordToken = await fyk.safeGet('discord');
  const tradingApiKey = await fyk.safeGet('binance');
  
  // Lancer le bot avec les clés
}
```

### Application React/Next.js (Backend)

```typescript
// pages/api/config.ts
import FetchYourKeys from 'fetchyourkeys-sdk';

const fyk = new FetchYourKeys();

export default async function handler(req, res) {
  const result = await fyk.getMultiple(['stripe', 'sendgrid', 'aws']);
  
  res.json({
    stripe: result.data.stripe?.value,
    sendgrid: result.data.sendgrid?.value,
    aws: result.data.aws?.value
  });
}
```

---

## 🔧 Configuration Avancée

### Options d'initialisation

```typescript
const fyk = new FetchYourKeys({
  apiKey: process.env.FYK_SECRET_KEY,  // Requis
  baseURL: 'https://...',              // Optionnel
  environment: 'dev',                  // 'dev' | 'prod'
  debug: true,                         // Activer les logs
  silentMode: false                    // Désactiver console.log
});
```

### Environnements

| Mode | Cache | Usage |
|------|-------|-------|
| **dev** | Disque chiffré | Développement, rechargements rapides |
| **prod** | RAM sécurisée | Production, performances maximales |

### Mode Silent (Production)

```typescript
const fyk = new FetchYourKeys({
  environment: 'prod',
  silentMode: true  // Zéro log dans la console
});

// Logs accessibles en interne si besoin
const logs = fyk.getLogHistory();
```

---

## 📖 Documentation Complète

- **[Guide de Démarrage](./docs/GETTING_STARTED.md)** : Configuration détaillée
- **[Exemples d'Usage](./docs/EXAMPLES.md)** : Cas d'usage réels
- **[API Reference](./docs/API.md)** : Toutes les méthodes
- **[Gestion d'Erreurs](./docs/ERROR_HANDLING.md)** : Codes et solutions
- **[Migration v1 → v2](./docs/MIGRATION.md)** : Guide de migration
- **[FAQ](./docs/FAQ.md)** : Questions fréquentes

---

## 🆚 Comparaison

| Fonctionnalité | Variables d'env | Vault | **FetchYourKeys** |
|----------------|-----------------|-------|-------------------|
| **Setup rapide** | ✅ | ❌ | ✅ |
| **Sécurité** | ❌ | ✅ | ✅ |
| **Partage équipe** | ❌ | ✅ | ✅ |
| **Offline-first** | ✅ | ❌ | ✅ |
| **Rotation facile** | ❌ | ⚠️ | ✅ |
| **Dashboard** | ❌ | ✅ | ✅ |
| **Gratuit** | ✅ | ❌ | ✅ |

---

## 🔐 Sécurité

FetchYourKeys prend la sécurité **très au sérieux** :

- ✅ Chiffrement AES-256-GCM de bout en bout
- ✅ Clés jamais stockées en clair
- ✅ Cache chiffré localement
- ✅ Validation automatique des clés FYK
- ✅ Protection contre les accès non autorisés

> **Note** : Les détails de l'implémentation cryptographique sont volontairement gardés confidentiels pour renforcer la sécurité.

---

## 🤝 Support & Communauté

- 📧 **Email** : support@fetchyourkeys.com
- 💬 **Discord** : [Rejoindre la communauté](https://discord.gg/fetchyourkeys)
- 🐛 **Issues** : [GitHub Issues](https://github.com/fetchyourkeys/sdk/issues)
- 📚 **Documentation** : [docs.fetchyourkeys.com](https://docs.fetchyourkeys.com)

---

## 📝 License

MIT © FetchYourKeys

---

## 🚀 Prêt à simplifier la gestion de vos clés API ?

```bash
npm install fetchyourkeys-sdk
```

**3 lignes de code, zéro configuration complexe, sécurité maximale.**

[Commencer maintenant](https://fetchyourkeys.vercel.app) • [Documentation](./docs/README.md)
