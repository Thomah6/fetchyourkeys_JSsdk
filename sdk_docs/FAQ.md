# FAQ - Questions Fréquentes

Réponses aux questions les plus courantes sur FetchYourKeys SDK.

---

## Installation & Configuration

### Comment installer FetchYourKeys ?

```bash
npm install fetchyourkeys-sdk
# ou
yarn add fetchyourkeys-sdk
```

### Où trouver ma clé FYK_SECRET_KEY ?

1. Connectez-vous sur [https://fetchyourkeys.vercel.app](https://fetchyourkeys.vercel.app)
2. Accédez à votre dashboard
3. Cliquez sur "Générer une clé" ou "Voir mes clés"
4. Copiez votre `FYK_SECRET_KEY`

### Comment configurer le fichier .env ?

Créez un fichier `.env` à la racine de votre projet :

```env
FYK_SECRET_KEY=fk_votre_cle_secrete_ici
```

**Important** : Ajoutez `.env` à votre `.gitignore` !

---

## Utilisation

### Quelle est la différence entre `get()` et `safeGet()` ?

| Méthode | Retour | Erreurs | Usage |
|---------|--------|---------|-------|
| `get()` | `Result<Key>` | Gestion fine | Code avec conditions |
| `safeGet()` | `string` | Jamais de throw | Code simple avec fallback |

**Exemple** :

```typescript
// get() - Gestion fine
const result = await fyk.get('groq');
if (result.success) {
  console.log(result.data.value);
}

// safeGet() - Simple
const key = await fyk.safeGet('groq', 'fallback');
console.log(key); // Ne crash jamais
```

### Comment récupérer plusieurs clés en une fois ?

```typescript
const result = await fyk.getMultiple(['stripe', 'openai', 'groq']);

if (result.success) {
  const stripe = result.data.stripe?.value;
  const openai = result.data.openai?.value;
  const groq = result.data.groq?.value;
}
```

### Le SDK fonctionne-t-il hors ligne ?

**Oui** ! FetchYourKeys utilise un cache intelligent :

- **Mode dev** : Cache disque chiffré (survit aux redémarrages)
- **Mode prod** : Cache RAM (performances maximales)

Si vous êtes hors ligne mais avez un cache, le SDK continue de fonctionner.

```typescript
const stats = fyk.getStats();
console.log(stats.status); // 🟡 HORS LIGNE (avec cache)
```

---

## Sécurité

### Mes clés API sont-elles sécurisées ?

**Oui, absolument.** FetchYourKeys utilise :

- ✅ Chiffrement AES-256-GCM de bout en bout
- ✅ Clés jamais stockées en clair
- ✅ Cache local chiffré
- ✅ Protection contre les accès non autorisés

Les détails de l'implémentation sont gardés confidentiels pour renforcer la sécurité.

### Puis-je commit ma clé FYK_SECRET_KEY dans Git ?

**NON, JAMAIS !** 

La `FYK_SECRET_KEY` doit rester secrète. Toujours :
1. La stocker dans `.env`
2. Ajouter `.env` au `.gitignore`
3. Ne jamais la hardcoder dans le code

### Que faire si ma clé FYK est compromise ?

1. Connectez-vous au dashboard
2. Générez une nouvelle clé
3. Mettez à jour `.env`
4. Redéployez votre application
5. Supprimez l'ancienne clé

Le SDK gère automatiquement la transition.

---

## Environnements

### Quelle est la différence entre 'dev' et 'prod' ?

| Mode | Cache | Logs | Usage |
|------|-------|------|-------|
| **dev** | Disque chiffré | Visibles | Développement |
| **prod** | RAM sécurisée | Silent | Production |

**Développement** :
```typescript
const fyk = new FetchYourKeys({
  environment: 'dev',
  debug: true
});
```

**Production** :
```typescript
const fyk = new FetchYourKeys({
  environment: 'prod',
  silentMode: true
});
```

### Comment désactiver les logs en production ?

```typescript
const fyk = new FetchYourKeys({
  silentMode: true  // Pas de console.log
});
```

Les logs sont toujours accessibles via `getLogHistory()` en mode debug.

---

## Erreurs

### Erreur : "Clé API FetchYourKeys invalide ou expirée"

**Causes possibles** :
1. La clé dans `.env` est incorrecte
2. La clé a été supprimée sur le dashboard
3. La clé a expiré

**Solution** :
1. Vérifiez que `FYK_SECRET_KEY` dans `.env` est correcte
2. Connectez-vous au dashboard et vérifiez que la clé est active
3. Générez une nouvelle clé si nécessaire

### Erreur : "La clé 'xxx' n'existe pas"

**Cause** : La clé demandée n'existe pas dans votre compte.

**Solutions** :
1. Vérifiez le nom exact sur votre dashboard (casse sensible)
2. Ajoutez la clé sur le dashboard si elle n'existe pas
3. Utilisez `safeGet()` avec fallback pour éviter l'erreur

```typescript
const key = await fyk.safeGet('groq', 'fallback');
```

### Le SDK est "HORS LIGNE" mais je suis connecté

**C'est normal si** :
- C'est la première utilisation (pas encore de cache)
- Le cache est en cours de chargement

**Attendez quelques secondes** et le statut passera à "EN LIGNE".

Si le problème persiste :
```typescript
const result = await fyk.refresh();
```

---

## Performance

### Le SDK est-il rapide ?

**Oui, très rapide** grâce au cache :

- **Premier appel** : ~2-3s (chargement depuis l'API)
- **Appels suivants** : < 1ms (lecture du cache)

En mode `prod`, le cache RAM est encore plus rapide.

### Combien de requêtes API sont effectuées ?

**Très peu** ! Le SDK :
1. Charge toutes les clés au démarrage (1 requête)
2. Utilise le cache pour tous les appels suivants
3. Rafraîchit uniquement sur demande avec `refresh()`

### Puis-je utiliser FetchYourKeys dans un serverless ?

**Oui, parfaitement** ! Exemples :

**AWS Lambda** :
```typescript
const fyk = new FetchYourKeys({ environment: 'prod' });
// L'instance est réutilisée entre invocations
```

**Vercel** :
```typescript
const fyk = new FetchYourKeys({ environment: 'prod' });
// Fonctionne parfaitement
```

---

## Développement

### Comment déboguer mon code ?

```typescript
const fyk = new FetchYourKeys({
  debug: true,
  silentMode: false  // Voir les logs
});

// Récupérer l'historique
const logs = fyk.getLogHistory();
```

### Comment tester mon code avec FetchYourKeys ?

Voir [EXAMPLES.md - Section Tests](./EXAMPLES.md#tests-unitaires) pour des exemples complets.

**Pattern simple** :

```typescript
// __mocks__/fetchyourkeys-sdk.ts
export default class FetchYourKeysMock {
  async safeGet(label: string, fallback = '') {
    return { 'groq': 'gsk_mock' }[label] || fallback;
  }
}
```

### Puis-je contribuer au SDK ?

Le SDK est open-source ! Contributions bienvenues sur [GitHub](https://github.com/fetchyourkeys/sdk).

---

## Pricing & Limites

### FetchYourKeys est-il gratuit ?

**Oui**, la version de base est gratuite et inclut :
- Stockage illimité de clés
- Cache intelligent
- Support communautaire

Des plans payants avec fonctionnalités avancées sont disponibles.

### Y a-t-il une limite de clés ?

**Non**, vous pouvez stocker autant de clés que nécessaire.

### Y a-t-il un rate limit ?

Oui, pour protéger l'infrastructure :
- **Plan gratuit** : 100 requêtes/min
- **Plan Pro** : 1000 requêtes/min
- **Plan Enterprise** : Illimité

Mais grâce au cache, vous atteignez rarement ces limites.

---

## Support

### Comment obtenir de l'aide ?

1. **Documentation** : [docs.fetchyourkeys.com](https://docs.fetchyourkeys.com)
2. **Discord** : [discord.gg/fetchyourkeys](https://discord.gg/fetchyourkeys)
3. **Email** : [support@fetchyourkeys.com](mailto:support@fetchyourkeys.com)
4. **GitHub Issues** : [github.com/fetchyourkeys/sdk/issues](https://github.com/fetchyourkeys/sdk/issues)

### Où signaler un bug ?

[GitHub Issues](https://github.com/fetchyourkeys/sdk/issues) avec :
- Version du SDK (`npm list fetchyourkeys-sdk`)
- Code de reproduction
- Logs d'erreur

### Où proposer une feature ?

[GitHub Discussions](https://github.com/fetchyourkeys/sdk/discussions) ou notre [Discord](https://discord.gg/fetchyourkeys).

---

## Migration

### Je viens de dotenv, comment migrer ?

**Avant** :
```typescript
const groqKey = process.env.GROQ_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY;
```

**Après** :
```typescript
import FetchYourKeys from 'fetchyourkeys-sdk';

const fyk = new FetchYourKeys();
const groqKey = await fyk.safeGet('groq');
const openaiKey = await fyk.safeGet('openai');
```

**Avantages** :
- ✅ Clés chiffrées
- ✅ Partage d'équipe facile
- ✅ Rotation simplifiée
- ✅ Mode offline
- ✅ Gestion d'erreurs claire

### J'utilise déjà un système de vault, pourquoi changer ?

FetchYourKeys est **plus simple** :
- Pas de configuration complexe
- Pas de serveur à gérer
- Gratuit pour commencer
- Mode offline natif
- Developer experience exceptionnelle

Mais vous pouvez aussi les combiner !

---

## Cas d'Usage

### Puis-je utiliser FetchYourKeys pour un projet perso ?

**Absolument** ! C'est parfait pour :
- Prototypes
- Side projects
- Applications personnelles
- Bots Discord/Telegram
- Scripts d'automatisation

### Puis-je utiliser FetchYourKeys en entreprise ?

**Oui** ! Des plans Enterprise avec :
- SSO
- Audit logs
- Support prioritaire
- SLA garanti

Contactez [enterprise@fetchyourkeys.com](mailto:enterprise@fetchyourkeys.com).

### Puis-je utiliser FetchYourKeys pour plusieurs projets ?

**Oui** ! Créez une clé FYK par projet pour isoler les clés.

---

## Autre

### Le SDK fonctionne-t-il avec TypeScript ?

**Oui, nativement** ! Le SDK est écrit en TypeScript et exporte tous les types :

```typescript
import FetchYourKeys, { type Result, type Key } from 'fetchyourkeys-sdk';
```

### Le SDK fonctionne-t-il avec JavaScript pur ?

**Oui** ! Il fonctionne parfaitement en JavaScript classique :

```javascript
const FetchYourKeys = require('fetchyourkeys-sdk').default;
const fyk = new FetchYourKeys();
```

### Puis-je utiliser FetchYourKeys côté client (navigateur) ?

**Non recommandé** ! La clé `FYK_SECRET_KEY` doit rester secrète.

Utilisez FetchYourKeys uniquement :
- ✅ Backend (Node.js)
- ✅ Serverless functions
- ✅ API Routes (Next.js)
- ❌ Frontend (React, Vue, Angular)

---

**Votre question n'est pas listée ?** [Contactez-nous](mailto:support@fetchyourkeys.com)
