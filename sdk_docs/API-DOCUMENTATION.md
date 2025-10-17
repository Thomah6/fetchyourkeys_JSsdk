# 📚 Documentation API - FetchYourKeys SDK

## Table des Matières

1. [Installation](#installation)
2. [Configuration](#configuration)
3. [Méthodes Principales](#méthodes-principales)
4. [Types TypeScript](#types-typescript)
5. [Gestion des Erreurs](#gestion-des-erreurs)
6. [Exemples Avancés](#exemples-avancés)

---

## Installation

```bash
npm install fetchyourkeys
```

**Configuration minimale requise :**
- Node.js 16+
- TypeScript 5.0+ (optionnel)

---

## Configuration

### Options de Configuration

```typescript
interface FetchYourKeysOptions {
  apiKey?: string;          // Clé API FetchYourKeys (FYK_SECRET_KEY)
  baseURL?: string;         // URL de l'API (personnalisable)
  environment?: 'dev' | 'prod'; // Environnement d'exécution
  debug?: boolean;          // Active les logs de debug
  silentMode?: boolean;     // Désactive les console.log
}
```

### Exemples de Configuration

```javascript
// Configuration minimale (recommandée)
const fyk = new FetchYourKeys();

// Configuration pour le développement
const fyk = new FetchYourKeys({
  environment: 'dev',
  debug: true,
  silentMode: false
});

// Configuration pour la production
const fyk = new FetchYourKeys({
  environment: 'prod',
  debug: false,
  silentMode: true
});

// Configuration personnalisée
const fyk = new FetchYourKeys({
  apiKey: process.env.FYK_SECRET_KEY,
  baseURL: 'https://custom-api.example.com/v1/keys',
  environment: 'prod'
});
```

---

## Méthodes Principales

### `safeGet(label, fallback?)`

**Récupère une clé de manière sécurisée. Ne lance jamais d'exception.**

**Signature :**
```typescript
async safeGet(label: string, fallback?: string): Promise<string>
```

**Paramètres :**
- `label` (string) : Nom de la clé à récupérer
- `fallback` (string, optionnel) : Valeur par défaut si la clé n'existe pas (défaut: `''`)

**Retourne :**
- La valeur de la clé si elle existe
- Le `fallback` si la clé n'existe pas
- Une chaîne vide si pas de `fallback` et clé introuvable

**Exemples :**

```javascript
// Avec fallback
const openaiKey = await fyk.safeGet('openai', 'sk-default-key');
console.log(openaiKey); // 'sk-proj-abc123...' ou 'sk-default-key'

// Sans fallback
const stripeKey = await fyk.safeGet('stripe');
console.log(stripeKey); // 'sk_live_xyz...' ou ''

// Utilisation directe
const response = await fetch('https://api.openai.com', {
  headers: { 
    'Authorization': `Bearer ${await fyk.safeGet('openai')}` 
  }
});
```

**Quand l'utiliser :**
- ✅ Code simple et rapide
- ✅ Pas besoin de gestion d'erreurs complexe
- ✅ Prototypage
- ✅ Valeur par défaut disponible

---

### `get(label)`

**Récupère une clé avec gestion détaillée des erreurs.**

**Signature :**
```typescript
async get(label: string): Promise<Result<Key>>
```

**Paramètres :**
- `label` (string) : Nom de la clé à récupérer

**Retourne :**
```typescript
interface Result<Key> {
  success: boolean;
  data?: {
    id: string;
    label: string;
    service: string;
    value: string;        // La clé API
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
  error?: {
    code: string;
    message: string;
    suggestion?: string;
    details?: any;
  };
  metadata?: {
    cached: boolean;
    online: boolean;
    timestamp: string;
  };
}
```

**Exemples :**

```javascript
const result = await fyk.get('stripe');

if (result.success) {
  // ✅ Succès
  console.log('Valeur:', result.data.value);
  console.log('Service:', result.data.service);
  console.log('Active:', result.data.is_active);
  
  // Metadata
  console.log('Source:', result.metadata.cached ? 'Cache' : 'API');
  console.log('En ligne:', result.metadata.online);
  
} else {
  // ❌ Erreur
  console.error('Code:', result.error.code);
  console.error('Message:', result.error.message);
  console.error('Solution:', result.error.suggestion);
  
  // Clés disponibles
  if (result.error.details?.availableKeys) {
    console.log('Suggestions:', result.error.details.availableKeys);
  }
}
```

**Quand l'utiliser :**
- ✅ Applications production
- ✅ Gestion d'erreurs personnalisée
- ✅ Besoin de metadata (cache, status, etc.)
- ✅ Logging et monitoring

---

### `getMultiple(labels)`

**Récupère plusieurs clés en une seule requête.**

**Signature :**
```typescript
async getMultiple(labels: string[]): Promise<Result<Record<string, Key | null>>>
```

**Paramètres :**
- `labels` (string[]) : Tableau des noms de clés à récupérer

**Retourne :**
```typescript
Result<Record<string, Key | null>>
```

**Exemples :**

```javascript
const result = await fyk.getMultiple(['openai', 'stripe', 'groq']);

if (result.success) {
  // Accès par nom de clé
  const openai = result.data.openai?.value;
  const stripe = result.data.stripe?.value;
  const groq = result.data.groq?.value;
  
  console.log('OpenAI:', openai);
  console.log('Stripe:', stripe);
  console.log('Groq:', groq);
  
  // Itération
  Object.entries(result.data).forEach(([name, key]) => {
    if (key) {
      console.log(`${name}: ${key.value}`);
    } else {
      console.log(`${name}: non trouvée`);
    }
  });
}
```

**Quand l'utiliser :**
- ✅ Récupération batch
- ✅ Optimisation des requêtes
- ✅ Initialisation de plusieurs services

---

### `refresh()`

**Force le rafraîchissement du cache.**

**Signature :**
```typescript
async refresh(): Promise<Result<boolean>>
```

**Retourne :**
```typescript
Result<boolean>
```

**Exemples :**

```javascript
const result = await fyk.refresh();

if (result.success) {
  console.log('✅ Cache mis à jour');
  console.log('Timestamp:', result.metadata.timestamp);
} else {
  console.log('⚠️ Impossible de rafraîchir');
  console.log('Raison:', result.error.message);
}
```

**Quand l'utiliser :**
- ✅ Après avoir ajouté une clé sur le dashboard
- ✅ Synchronisation manuelle
- ✅ Mise à jour périodique

---

### `getAll()`

**Récupère toutes les clés disponibles.**

**Signature :**
```typescript
async getAll(): Promise<Key[]>
```

**Retourne :**
```typescript
Key[]
```

**Exemples :**

```javascript
const allKeys = await fyk.getAll();

console.log(`${allKeys.length} clés disponibles`);

allKeys.forEach(key => {
  console.log(`- ${key.label} (${key.service})`);
});
```

---

### `getByService(service)`

**Récupère toutes les clés d'un service spécifique.**

**Signature :**
```typescript
async getByService(service: string): Promise<Key[]>
```

**Paramètres :**
- `service` (string) : Nom du service (ex: 'openai', 'stripe')

**Exemples :**

```javascript
const openaiKeys = await fyk.getByService('openai');
const stripeKeys = await fyk.getByService('stripe');

console.log(`${openaiKeys.length} clés OpenAI`);
console.log(`${stripeKeys.length} clés Stripe`);
```

---

### `filter(predicate)`

**Filtre les clés selon un critère personnalisé.**

**Signature :**
```typescript
async filter(predicate: (key: Key) => boolean): Promise<Key[]>
```

**Paramètres :**
- `predicate` (function) : Fonction de filtrage

**Exemples :**

```javascript
// Clés actives uniquement
const activeKeys = await fyk.filter(key => key.is_active);

// Clés créées récemment (moins de 7 jours)
const recentKeys = await fyk.filter(key => {
  const created = new Date(key.created_at);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return created > weekAgo;
});

// Clés d'un service spécifique avec label contenant 'prod'
const prodKeys = await fyk.filter(key => 
  key.service === 'stripe' && key.label.includes('prod')
);
```

---

### `getStats()`

**Récupère les statistiques du SDK.**

**Signature :**
```typescript
getStats(): Object
```

**Retourne :**

```typescript
{
  status: string;           // '🟢 EN LIGNE' | '🟡 HORS LIGNE' | '🔴 ERREUR'
  cachedKeys: number;       // Nombre de clés en cache
  isOnline: boolean;        // Connexion API active
  environment: string;      // 'dev' | 'prod'
  cacheType: string;        // Type de cache utilisé
  cacheValid: boolean;      // Cache valide
  cacheId: string;          // Identifiant du cache
  apiKey: string;           // Clé API masquée
  debugEnabled: boolean;    // Mode debug actif
  silentMode: boolean;      // Mode silent actif
}
```

**Exemples :**

```javascript
const stats = fyk.getStats();

console.log('Status:', stats.status);
console.log('Clés en cache:', stats.cachedKeys);
console.log('En ligne:', stats.isOnline ? '✅' : '❌');
console.log('Environnement:', stats.environment);
```

---

### `getLogHistory()`

**Récupère l'historique des logs (si debug activé).**

**Signature :**
```typescript
getLogHistory(): Array<LogEntry>
```

**Retourne :**

```typescript
interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
}
```

**Exemples :**

```javascript
const logs = fyk.getLogHistory();

logs.forEach(log => {
  console.log(`[${log.timestamp}] ${log.message}`);
  if (log.data) {
    console.log('Données:', log.data);
  }
});

// Filtrer les logs
const errors = logs.filter(log => log.message.includes('❌'));
console.log(`${errors.length} erreurs détectées`);
```

---

### `clearCache()`

**Vide le cache local.**

**Signature :**
```typescript
clearCache(): void
```

**Exemples :**

```javascript
fyk.clearCache();
console.log('Cache vidé');

// Vérification
const stats = fyk.getStats();
console.log('Clés en cache:', stats.cachedKeys); // 0
```

---

### `setDebug(enabled)`

**Active ou désactive le mode debug.**

**Signature :**
```typescript
setDebug(enabled: boolean): void
```

**Exemples :**

```javascript
// Activer le debug
fyk.setDebug(true);

// Désactiver le debug
fyk.setDebug(false);
```

---

### `setSilentMode(silent)`

**Active ou désactive le mode silent.**

**Signature :**
```typescript
setSilentMode(silent: boolean): void
```

**Exemples :**

```javascript
// Activer le mode silent (pas de console.log)
fyk.setSilentMode(true);

// Désactiver le mode silent
fyk.setSilentMode(false);
```

---

## Types TypeScript

### `Result<T>`

```typescript
interface Result<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    suggestion?: string;
    details?: any;
  };
  metadata?: {
    cached: boolean;
    online: boolean;
    timestamp: string;
  };
}
```

### `Key`

```typescript
interface Key {
  id: string;
  label: string;
  service: string;
  value: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

### `FetchYourKeysOptions`

```typescript
interface FetchYourKeysOptions {
  apiKey?: string;
  baseURL?: string;
  environment?: 'dev' | 'prod';
  debug?: boolean;
  silentMode?: boolean;
}
```

---

## Gestion des Erreurs

### Codes d'Erreur

| Code | Description | Action Recommandée |
|------|-------------|-------------------|
| `UNAUTHORIZED` | Clé FYK invalide ou expirée | Vérifier `FYK_SECRET_KEY` |
| `FORBIDDEN` | Clé FYK non autorisée | Régénérer la clé sur le dashboard |
| `KEY_NOT_FOUND` | Clé API demandée introuvable | Vérifier le nom de la clé |
| `NETWORK_ERROR` | Pas de connexion internet | Le cache sera utilisé automatiquement |
| `CACHE_INVALID` | Cache corrompu | Se reconnecter à internet |
| `RATE_LIMIT` | Limite de requêtes atteinte | Attendre quelques instants |

### Exemple de Gestion

```javascript
const result = await fyk.get('stripe');

if (!result.success) {
  switch (result.error.code) {
    case 'UNAUTHORIZED':
      console.error('❌ Clé FYK invalide');
      console.log('💡', result.error.suggestion);
      // Rediriger vers la configuration
      break;
      
    case 'KEY_NOT_FOUND':
      console.error('❌ Clé introuvable');
      console.log('Clés disponibles:', result.error.details?.availableKeys);
      // Proposer des alternatives
      break;
      
    case 'NETWORK_ERROR':
      console.warn('⚠️ Mode hors ligne');
      // Continuer avec le cache
      break;
      
    default:
      console.error('❌ Erreur:', result.error.message);
  }
}
```

---

## Exemples Avancés

### Express.js avec Middleware

```javascript
import express from 'express';
import FetchYourKeys from 'fetchyourkeys';

const app = express();
const fyk = new FetchYourKeys({ 
  environment: 'prod', 
  silentMode: true 
});

// Middleware de vérification
app.use(async (req, res, next) => {
  const stats = fyk.getStats();
  
  if (!stats.isOnline && stats.cachedKeys === 0) {
    return res.status(503).json({
      error: 'Service temporairement indisponible'
    });
  }
  
  next();
});

// Routes
app.get('/api/openai', async (req, res) => {
  const key = await fyk.safeGet('openai');
  
  if (!key) {
    return res.status(500).json({ error: 'Clé OpenAI non disponible' });
  }
  
  // Utiliser la clé...
  res.json({ success: true });
});

app.listen(3000);
```

### Rotation Automatique des Clés

```javascript
import FetchYourKeys from 'fetchyourkeys';

const fyk = new FetchYourKeys();

// Rafraîchir toutes les heures
setInterval(async () => {
  console.log('🔄 Rafraîchissement du cache...');
  const result = await fyk.refresh();
  
  if (result.success) {
    console.log('✅ Cache mis à jour');
  } else {
    console.warn('⚠️ Impossible de rafraîchir');
  }
}, 3600000); // 1 heure
```

### Fallback Multi-Niveaux

```javascript
async function getApiKey(preferred, alternatives = []) {
  // Essayer la clé préférée
  let key = await fyk.safeGet(preferred);
  
  if (key) return key;
  
  // Essayer les alternatives
  for (const alt of alternatives) {
    key = await fyk.safeGet(alt);
    if (key) {
      console.log(`⚠️ Utilisation de ${alt} à la place de ${preferred}`);
      return key;
    }
  }
  
  throw new Error('Aucune clé disponible');
}

// Usage
const openaiKey = await getApiKey('openai-prod', ['openai-dev', 'openai-backup']);
```

### Monitoring et Alertes

```javascript
import FetchYourKeys from 'fetchyourkeys';

const fyk = new FetchYourKeys({ debug: true, silentMode: true });

// Fonction de monitoring
async function monitorHealth() {
  const stats = fyk.getStats();
  const logs = fyk.getLogHistory();
  
  // Vérifier les erreurs
  const errors = logs.filter(log => log.message.includes('❌'));
  
  if (errors.length > 5) {
    console.error(`⚠️ ALERTE: ${errors.length} erreurs détectées`);
    // Envoyer une notification...
  }
  
  // Vérifier la connexion
  if (!stats.isOnline && stats.cachedKeys === 0) {
    console.error('🔴 CRITIQUE: Hors ligne sans cache');
    // Envoyer une alerte...
  }
  
  console.log('✅ Health check OK');
}

// Exécuter toutes les 5 minutes
setInterval(monitorHealth, 300000);
```

---

## Support

- 📧 Email: support@fetchyourkeys.com
- 🌐 Website: https://fetchyourkeys.vercel.app
- 📚 Docs: https://fetchyourkeys.vercel.app/docs

---

**© 2025 FetchYourKeys - Documentation API v2.0**
