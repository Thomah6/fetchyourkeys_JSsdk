import axios from 'axios';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();



// Interfaces basées sur l'API réelle (modèle Key de l'API)
interface Key {
  id: string;
  label: string;
  service: string;
  value: string;
  meta: {
    tags?: string[];
    notes?: string;
    [key: string]: any;  // Propriétés dynamiques pour le reste
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FetchYourKeysOptions {
  apiKey?: string;
  baseURL?: string;
}

class FetchYourKeys {
  private apiKey: string;
  private baseURL: string;
  private cache: NodeCache;
  private loaded = false;  // Flag to avoid repeated loads

  /**
   * Initializes the FetchYourKeys SDK.
   * @param {FetchYourKeysOptions} options - Configuration options for the SDK.
   * @param {string} [options.apiKey] - API key for authentication (optional if set via env).
   * @param {string} [options.baseURL] - Base URL for the API (defaults to production URL).
   * @throws {Error} If API key is missing.
   */
  constructor(options: FetchYourKeysOptions = {}) {
    this.apiKey = options.apiKey || process.env.FYK_SECRET_KEY || '';
    if (!this.apiKey) {
      throw new Error('API key is required. Set it via options or FYK_SECRET_KEY environment variable.');
    }
    this.baseURL = options.baseURL || 'https://apifetchyourkeys.vercel.app/v1/keys';
    this.cache = new NodeCache({ stdTTL: 0, checkperiod: 0 });
    this.loadAllKeys().catch(() => console.log('⚠️ Offline mode: Using cached keys only.'));  // Non-blocking for offline
  }

  /**
   * Loads all keys from the API into the cache.
   * @private
   * @returns {Promise<void>} Resolves when keys are loaded.
   * @throws {Error} If API response is invalid or network fails.
   */
  private async loadAllKeys(): Promise<void> {
    try {
      const response = await axios.get<{ success: boolean; data: Key[]; count: number; decryption_stats: any }>(this.baseURL, {
        headers: { 'x-fyk-key': this.apiKey }
      });
      console.log('🚀 FYK SDK initialized successfully!');  // Initialization log
      if (response.data && Array.isArray(response.data.data)) {
        this.cache.mset(response.data.data.map((key: Key) => ({ key: key.label, val: key })));
      } else {
        throw new Error('Unexpected response: data is not an array of keys');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Error loading keys (offline mode):', errorMessage);  // Non-throwing for offline
      // Don't throw: allow offline usage with cached data
    }
  }

  /**
   * Retrieves a specific key by label from cache or API.
   * @param {string} label - The label of the key to retrieve.
   * @returns {Promise<Key | null>} The key object or null if not found.
   */
  async get(label: string): Promise<Key | null> {
    const cachedKey = this.cache.get(label) as Key | undefined;
    if (cachedKey) {
      const { meta, ...safeKey } = cachedKey;
      return safeKey as Key;
    }
    if (!this.loaded) {
      this.loaded = true;
      await this.loadAllKeys();
      const newKey = this.cache.get(label) as Key | undefined;
      if (newKey) {
        const { meta, ...safeKey } = newKey;
        return safeKey as Key;
      }
    }
    return null;  // No reload on miss for offline
  }

  /**
   * Retrieves all keys from the cache.
   * @returns {Promise<Key[]>} Array of all cached keys.
   */
  async getAll(): Promise<Key[]> {
    const keys = this.cache.mget(this.cache.keys()) as { [key: string]: Key };
    return Object.values(keys).map(key => {
      const { meta, ...safeKey } = key;
      return safeKey as Key;
    });
  }
}


if (typeof module !== 'undefined' && module.exports) {
    module.exports = FetchYourKeys;
    module.exports.default = FetchYourKeys;
}

export default FetchYourKeys;
export { FetchYourKeys as FetchYourKeysCJS };
