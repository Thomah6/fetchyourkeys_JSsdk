"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FetchYourKeysCJS = void 0;
const axios_1 = __importDefault(require("axios"));
const node_cache_1 = __importDefault(require("node-cache"));
const dotenv_1 = __importDefault(require("dotenv"));
// Charger les variables d'environnement
dotenv_1.default.config();
class FetchYourKeys {
    /**
     * Initializes the FetchYourKeys SDK.
     * @param {FetchYourKeysOptions} options - Configuration options for the SDK.
     * @param {string} [options.apiKey] - API key for authentication (optional if set via env).
     * @param {string} [options.baseURL] - Base URL for the API (defaults to production URL).
     * @throws {Error} If API key is missing.
     */
    constructor(options = {}) {
        this.loaded = false; // Flag to avoid repeated loads
        this.apiKey = options.apiKey || process.env.FYK_SECRET_KEY || '';
        if (!this.apiKey) {
            throw new Error('API key is required. Set it via options or FYK_SECRET_KEY environment variable.');
        }
        this.baseURL = options.baseURL || 'https://apifetchyourkeys.vercel.app/v1/keys';
        this.cache = new node_cache_1.default({ stdTTL: 0, checkperiod: 0 });
        this.loadAllKeys().catch(() => console.log('⚠️ Offline mode: Using cached keys only.')); // Non-blocking for offline
    }
    /**
     * Loads all keys from the API into the cache.
     * @private
     * @returns {Promise<void>} Resolves when keys are loaded.
     * @throws {Error} If API response is invalid or network fails.
     */
    async loadAllKeys() {
        try {
            const response = await axios_1.default.get(this.baseURL, {
                headers: { 'x-fyk-key': this.apiKey }
            });
            console.log('🚀 FYK SDK initialized successfully!'); // Initialization log
            if (response.data && Array.isArray(response.data.data)) {
                this.cache.mset(response.data.data.map((key) => ({ key: key.label, val: key })));
            }
            else {
                throw new Error('Unexpected response: data is not an array of keys');
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('❌ Error loading keys (offline mode):', errorMessage); // Non-throwing for offline
            // Don't throw: allow offline usage with cached data
        }
    }
    /**
     * Retrieves a specific key by label from cache or API.
     * @param {string} label - The label of the key to retrieve.
     * @returns {Promise<Key | null>} The key object or null if not found.
     */
    async get(label) {
        const cachedKey = this.cache.get(label);
        if (cachedKey) {
            const { meta, ...safeKey } = cachedKey;
            return safeKey;
        }
        if (!this.loaded) {
            this.loaded = true;
            await this.loadAllKeys();
            const newKey = this.cache.get(label);
            if (newKey) {
                const { meta, ...safeKey } = newKey;
                return safeKey;
            }
        }
        return null; // No reload on miss for offline
    }
    /**
     * Retrieves all keys from the cache.
     * @returns {Promise<Key[]>} Array of all cached keys.
     */
    async getAll() {
        const keys = this.cache.mget(this.cache.keys());
        return Object.values(keys).map(key => {
            const { meta, ...safeKey } = key;
            return safeKey;
        });
    }
}
exports.FetchYourKeysCJS = FetchYourKeys;
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FetchYourKeys;
    module.exports.default = FetchYourKeys;
}
exports.default = FetchYourKeys;
//# sourceMappingURL=index0.js.map