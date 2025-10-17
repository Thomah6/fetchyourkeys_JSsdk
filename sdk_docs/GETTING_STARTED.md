# Guide de Démarrage

Bienvenue dans FetchYourKeys ! Ce guide vous accompagne pas à pas pour intégrer le SDK dans votre projet.

## 📋 Prérequis

- Node.js >= 16.0.0
- npm ou yarn
- Un compte FetchYourKeys (gratuit)

## 🚀 Installation

### 1. Installer le package

```bash
npm install fetchyourkeys-sdk
```

Ou avec yarn :

```bash
yarn add fetchyourkeys-sdk
```

### 2. Créer votre compte FetchYourKeys

1. Rendez-vous sur [https://fetchyourkeys.vercel.app](https://fetchyourkeys.vercel.app)
2. Créez votre compte gratuit
3. Accédez à votre dashboard

### 3. Générer votre clé secrète FYK

Dans votre dashboard :
1. Cliquez sur **"Générer une clé"**
2. Copiez votre `FYK_SECRET_KEY`
3. ⚠️ **Conservez-la en sécurité** (ne la partagez jamais publiquement)

### 4. Ajouter vos clés API

Dans votre dashboard FetchYourKeys :
1. Cliquez sur **"Ajouter une clé"**
2. Donnez un nom (label) : `groq`, `openai`, `stripe`, etc.
3. Collez la valeur de votre clé API
4. Sélectionnez le service
5. Enregistrez

**Exemple** :
- Label : `groq`
- Service : Groq
- Valeur : `gsk_...` (votre vraie clé Groq)

---

## ⚙️ Configuration

### Fichier `.env`

Créez un fichier `.env` à la racine de votre projet :

```env
FYK_SECRET_KEY=fk_votre_cle_secrete_ici
```

**Important** : Ajoutez `.env` à votre `.gitignore` !

### Initialisation du SDK

#### Version Simple (Recommandée)

```typescript
import FetchYourKeys from 'fetchyourkeys-sdk';

const fyk = new FetchYourKeys({
  apiKey: process.env.FYK_SECRET_KEY
});
```

#### Version avec Options

```typescript
const fyk = new FetchYourKeys({
  apiKey: process.env.FYK_SECRET_KEY,
  environment: 'dev',      // 'dev' ou 'prod'
  debug: true,             // Logs détaillés
  silentMode: false        // Console.log actifs
});
```

---

## 💡 Premier Test

Créez un fichier `test.js` ou `test.ts` :

```typescript
import FetchYourKeys from 'fetchyourkeys-sdk';

async function test() {
  const fyk = new FetchYourKeys({
    apiKey: process.env.FYK_SECRET_KEY,
    debug: true
  });

  // Récupération simple
  const groqKey = await fyk.safeGet('groq');
  console.log('Groq Key:', groqKey ? '✅ Trouvée' : '❌ Non trouvée');

  // Récupération avec détails
  const result = await fyk.get('openai');
  if (result.success) {
    console.log('✅ OpenAI key:', result.data.value.substring(0, 10) + '...');
  } else {
    console.log('❌ Erreur:', result.error.message);
    console.log('💡 Suggestion:', result.error.suggestion);
  }

  // Stats
  const stats = fyk.getStats();
  console.log('📊 Statistiques:', stats);
}

test();
```

Exécutez :

```bash
node test.js
```

Si vous voyez vos clés, **félicitations** ! 🎉

---

## 🎯 Cas d'Usage de Base

### Récupération Simple

```typescript
// Ne crash JAMAIS, retourne '' si non trouvée
const stripeKey = await fyk.safeGet('stripe');

// Avec fallback
const groqKey = await fyk.safeGet('groq', 'gsk_default_key');
```

### Récupération avec Gestion d'Erreurs

```typescript
const result = await fyk.get('openai');

if (result.success) {
  const openaiKey = result.data.value;
  console.log('Service:', result.data.service);
  console.log('Active:', result.data.is_active);
} else {
  console.error('Code:', result.error.code);
  console.error('Message:', result.error.message);
  console.log('Suggestion:', result.error.suggestion);
}
```

### Récupération Multiple

```typescript
const result = await fyk.getMultiple(['stripe', 'openai', 'groq']);

if (result.success) {
  const stripeKey = result.data.stripe?.value;
  const openaiKey = result.data.openai?.value;
  const groqKey = result.data.groq?.value;
}
```

---

## 🏭 Environnements de Déploiement

### Développement

```typescript
const fyk = new FetchYourKeys({
  environment: 'dev',
  debug: true,
  silentMode: false
});
```

**Avantages** :
- Cache disque chiffré (rechargements rapides)
- Logs détaillés
- Idéal pour déboguer

### Production

```typescript
const fyk = new FetchYourKeys({
  environment: 'prod',
  debug: false,
  silentMode: true
});
```

**Avantages** :
- Cache RAM (performances maximales)
- Pas de logs console
- Zéro pollution

---

## 🛡️ Sécurité

### Bonnes Pratiques

✅ **À FAIRE** :
- Stocker `FYK_SECRET_KEY` dans `.env`
- Ajouter `.env` au `.gitignore`
- Utiliser `environment: 'prod'` en production
- Activer `silentMode: true` en production

❌ **À ÉVITER** :
- Hardcoder la clé FYK dans le code
- Commit la clé FYK dans Git
- Partager la clé FYK publiquement
- Utiliser `debug: true` en production

### Rotation des Clés

Si votre `FYK_SECRET_KEY` est compromise :
1. Générez une nouvelle clé sur le dashboard
2. Mettez à jour `.env`
3. Redéployez votre application

**C'est tout** ! Le SDK gère automatiquement la transition.

---

## 📊 Monitoring

### Statistiques

```typescript
const stats = fyk.getStats();

console.log(stats.status);        // 🟢 EN LIGNE / 🟡 HORS LIGNE
console.log(stats.cachedKeys);    // Nombre de clés
console.log(stats.isOnline);      // true/false
console.log(stats.environment);   // 'dev' ou 'prod'
```

### Historique des Logs (Mode Debug)

```typescript
const fyk = new FetchYourKeys({ debug: true, silentMode: true });

// Récupérer l'historique
const logs = fyk.getLogHistory();
console.log(logs); // Tableau de logs

// Nettoyer l'historique
fyk.clearCache();
```

---

## 🚨 Dépannage

### Erreur : "Clé API manquante"

```
Code: MISSING_API_KEY
Message: Clé API manquante
```

**Solution** : Vérifiez que `FYK_SECRET_KEY` est bien dans `.env`

### Erreur : "Clé API invalide ou expirée"

```
Code: UNAUTHORIZED
Message: Clé API FetchYourKeys invalide ou expirée
```

**Solution** : 
1. Vérifiez que la clé dans `.env` est correcte
2. Connectez-vous au dashboard et vérifiez que la clé est active
3. Générez une nouvelle clé si nécessaire

### Erreur : "La clé 'xxx' n'existe pas"

```
Code: KEY_NOT_FOUND
Message: La clé 'groq' n'existe pas
```

**Solution** :
1. Vérifiez le nom exact sur votre dashboard
2. Ajoutez la clé si elle n'existe pas
3. Utilisez `safeGet()` avec fallback pour éviter les erreurs

### Mode Hors Ligne

Si vous êtes hors ligne mais avez un cache :

```
Status: 🟡 HORS LIGNE
Clés en cache: 20
```

**C'est normal** ! Le SDK fonctionne avec le cache. Reconnectez-vous pour rafraîchir.

---

## ➡️ Prochaines Étapes

- 📖 [Exemples d'Usage Avancés](./EXAMPLES.md)
- 🔧 [API Reference Complète](./API.md)
- ⚠️ [Gestion d'Erreurs Détaillée](./ERROR_HANDLING.md)
- ❓ [FAQ](./FAQ.md)

**Besoin d'aide ?** Rejoignez notre [Discord](https://discord.gg/fetchyourkeys) ou envoyez un email à support@fetchyourkeys.com
