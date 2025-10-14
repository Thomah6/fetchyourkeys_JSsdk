import axios from 'axios';
import dotenv from 'dotenv';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

dotenv.config();

interface Key {
  id: string;
  label: string;
  service: string;
  value: string;
  meta: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FetchYourKeysOptions {
  apiKey?: string;
  baseURL?: string;
}

// ✅ Cache mémoire global et persistant
class PersistentMemoryCache {
  private static instance: PersistentMemoryCache;
  private cache: Map<string, any> = new Map();
  private encryptionKey: Buffer;
  private apiKey: string;

  private constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.encryptionKey = this.generateEncryptionKey();
  }

  public static getInstance(apiKey: string): PersistentMemoryCache {
    if (!PersistentMemoryCache.instance) {
      PersistentMemoryCache.instance = new PersistentMemoryCache(apiKey);
    }
    return PersistentMemoryCache.instance;
  }

  private generateEncryptionKey(): Buffer {
    const salt = 'fetchyourkeys-memory-cache-v1';
    return scryptSync(this.apiKey, salt, 32);
  }

  private encrypt(data: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedData: string): any {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) throw new Error('Données chiffrées invalides');
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  set(key: string, value: any): void {
    const encryptedValue = this.encrypt(JSON.stringify(value));
    this.cache.set(key, encryptedValue);
  }

  get(key: string): any {
    const encryptedValue = this.cache.get(key);
    if (!encryptedValue) return undefined;
    
    return this.decrypt(encryptedValue);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

class FetchYourKeys {
  private apiKey: string;
  private baseURL: string;
  private cache: PersistentMemoryCache;
  private isOnline: boolean = false;
  private initializationPromise: Promise<void>;

  constructor(options: FetchYourKeysOptions = {}) {
    this.apiKey = options.apiKey || process.env.FYK_SECRET_KEY || '';
    if (!this.apiKey) {
      throw new Error('API key required via options or FYK_SECRET_KEY env');
    }
    
    this.baseURL = options.baseURL || 'https://apifetchyourkeys.vercel.app/v1/keys';
    
    // ✅ Cache mémoire persistant global
    this.cache = PersistentMemoryCache.getInstance(this.apiKey);

    this.initializationPromise = this.initializeWithOfflineSupport();
  }

  private async initializeWithOfflineSupport(): Promise<void> {
    const hasCachedData = this.cache.size() > 0;
    
    try {
      console.log('🔄 FetchYourKeys: Tentative de connexion...');
      await this.loadAllKeys();
      this.isOnline = true;
      console.log('✅ FetchYourKeys: Connexion réussie - clés à jour');
      
    } catch (error) {
      this.isOnline = false;
      
      if (hasCachedData) {
        console.log(`⚠️ FetchYourKeys: Mode hors ligne - utilisation du cache mémoire (${this.cache.size()} clés)`);
      } else {
        console.error('❌ FetchYourKeys: ERREUR CRITIQUE - Pas de connexion et cache vide');
        console.log('💡 Solution: Vérifiez votre connexion internet');
      }
    }
  }

  private async waitForInitialization(): Promise<void> {
    await this.initializationPromise;
  }

  private async loadAllKeys(): Promise<void> {
    const response = await axios.get<{ data: Key[] }>(this.baseURL, {
      headers: { 'x-fyk-key': this.apiKey },
      timeout: 10000
    });

    if (response.data?.data) {
      // ✅ Vide le cache avant de le remplir
      this.cache.clear();
      
      response.data.data.forEach(key => {
        this.cache.set(key.label, key);
      });
      
      console.log(`💾 Cache mémoire chargé: ${this.cache.size()} clés`);
    }
  }

  async get(label: string): Promise<Key | null> {
    await this.waitForInitialization();

    const cached = this.cache.get(label);
    if (cached) return this.sanitizeKey(cached);

    if (this.isOnline) {
      try {
        await this.loadAllKeys();
        const refreshed = this.cache.get(label);
        if (refreshed) return this.sanitizeKey(refreshed);
      } catch {
        this.isOnline = false;
      }
    }

    return null;
  }

  async getWithFallback(label: string, fallback?: string): Promise<string> {
    await this.waitForInitialization();

    const cached = this.cache.get(label);
    if (cached?.value) return cached.value;

    if (!this.isOnline && !cached) {
      console.warn(`⚠️ Clé "${label}" non trouvée en cache - utilisation du fallback`);
    }

    return fallback || '';
  }

  async getMultiple(labels: string[]): Promise<Record<string, Key | null>> {
    await this.waitForInitialization();
    
    const results: Record<string, Key | null> = {};
    
    labels.forEach(label => {
      const cached = this.cache.get(label);
      results[label] = cached ? this.sanitizeKey(cached) : null;
    });

    if (!this.isOnline) {
      const missing = labels.filter(label => !results[label]);
      if (missing.length > 0) {
        console.warn(`⚠️ Clés manquantes en cache: ${missing.join(', ')}`);
      }
    }

    return results;
  }

  async getAll(): Promise<Key[]> {
    await this.waitForInitialization();
    
    return this.cache.keys().map(key => this.sanitizeKey(this.cache.get(key)));
  }

  async filter(predicate: (key: Key) => boolean): Promise<Key[]> {
    const allKeys = await this.getAll();
    return allKeys.filter(predicate);
  }

  async getByService(service: string): Promise<Key[]> {
    return this.filter(key => key.service === service);
  }

  async refresh(): Promise<boolean> {
    try {
      console.log('🔄 FetchYourKeys: Tentative de rafraîchissement...');
      await this.loadAllKeys();
      this.isOnline = true;
      console.log('✅ FetchYourKeys: Cache rafraîchi avec succès');
      return true;
    } catch (error) {
      this.isOnline = false;
      const hasData = this.cache.size() > 0;
      
      if (hasData) {
        console.warn('⚠️ FetchYourKeys: Rafraîchissement échoué - utilisation du cache mémoire');
      } else {
        console.error('❌ FetchYourKeys: IMPOSSIBLE de rafraîchir - pas de connexion et cache vide');
      }
      return false;
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      await axios.get(this.baseURL, {
        headers: { 'x-fyk-key': this.apiKey },
        timeout: 5000
      });
      this.isOnline = true;
      return true;
    } catch {
      this.isOnline = false;
      return false;
    }
  }

  private sanitizeKey(key: Key): Key {
    const { meta, ...sanitized } = key;
    return sanitized as Key;
  }

  getStats() {
    const cacheKeys = this.cache.keys();
    return {
      cachedKeys: cacheKeys.length,
      isOnline: this.isOnline,
      status: this.isOnline ? '🟢 EN LIGNE' : (cacheKeys.length > 0 ? '🟡 HORS LIGNE (cache mémoire)' : '🔴 HORS LIGNE (vide)'),
      cacheType: 'Mémoire persistante chiffrée'
    };
  }

  /**
   * Nettoie complètement le cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Cache mémoire nettoyé');
  }

  destroy(): void {
    this.cache.clear();
  }
}

export default FetchYourKeys;