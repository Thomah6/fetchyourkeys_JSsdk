# Référence API Complète

Documentation technique de toutes les méthodes et types disponibles dans FetchYourKeys SDK.

---

## Table des Matières

- [Types](#types)
- [Classe FetchYourKeys](#classe-fetchyourkeys)
  - [Constructor](#constructor)
  - [Méthodes Principales](#méthodes-principales)
  - [Méthodes Utilitaires](#méthodes-utilitaires)
- [Interfaces](#interfaces)
- [Erreurs](#erreurs)

---

## Types

### `Result<T>`

Structure de réponse standardisée pour toutes les opérations.

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

**Exemple** :

```typescript
const result: Result<Key> = await fyk.get('groq');
```

### `Key`

Représentation d'une clé API.

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

Options de configuration du SDK.

```typescript
interface FetchYourKeysOptions {
  apiKey?: string;           // Clé FYK (ou process.env.FYK_SECRET_KEY)
  baseURL?: string;          // URL de l'API (optionnel)
  environment?: 'dev' | 'prod'; // Mode de cache
  debug?: boolean;           // Activer les logs
  silentMode?: boolean;      // Désactiver console.log
}
```

---

## Classe FetchYourKeys

### Constructor

```typescript
new FetchYourKeys(options?: FetchYourKeysOptions)
```

**Paramètres** :
- `options` : Configuration du SDK (optionnel)

**Exemple** :

```typescript
const fyk = new FetchYourKeys({
  apiKey: process.env.FYK_SECRET_KEY,
  environment: 'prod',
  silentMode: true
});
```

**Comportement** :
- Validation automatique de la clé FYK
- Initialisation du cache (dev = disque, prod = RAM)
- Chargement automatique des clés

**Erreurs possibles** :
- `MISSING_API_KEY` : Aucune clé FYK fournie
- `UNAUTHORIZED` : Clé FYK invalide ou expirée
- `FORBIDDEN` : Clé FYK non autorisée

---

## Méthodes Principales

### `get(label: string): Promise<Result<Key>>`

Récupère une clé API par son label.

**Paramètres** :
- `label` : Nom de la clé (ex: `'groq'`, `'openai'`)

**Retour** : `Promise<Result<Key>>`

**Exemple** :

```typescript
const result = await fyk.get('groq');

if (result.success) {
  console.log('Valeur:', result.data.value);
  console.log('Service:', result.data.service);
  console.log('Cachée:', result.metadata.cached);
} else {
  console.error('Erreur:', result.error.message);
  console.log('Suggestion:', result.error.suggestion);
}
```

**Codes d'erreur** :
- `KEY_NOT_FOUND` : La clé n'existe pas
- `CACHE_INVALID` : Cache corrompu
- `NETWORK_ERROR` : Erreur réseau

---

### `safeGet(label: string, fallback?: string): Promise<string>`

Version simple qui ne throw jamais. Retourne la valeur ou le fallback.

**Paramètres** :
- `label` : Nom de la clé
- `fallback` : Valeur par défaut (optionnel, défaut: `''`)

**Retour** : `Promise<string>`

**Exemple** :

```typescript
// Avec fallback
const groqKey = await fyk.safeGet('groq', 'gsk_default');

// Sans fallback (retourne '' si non trouvée)
const openaiKey = await fyk.safeGet('openai');

// Utilisation directe
console.log(groqKey); // Ne crash JAMAIS
```

**Avantages** :
- ✅ Ne throw jamais
- ✅ Pas besoin de try/catch
- ✅ Idéal pour du code simple

---

### `getMultiple(labels: string[]): Promise<Result<Record<string, Key | null>>>`

Récupère plusieurs clés en une seule requête.

**Paramètres** :
- `labels` : Tableau de noms de clés

**Retour** : `Promise<Result<Record<string, Key | null>>>`

**Exemple** :

```typescript
const result = await fyk.getMultiple(['stripe', 'openai', 'groq']);

if (result.success) {
  const stripeKey = result.data.stripe?.value;
  const openaiKey = result.data.openai?.value;
  const groqKey = result.data.groq?.value; // null si non trouvée
  
  console.log('Stripe:', stripeKey ? '✅' : '❌');
  console.log('OpenAI:', openaiKey ? '✅' : '❌');
  console.log('Groq:', groqKey ? '✅' : '❌');
}
```

---

### `refresh(): Promise<Result<boolean>>`

Force le rafraîchissement du cache depuis l'API.

**Retour** : `Promise<Result<boolean>>`

**Exemple** :

```typescript
const result = await fyk.refresh();

if (result.success) {
  console.log('✅ Cache rafraîchi');
  console.log('En ligne:', result.metadata.online);
} else {
  console.warn('⚠️ Rafraîchissement échoué');
  console.log('Raison:', result.error.message);
}
```

**Utilité** :
- Recharger les clés après modification sur le dashboard
- Forcer une synchronisation

---

### `getAll(): Promise<Key[]>`

Récupère toutes les clés disponibles.

**Retour** : `Promise<Key[]>`

**Exemple** :

```typescript
const allKeys = await fyk.getAll();

console.log(`${allKeys.length} clés disponibles:`);
allKeys.forEach(key => {
  console.log(`- ${key.label} (${key.service})`);
});
```

---

### `filter(predicate: (key: Key) => boolean): Promise<Key[]>`

Filtre les clés selon un prédicat.

**Paramètres** :
- `predicate` : Fonction de filtrage

**Retour** : `Promise<Key[]>`

**Exemple** :

```typescript
// Clés actives uniquement
const activeKeys = await fyk.filter(key => key.is_active);

// Clés Stripe
const stripeKeys = await fyk.filter(key => key.service === 'stripe');

// Clés créées récemment
const recentKeys = await fyk.filter(key => {
  const date = new Date(key.created_at);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return date.getTime() > weekAgo;
});
```

---

### `getByService(service: string): Promise<Key[]>`

Récupère toutes les clés d'un service.

**Paramètres** :
- `service` : Nom du service (ex: `'stripe'`, `'groq'`)

**Retour** : `Promise<Key[]>`

**Exemple** :

```typescript
const stripeKeys = await fyk.getByService('stripe');
console.log(`${stripeKeys.length} clés Stripe trouvées`);
```

---

## Méthodes Utilitaires

### `getStats(): object`

Récupère les statistiques du SDK.

**Retour** : Objet contenant :

```typescript
{
  cachedKeys: number;       // Nombre de clés en cache
  isOnline: boolean;        // Connexion API active
  environment: string;      // 'dev' ou 'prod'
  cacheType: string;        // Type de cache utilisé
  cacheValid: boolean;      // Cache valide pour cette clé FYK
  cacheId: string;          // ID unique du cache
  apiKey: string;           // Clé FYK maskée
  status: string;           // 🟢 EN LIGNE / 🟡 HORS LIGNE / 🔴 ERREUR
  debugEnabled: boolean;    // Mode debug actif
  silentMode: boolean;      // Mode silent actif
}
```

**Exemple** :

```typescript
const stats = fyk.getStats();

console.log('Status:', stats.status);
console.log('Clés en cache:', stats.cachedKeys);
console.log('En ligne:', stats.isOnline);
console.log('Environnement:', stats.environment);
```

---

### `getLogHistory(): Array<LogEntry>`

Récupère l'historique des logs (mode debug uniquement).

**Retour** : Tableau de logs

```typescript
interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
}
```

**Exemple** :

```typescript
const fyk = new FetchYourKeys({ debug: true, silentMode: true });

// ... opérations ...

const logs = fyk.getLogHistory();
console.log(`${logs.length} logs enregistrés`);

logs.forEach(log => {
  console.log(`[${log.timestamp}] ${log.message}`);
});
```

---

### `clearCache(): void`

Vide le cache local.

**Exemple** :

```typescript
fyk.clearCache();
console.log('Cache vidé');
```

**⚠️ Attention** : Après cette opération, une connexion internet sera nécessaire pour recharger les clés.

---

### `setDebug(enabled: boolean): void`

Active ou désactive le mode debug dynamiquement.

**Paramètres** :
- `enabled` : `true` pour activer, `false` pour désactiver

**Exemple** :

```typescript
fyk.setDebug(true);  // Activer
fyk.setDebug(false); // Désactiver
```

---

### `setSilentMode(silent: boolean): void`

Active ou désactive le mode silent dynamiquement.

**Paramètres** :
- `silent` : `true` pour activer, `false` pour désactiver

**Exemple** :

```typescript
fyk.setSilentMode(true);  // Pas de console.log
fyk.setSilentMode(false); // Console.log actifs
```

---

## Interfaces

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

---

## Erreurs

### Classes d'Erreurs

Le SDK définit plusieurs classes d'erreurs :

- `FetchYourKeysError` : Erreur générique
- `NetworkError` : Erreur réseau
- `CacheError` : Erreur de cache
- `SecurityError` : Erreur de sécurité

### Codes d'Erreur

| Code | Description | Solution |
|------|-------------|----------|
| `MISSING_API_KEY` | Clé FYK manquante | Définir FYK_SECRET_KEY |
| `UNAUTHORIZED` | Clé FYK invalide | Vérifier la clé sur le dashboard |
| `FORBIDDEN` | Clé FYK non autorisée | Générer une nouvelle clé |
| `KEY_NOT_FOUND` | Clé inexistante | Vérifier le nom sur le dashboard |
| `CACHE_INVALID` | Cache corrompu | Reconnexion nécessaire |
| `NETWORK_ERROR` | Erreur de connexion | Vérifier la connexion internet |
| `RATE_LIMIT` | Limite de requêtes | Attendre avant de réessayer |
| `SERVER_ERROR` | Erreur serveur | Réessayer plus tard |

Voir [ERROR_HANDLING.md](./ERROR_HANDLING.md) pour plus de détails.

---

## Types Exportés

Le SDK exporte tous les types pour TypeScript :

```typescript
import {
  FetchYourKeys,
  FetchYourKeysError,
  NetworkError,
  CacheError,
  SecurityError,
  type Result,
  type Key,
  type FetchYourKeysOptions
} from 'fetchyourkeys-sdk';
```

---

## Exemples Complets

Voir [EXAMPLES.md](./EXAMPLES.md) pour des exemples d'intégration complets.

---

**Besoin d'aide ?** [support@fetchyourkeys.com](mailto:support@fetchyourkeys.com)
