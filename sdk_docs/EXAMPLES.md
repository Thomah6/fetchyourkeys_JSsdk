# Exemples d'Usage

Collection d'exemples pratiques pour intégrer FetchYourKeys dans différents contextes.

---

## Table des Matières

- [Application Express.js](#application-expressjs)
- [Application Next.js](#application-nextjs)
- [Bot Discord](#bot-discord)
- [Bot de Trading](#bot-de-trading)
- [Scripts CLI](#scripts-cli)
- [Serverless Functions](#serverless-functions)
- [Tests Unitaires](#tests-unitaires)

---

## Application Express.js

### Setup de Base

```typescript
import express from 'express';
import FetchYourKeys from 'fetchyourkeys-sdk';

const app = express();
const fyk = new FetchYourKeys({
  environment: 'prod',
  silentMode: true
});

app.use(express.json());

// Route de healthcheck
app.get('/health', async (req, res) => {
  const stats = fyk.getStats();
  res.json({
    status: stats.isOnline ? 'ok' : 'degraded',
    keys_cached: stats.cachedKeys,
    cache_type: stats.cacheType
  });
});

// Route utilisant une clé API
app.post('/api/chat', async (req, res) => {
  const groqKey = await fyk.safeGet('groq');
  
  if (!groqKey) {
    return res.status(503).json({
      error: 'Service temporairement indisponible'
    });
  }
  
  // Utiliser groqKey pour appeler l'API Groq
  try {
    const response = await fetch('https://api.groq.com/...', {
      headers: { 'Authorization': `Bearer ${groqKey}` }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erreur de traitement' });
  }
});

app.listen(3000, () => {
  console.log('✅ Serveur démarré sur le port 3000');
});
```

### Middleware d'Authentification

```typescript
async function requireApiKey(keyLabel: string) {
  return async (req, res, next) => {
    const result = await fyk.get(keyLabel);
    
    if (!result.success) {
      return res.status(503).json({
        error: 'Service configuration error',
        code: result.error.code
      });
    }
    
    req.apiKey = result.data.value;
    next();
  };
}

// Utilisation
app.get('/stripe/customers', 
  requireApiKey('stripe'),
  async (req, res) => {
    const stripeKey = req.apiKey;
    // Utiliser stripeKey...
  }
);
```

---

## Application Next.js

### API Route

```typescript
// pages/api/keys/[service].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import FetchYourKeys from 'fetchyourkeys-sdk';

const fyk = new FetchYourKeys({
  environment: 'prod',
  silentMode: true
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { service } = req.query;
  
  if (typeof service !== 'string') {
    return res.status(400).json({ error: 'Service invalide' });
  }
  
  const result = await fyk.get(service);
  
  if (!result.success) {
    return res.status(404).json({
      error: result.error.message,
      code: result.error.code
    });
  }
  
  // Ne pas exposer la vraie clé, juste confirmer l'existence
  res.json({
    service: result.data.service,
    label: result.data.label,
    active: result.data.is_active
  });
}
```

### Server Component

```typescript
// app/dashboard/page.tsx
import FetchYourKeys from 'fetchyourkeys-sdk';

const fyk = new FetchYourKeys({ environment: 'prod' });

export default async function DashboardPage() {
  const allKeys = await fyk.getAll();
  
  return (
    <div>
      <h1>Mes Services Connectés</h1>
      <ul>
        {allKeys.map(key => (
          <li key={key.id}>
            {key.service} - {key.label} 
            {key.is_active ? '✅' : '❌'}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Bot Discord

```typescript
import { Client, GatewayIntentBits } from 'discord.js';
import FetchYourKeys from 'fetchyourkeys-sdk';

const fyk = new FetchYourKeys({
  environment: 'prod',
  silentMode: true
});

async function startBot() {
  // Récupérer le token Discord
  const discordToken = await fyk.safeGet('discord_bot_token');
  
  if (!discordToken) {
    console.error('❌ Token Discord non trouvé');
    process.exit(1);
  }
  
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
  });
  
  client.on('ready', () => {
    console.log(`✅ Bot connecté: ${client.user?.tag}`);
  });
  
  client.on('messageCreate', async (message) => {
    if (message.content === '!groq') {
      // Utiliser l'API Groq
      const groqKey = await fyk.safeGet('groq');
      
      if (!groqKey) {
        return message.reply('Service Groq indisponible');
      }
      
      // Appeler l'API Groq avec groqKey...
      message.reply('Réponse de Groq...');
    }
  });
  
  client.login(discordToken);
}

startBot();
```

---

## Bot de Trading

```typescript
import FetchYourKeys from 'fetchyourkeys-sdk';

const fyk = new FetchYourKeys({ environment: 'prod' });

interface TradingKeys {
  binance: string;
  telegram: string;
  coinmarketcap: string;
}

async function loadTradingKeys(): Promise<TradingKeys | null> {
  const result = await fyk.getMultiple([
    'binance_api_key',
    'telegram_bot_token',
    'coinmarketcap_api_key'
  ]);
  
  if (!result.success) {
    console.error('❌ Erreur chargement clés:', result.error.message);
    return null;
  }
  
  const binance = result.data.binance_api_key?.value;
  const telegram = result.data.telegram_bot_token?.value;
  const coinmarketcap = result.data.coinmarketcap_api_key?.value;
  
  if (!binance || !telegram || !coinmarketcap) {
    console.error('❌ Clés manquantes');
    return null;
  }
  
  return { binance, telegram, coinmarketcap };
}

async function startTradingBot() {
  const keys = await loadTradingKeys();
  
  if (!keys) {
    console.error('❌ Impossible de démarrer le bot');
    process.exit(1);
  }
  
  console.log('✅ Clés chargées, démarrage du bot...');
  
  // Initialiser le bot de trading
  // ...
}

startTradingBot();
```

---

## Scripts CLI

```typescript
#!/usr/bin/env node
import FetchYourKeys from 'fetchyourkeys-sdk';
import { program } from 'commander';

const fyk = new FetchYourKeys({ debug: true });

program
  .name('my-cli')
  .description('CLI pour gérer les clés API')
  .version('1.0.0');

program
  .command('list')
  .description('Liste toutes les clés')
  .action(async () => {
    const keys = await fyk.getAll();
    
    console.log(`\n📋 ${keys.length} clés disponibles:\n`);
    keys.forEach(key => {
      console.log(`  ${key.is_active ? '✅' : '❌'} ${key.label} (${key.service})`);
    });
  });

program
  .command('get <label>')
  .description('Récupère une clé spécifique')
  .action(async (label) => {
    const result = await fyk.get(label);
    
    if (result.success) {
      console.log(`\n✅ Clé trouvée:`);
      console.log(`   Label: ${result.data.label}`);
      console.log(`   Service: ${result.data.service}`);
      console.log(`   Valeur: ${result.data.value}`);
    } else {
      console.error(`\n❌ ${result.error.message}`);
      console.log(`   💡 ${result.error.suggestion}`);
    }
  });

program
  .command('stats')
  .description('Affiche les statistiques')
  .action(() => {
    const stats = fyk.getStats();
    console.log('\n📊 Statistiques:');
    console.log(`   Status: ${stats.status}`);
    console.log(`   Clés: ${stats.cachedKeys}`);
    console.log(`   En ligne: ${stats.isOnline}`);
    console.log(`   Cache: ${stats.cacheType}`);
  });

program.parse();
```

---

## Serverless Functions

### AWS Lambda

```typescript
import { APIGatewayProxyHandler } from 'aws-lambda';
import FetchYourKeys from 'fetchyourkeys-sdk';

// Initialisation globale (réutilisée entre invocations)
const fyk = new FetchYourKeys({
  environment: 'prod',
  silentMode: true
});

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const openaiKey = await fyk.safeGet('openai');
    
    if (!openaiKey) {
      return {
        statusCode: 503,
        body: JSON.stringify({ error: 'Service unavailable' })
      };
    }
    
    // Utiliser openaiKey...
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
```

### Vercel Serverless

```typescript
// api/chat.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import FetchYourKeys from 'fetchyourkeys-sdk';

const fyk = new FetchYourKeys({ environment: 'prod' });

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const result = await fyk.get('groq');
  
  if (!result.success) {
    return res.status(503).json({
      error: result.error.message
    });
  }
  
  const groqKey = result.data.value;
  
  // Utiliser groqKey...
  
  res.json({ success: true });
}
```

---

## Tests Unitaires

### Avec Jest

```typescript
import FetchYourKeys from 'fetchyourkeys-sdk';

describe('FetchYourKeys Integration', () => {
  let fyk: FetchYourKeys;
  
  beforeAll(() => {
    fyk = new FetchYourKeys({
      apiKey: process.env.FYK_SECRET_KEY,
      debug: false,
      silentMode: true
    });
  });
  
  test('should retrieve a key', async () => {
    const result = await fyk.get('test_key');
    
    if (result.success) {
      expect(result.data.value).toBeDefined();
      expect(result.data.label).toBe('test_key');
    }
  });
  
  test('should return error for non-existent key', async () => {
    const result = await fyk.get('non_existent_key');
    
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('KEY_NOT_FOUND');
    expect(result.error?.message).toContain('n\'existe pas');
  });
  
  test('safeGet should never throw', async () => {
    const key = await fyk.safeGet('non_existent_key', 'fallback');
    
    expect(key).toBe('fallback');
  });
  
  test('should get multiple keys', async () => {
    const result = await fyk.getMultiple(['key1', 'key2']);
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('key1');
    expect(result.data).toHaveProperty('key2');
  });
  
  test('should get stats', () => {
    const stats = fyk.getStats();
    
    expect(stats).toHaveProperty('cachedKeys');
    expect(stats).toHaveProperty('isOnline');
    expect(stats).toHaveProperty('status');
  });
});
```

### Mock pour Tests

```typescript
// __mocks__/fetchyourkeys-sdk.ts
export default class FetchYourKeysMock {
  private mockKeys: Map<string, string> = new Map([
    ['groq', 'gsk_mock_key'],
    ['openai', 'sk-mock_key']
  ]);
  
  async get(label: string) {
    const value = this.mockKeys.get(label);
    
    if (value) {
      return {
        success: true,
        data: {
          id: '1',
          label,
          service: 'mock',
          value,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        metadata: {
          cached: true,
          online: false,
          timestamp: new Date().toISOString()
        }
      };
    }
    
    return {
      success: false,
      error: {
        code: 'KEY_NOT_FOUND',
        message: `La clé "${label}" n'existe pas`,
        suggestion: 'Vérifiez le nom'
      }
    };
  }
  
  async safeGet(label: string, fallback: string = '') {
    return this.mockKeys.get(label) || fallback;
  }
  
  getStats() {
    return {
      cachedKeys: this.mockKeys.size,
      isOnline: false,
      status: '🟡 MOCK MODE'
    };
  }
}
```

---

## Pattern de Retry

```typescript
async function getKeyWithRetry(
  label: string,
  maxRetries: number = 3
): Promise<string | null> {
  for (let i = 0; i < maxRetries; i++) {
    const result = await fyk.get(label);
    
    if (result.success) {
      return result.data.value;
    }
    
    // Retry sur erreur réseau uniquement
    if (result.error.code === 'NETWORK_ERROR' && i < maxRetries - 1) {
      console.log(`Retry ${i + 1}/${maxRetries}...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      continue;
    }
    
    // Autres erreurs = arrêt
    console.error(result.error.message);
    return null;
  }
  
  return null;
}
```

---

**Besoin d'un exemple spécifique ?** [Contactez-nous](mailto:support@fetchyourkeys.com)
