"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const crypto_1 = require("crypto");
dotenv_1.default.config();
// ✅ Cache mémoire global et persistant
class PersistentMemoryCache {
    constructor(apiKey) {
        this.cache = new Map();
        this.apiKey = apiKey;
        this.encryptionKey = this.generateEncryptionKey();
    }
    static getInstance(apiKey) {
        if (!PersistentMemoryCache.instance) {
            PersistentMemoryCache.instance = new PersistentMemoryCache(apiKey);
        }
        return PersistentMemoryCache.instance;
    }
    generateEncryptionKey() {
        const salt = 'fetchyourkeys-memory-cache-v1';
        return (0, crypto_1.scryptSync)(this.apiKey, salt, 32);
    }
    encrypt(data) {
        const iv = (0, crypto_1.randomBytes)(16);
        const cipher = (0, crypto_1.createCipheriv)('aes-256-gcm', this.encryptionKey, iv);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    }
    decrypt(encryptedData) {
        const parts = encryptedData.split(':');
        if (parts.length !== 3)
            throw new Error('Données chiffrées invalides');
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];
        const decipher = (0, crypto_1.createDecipheriv)('aes-256-gcm', this.encryptionKey, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return JSON.parse(decrypted);
    }
    set(key, value) {
        const encryptedValue = this.encrypt(JSON.stringify(value));
        this.cache.set(key, encryptedValue);
    }
    get(key) {
        const encryptedValue = this.cache.get(key);
        if (!encryptedValue)
            return undefined;
        return this.decrypt(encryptedValue);
    }
    has(key) {
        return this.cache.has(key);
    }
    delete(key) {
        return this.cache.delete(key);
    }
    keys() {
        return Array.from(this.cache.keys());
    }
    clear() {
        this.cache.clear();
    }
    size() {
        return this.cache.size;
    }
}
class FetchYourKeys {
    constructor(options = {}) {
        this.isOnline = false;
        this.apiKey = options.apiKey || process.env.FYK_SECRET_KEY || '';
        if (!this.apiKey) {
            throw new Error('API key required via options or FYK_SECRET_KEY env');
        }
        this.baseURL = options.baseURL || 'https://apifetchyourkeys.vercel.app/v1/keys';
        // ✅ Cache mémoire persistant global
        this.cache = PersistentMemoryCache.getInstance(this.apiKey);
        this.initializationPromise = this.initializeWithOfflineSupport();
    }
    async initializeWithOfflineSupport() {
        const hasCachedData = this.cache.size() > 0;
        try {
            console.log('🔄 FetchYourKeys: Tentative de connexion...');
            await this.loadAllKeys();
            this.isOnline = true;
            console.log('✅ FetchYourKeys: Connexion réussie - clés à jour');
        }
        catch (error) {
            this.isOnline = false;
            if (hasCachedData) {
                console.log(`⚠️ FetchYourKeys: Mode hors ligne - utilisation du cache mémoire (${this.cache.size()} clés)`);
            }
            else {
                console.error('❌ FetchYourKeys: ERREUR CRITIQUE - Pas de connexion et cache vide');
                console.log('💡 Solution: Vérifiez votre connexion internet');
            }
        }
    }
    async waitForInitialization() {
        await this.initializationPromise;
    }
    async loadAllKeys() {
        const response = await axios_1.default.get(this.baseURL, {
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
    async get(label) {
        await this.waitForInitialization();
        const cached = this.cache.get(label);
        if (cached)
            return this.sanitizeKey(cached);
        if (this.isOnline) {
            try {
                await this.loadAllKeys();
                const refreshed = this.cache.get(label);
                if (refreshed)
                    return this.sanitizeKey(refreshed);
            }
            catch {
                this.isOnline = false;
            }
        }
        return null;
    }
    async getWithFallback(label, fallback) {
        await this.waitForInitialization();
        const cached = this.cache.get(label);
        if (cached?.value)
            return cached.value;
        if (!this.isOnline && !cached) {
            console.warn(`⚠️ Clé "${label}" non trouvée en cache - utilisation du fallback`);
        }
        return fallback || '';
    }
    async getMultiple(labels) {
        await this.waitForInitialization();
        const results = {};
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
    async getAll() {
        await this.waitForInitialization();
        return this.cache.keys().map(key => this.sanitizeKey(this.cache.get(key)));
    }
    async filter(predicate) {
        const allKeys = await this.getAll();
        return allKeys.filter(predicate);
    }
    async getByService(service) {
        return this.filter(key => key.service === service);
    }
    async refresh() {
        try {
            console.log('🔄 FetchYourKeys: Tentative de rafraîchissement...');
            await this.loadAllKeys();
            this.isOnline = true;
            console.log('✅ FetchYourKeys: Cache rafraîchi avec succès');
            return true;
        }
        catch (error) {
            this.isOnline = false;
            const hasData = this.cache.size() > 0;
            if (hasData) {
                console.warn('⚠️ FetchYourKeys: Rafraîchissement échoué - utilisation du cache mémoire');
            }
            else {
                console.error('❌ FetchYourKeys: IMPOSSIBLE de rafraîchir - pas de connexion et cache vide');
            }
            return false;
        }
    }
    async checkConnection() {
        try {
            await axios_1.default.get(this.baseURL, {
                headers: { 'x-fyk-key': this.apiKey },
                timeout: 5000
            });
            this.isOnline = true;
            return true;
        }
        catch {
            this.isOnline = false;
            return false;
        }
    }
    sanitizeKey(key) {
        const { meta, ...sanitized } = key;
        return sanitized;
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
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Cache mémoire nettoyé');
    }
    destroy() {
        this.cache.clear();
    }
}
exports.default = FetchYourKeys;
//# sourceMappingURL=index.js.map