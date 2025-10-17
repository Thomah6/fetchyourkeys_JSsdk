# Gestion d'Erreurs

Guide complet sur la gestion des erreurs dans FetchYourKeys SDK.

---

## 📋 Table des Matières

- [Structure des Erreurs](#structure-des-erreurs)
- [Codes d'Erreur](#codes-derreur)
- [Gestion par Méthode](#gestion-par-méthode)
- [Bonnes Pratiques](#bonnes-pratiques)
- [Exemples](#exemples)

---

## Structure des Erreurs

Toutes les erreurs suivent une structure standardisée via le type `Result<T>` :

```typescript
interface Result<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;           // Code d'erreur standardisé
    message: string;        // Message user-friendly
    suggestion?: string;    // Solution proposée
    details?: any;          // Détails supplémentaires
  };
  metadata?: {
    cached: boolean;
    online: boolean;
    timestamp: string;
  };
}
```

**Avantage** : Vous savez toujours à quoi vous attendre. Pas d'exception surprise, pas de null inattendu.

---

## Codes d'Erreur

### `MISSING_API_KEY`

**Quand** : La clé FYK n'est pas fournie lors de l'initialisation.

**Message** : `"Clé API manquante"`

**Solution** :
```typescript
// ❌ Erreur
const fyk = new FetchYourKeys();

// ✅ Correct
const fyk = new FetchYourKeys({
  apiKey: process.env.FYK_SECRET_KEY
});
```

**Détails** :
```json
{
  "suggestion": "Définissez FYK_SECRET_KEY dans .env ou passez apiKey dans les options",
  "example": "new FetchYourKeys({ apiKey: 'your-key' })"
}
```

---

### `UNAUTHORIZED`

**Quand** : La clé FYK est invalide ou expirée (HTTP 401).

**Message** : `"Clé API FetchYourKeys invalide ou expirée"`

**Solution** :
1. Vérifiez que `FYK_SECRET_KEY` dans `.env` est correcte
2. Connectez-vous au dashboard et vérifiez que la clé est active
3. Générez une nouvelle clé si nécessaire

**Exemple** :
```typescript
const fyk = new FetchYourKeys({
  apiKey: 'fk_mauvaise_cle_123'
});
// Error: Clé API FetchYourKeys invalide ou expirée
```

**Détails** :
```json
{
  "suggestion": "Vérifiez que votre clé FYK_SECRET_KEY est correcte et active sur https://fetchyourkeys.vercel.app",
  "baseURL": "https://apifetchyourkeys.vercel.app/v1/keys",
  "apiKey": "fk_9***0e15"
}
```

---

### `FORBIDDEN`

**Quand** : La clé FYK n'a pas les permissions nécessaires (HTTP 403).

**Message** : `"Accès refusé avec cette clé API"`

**Solution** : Générez une nouvelle clé avec les bonnes permissions sur le dashboard.

**Détails** :
```json
{
  "suggestion": "Cette clé API n'a pas les permissions nécessaires. Générez une nouvelle clé sur votre dashboard"
}
```

---

### `KEY_NOT_FOUND`

**Quand** : La clé demandée n'existe pas dans votre compte.

**Message** : `"La clé 'xxx' n'existe pas"`

**Solution** :
1. Vérifiez le nom exact sur votre dashboard
2. Ajoutez la clé si elle n'existe pas
3. Utilisez `safeGet()` avec fallback pour éviter l'erreur

**Exemple** :
```typescript
const result = await fyk.get('groqq'); // Typo

if (!result.success) {
  console.log(result.error.message);
  // "La clé 'groqq' n'existe pas"
  
  console.log(result.error.details?.availableKeys);
  // ['groq', 'openai', 'stripe', ...]
}
```

**Détails** :
```json
{
  "label": "groqq",
  "availableKeys": ["groq", "openai", "stripe", "claude", ...]
}
```

---

### `NETWORK_ERROR`

**Quand** : Impossible de se connecter à l'API FetchYourKeys.

**Message** : Variable selon la cause

**Solutions possibles** :
- Vérifiez votre connexion internet
- Vérifiez que l'API FetchYourKeys est accessible
- Utilisez le cache hors ligne si disponible

**Exemple** :
```typescript
const result = await fyk.get('groq');

if (!result.success && result.error.code === 'NETWORK_ERROR') {
  console.log('Mode hors ligne');
  
  // Le cache peut toujours fonctionner
  const cached = await fyk.safeGet('groq', 'fallback');
}
```

---

### `CACHE_INVALID`

**Quand** : Le cache local est corrompu ou invalide pour cette clé FYK.

**Message** : `"Cache invalide pour cette clé API"`

**Solution** : Reconnectez-vous à internet pour recharger le cache.

**Exemple** :
```typescript
const result = await fyk.get('groq');

if (result.error?.code === 'CACHE_INVALID') {
  console.log('Rechargement nécessaire...');
  await fyk.refresh();
}
```

---

### `RATE_LIMIT`

**Quand** : Trop de requêtes ont été envoyées (HTTP 429).

**Message** : `"Limite de requêtes atteinte"`

**Solution** : Attendez quelques instants avant de réessayer.

**Exemple avec retry** :
```typescript
async function getWithRetry(label: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const result = await fyk.get(label);
    
    if (result.success) {
      return result.data.value;
    }
    
    if (result.error.code === 'RATE_LIMIT') {
      console.log(`Retry dans ${2 ** i} secondes...`);
      await new Promise(r => setTimeout(r, 1000 * (2 ** i)));
      continue;
    }
    
    return null;
  }
}
```

---

### `SERVER_ERROR`

**Quand** : Erreur serveur FetchYourKeys (HTTP 500).

**Message** : `"Erreur serveur FetchYourKeys"`

**Solution** : Réessayez dans quelques instants. Si le problème persiste, contactez le support.

---

## Gestion par Méthode

### `get(label: string)`

**Ne throw jamais**. Retourne toujours un `Result<Key>`.

```typescript
const result = await fyk.get('groq');

if (result.success) {
  // ✅ Clé trouvée
  const key = result.data.value;
} else {
  // ❌ Erreur gérée proprement
  switch (result.error.code) {
    case 'KEY_NOT_FOUND':
      console.log('Clé inexistante');
      break;
    case 'NETWORK_ERROR':
      console.log('Hors ligne');
      break;
    default:
      console.log('Erreur:', result.error.message);
  }
}
```

---

### `safeGet(label: string, fallback?: string)`

**Ne throw JAMAIS**. Retourne toujours une string.

```typescript
// ✅ Jamais d'erreur, jamais de null
const key = await fyk.safeGet('groq', 'default');

// Même si groq n'existe pas, pas de crash
console.log(key); // 'default' ou la vraie clé
```

**Utilisation recommandée** : Pour du code simple où vous avez un fallback.

---

### `getMultiple(labels: string[])`

**Ne throw jamais**. Retourne `Result<Record>`.

```typescript
const result = await fyk.getMultiple(['groq', 'openai', 'claude']);

if (result.success) {
  // Les clés inexistantes sont null
  const groq = result.data.groq?.value;      // string | undefined
  const openai = result.data.openai?.value;  // string | undefined
  const claude = result.data.claude?.value;  // string | undefined
  
  // Gérer les nulls
  if (!groq) console.log('Groq non trouvée');
}
```

---

### `refresh()`

**Ne throw jamais**. Retourne `Result<boolean>`.

```typescript
const result = await fyk.refresh();

if (result.success) {
  console.log('✅ Cache rafraîchi');
} else {
  console.log('❌ Rafraîchissement échoué');
  console.log('Raison:', result.error.message);
  
  // Peut continuer en mode offline si cache existe
  if (result.error.code === 'NETWORK_ERROR') {
    console.log('Mode hors ligne activé');
  }
}
```

---

## Bonnes Pratiques

### ✅ À FAIRE

**1. Toujours vérifier `success` avant d'utiliser `data`**

```typescript
const result = await fyk.get('groq');

if (result.success) {
  const key = result.data.value; // Safe
}
```

**2. Afficher les suggestions d'erreur**

```typescript
if (!result.success) {
  console.error(result.error.message);
  console.log('💡', result.error.suggestion);
}
```

**3. Utiliser `safeGet()` quand vous avez un fallback**

```typescript
const key = await fyk.safeGet('groq', 'default');
// Pas besoin de if/else
```

**4. Gérer les codes d'erreur spécifiques**

```typescript
if (result.error?.code === 'KEY_NOT_FOUND') {
  // Logique spécifique
}
```

**5. Logger les erreurs en production**

```typescript
if (!result.success) {
  logger.error('FetchYourKeys error', {
    code: result.error.code,
    message: result.error.message
  });
}
```

---

### ❌ À ÉVITER

**1. Ignorer les erreurs**

```typescript
// ❌ Mauvais
const result = await fyk.get('groq');
const key = result.data.value; // Peut être undefined !

// ✅ Bon
if (result.success) {
  const key = result.data.value;
}
```

**2. Ne pas gérer les cas offline**

```typescript
// ❌ Mauvais
const result = await fyk.get('groq');
if (!result.success) {
  throw new Error('Clé non trouvée'); // Trop brutal
}

// ✅ Bon
if (!result.success) {
  if (result.error.code === 'NETWORK_ERROR') {
    console.log('Mode offline, utilisation du cache');
  }
}
```

**3. Exposer les détails techniques aux utilisateurs finaux**

```typescript
// ❌ Mauvais
res.status(500).json({ error: result.error });

// ✅ Bon
res.status(500).json({
  error: 'Service temporairement indisponible',
  code: 'SERVICE_ERROR'
});
```

---

## Exemples de Patterns

### Pattern: Fallback en Cascade

```typescript
async function getApiKey(): Promise<string> {
  // Essai 1: FetchYourKeys
  const result = await fyk.get('groq');
  if (result.success) return result.data.value;
  
  // Essai 2: Variable d'env
  const envKey = process.env.GROQ_API_KEY;
  if (envKey) return envKey;
  
  // Essai 3: Valeur par défaut
  return 'gsk_default_key';
}
```

### Pattern: Retry avec Backoff

```typescript
async function getWithBackoff(
  label: string,
  maxRetries = 3
): Promise<string | null> {
  for (let i = 0; i < maxRetries; i++) {
    const result = await fyk.get(label);
    
    if (result.success) {
      return result.data.value;
    }
    
    // Retry uniquement sur erreur réseau
    if (result.error.code === 'NETWORK_ERROR' && i < maxRetries - 1) {
      const delay = 1000 * (2 ** i); // 1s, 2s, 4s
      await new Promise(r => setTimeout(r, delay));
      continue;
    }
    
    // Autres erreurs: arrêt
    console.error(result.error.message);
    return null;
  }
  
  return null;
}
```

### Pattern: Cache-first avec Refresh

```typescript
async function getCachedOrFresh(label: string): Promise<string | null> {
  // Essayer d'abord le cache
  const cached = await fyk.safeGet(label);
  if (cached) return cached;
  
  // Rafraîchir et réessayer
  const refreshed = await fyk.refresh();
  if (!refreshed.success) return null;
  
  return await fyk.safeGet(label);
}
```

---

## Monitoring des Erreurs

### Logger les Erreurs

```typescript
function logError(result: Result<any>, context: string) {
  if (!result.success) {
    console.error(`[${context}] Erreur FetchYourKeys`, {
      code: result.error.code,
      message: result.error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Utilisation
const result = await fyk.get('groq');
logError(result, 'chat-endpoint');
```

### Métriques

```typescript
const metrics = {
  success: 0,
  errors: {} as Record<string, number>
};

async function getWithMetrics(label: string) {
  const result = await fyk.get(label);
  
  if (result.success) {
    metrics.success++;
  } else {
    const code = result.error.code;
    metrics.errors[code] = (metrics.errors[code] || 0) + 1;
  }
  
  return result;
}

// Afficher les métriques
setInterval(() => {
  console.log('Métriques:', metrics);
}, 60000);
```

---

**Besoin d'aide ?** [support@fetchyourkeys.com](mailto:support@fetchyourkeys.com)
