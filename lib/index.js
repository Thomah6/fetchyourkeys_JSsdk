import axios from 'axios';
import dotenv from 'dotenv';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
dotenv.config();
// ════════════════════════════════════════════════════════════════
// 🛠️ CLASSES D'ERREURS PERSONNALISÉES
// ════════════════════════════════════════════════════════════════
class FetchYourKeysError extends Error {
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'FetchYourKeysError';
    }
}
class CacheError extends FetchYourKeysError {
    constructor(message, details) {
        super(message, 'CACHE_ERROR', details);
        this.name = 'CacheError';
    }
}
class NetworkError extends FetchYourKeysError {
    constructor(message, details) {
        super(message, 'NETWORK_ERROR', details);
        this.name = 'NetworkError';
    }
}
class SecurityError extends FetchYourKeysError {
    constructor(message, details) {
        super(message, 'SECURITY_ERROR', details);
        this.name = 'SecurityError';
    }
}
// ════════════════════════════════════════════════════════════════
// 🎯 ERROR MAPPER - CONVERSION ERREURS HTTP EN MESSAGES CLAIRS
// ════════════════════════════════════════════════════════════════
class ErrorMapper {
    static mapHttpError(error, apiKey) {
        const status = error.response?.status;
        const errorMap = {
            401: {
                code: 'UNAUTHORIZED',
                message: 'Clé API FetchYourKeys invalide ou expirée',
                suggestion: 'Vérifiez que votre clé FYK_SECRET_KEY est correcte et active sur https://fetchyourkeys.vercel.app'
            },
            403: {
                code: 'FORBIDDEN',
                message: 'Accès refusé avec cette clé API',
                suggestion: 'Cette clé API n\'a pas les permissions nécessaires. Générez une nouvelle clé sur votre dashboard'
            },
            404: {
                code: 'NOT_FOUND',
                message: 'Endpoint API introuvable',
                suggestion: 'Vérifiez que l\'URL de base est correcte'
            },
            429: {
                code: 'RATE_LIMIT',
                message: 'Limite de requêtes atteinte',
                suggestion: 'Attendez quelques instants avant de réessayer'
            },
            500: {
                code: 'SERVER_ERROR',
                message: 'Erreur serveur FetchYourKeys',
                suggestion: 'Réessayez dans quelques instants. Si le problème persiste, contactez le support'
            }
        };
        const mapped = errorMap[status] || {
            code: 'NETWORK_ERROR',
            message: error.message || 'Erreur de connexion réseau',
            suggestion: 'Vérifiez votre connexion internet'
        };
        return {
            success: false,
            error: {
                code: mapped.code,
                message: mapped.message,
                suggestion: mapped.suggestion,
                details: {
                    status,
                    apiKey: ErrorMapper.maskApiKey(apiKey),
                    url: error.config?.url
                }
            },
            metadata: {
                cached: false,
                online: false,
                timestamp: new Date().toISOString()
            }
        };
    }
    static maskApiKey(apiKey) {
        if (!apiKey || apiKey.length <= 8)
            return '***';
        return apiKey.substring(0, 4) + '***' + apiKey.substring(apiKey.length - 4);
    }
}
// ════════════════════════════════════════════════════════════════
// 📝 LOGGER AVEC SILENT MODE
// ════════════════════════════════════════════════════════════════
class DebugLogger {
    constructor() {
        this.enabled = false;
        this.silentMode = false;
        this.logHistory = [];
    }
    static getInstance() {
        if (!DebugLogger.instance) {
            DebugLogger.instance = new DebugLogger();
        }
        return DebugLogger.instance;
    }
    enable(silentMode = false) {
        this.enabled = true;
        this.silentMode = silentMode;
        if (!silentMode) {
            console.log(`[${new Date().toISOString()}] 🔧 Debug mode activé`);
        }
    }
    disable() {
        this.enabled = false;
    }
    setSilentMode(silent) {
        this.silentMode = silent;
    }
    log(message, data) {
        const entry = {
            timestamp: new Date().toISOString(),
            level: 'info',
            message,
            data
        };
        if (this.enabled) {
            this.logHistory.push(entry);
            if (this.logHistory.length > 1000) {
                this.logHistory.shift();
            }
            if (!this.silentMode) {
                console.log(`[${entry.timestamp}] ${message}`);
                if (data)
                    console.log('📋 Données:', data);
            }
        }
    }
    warn(message, data) {
        this.log(`⚠️ ${message}`, data);
    }
    error(message, error) {
        this.log(`❌ ${message}`, error);
    }
    getHistory() {
        return [...this.logHistory];
    }
    clearHistory() {
        this.logHistory = [];
    }
}
class SecureDiskCache {
    constructor(apiKey) {
        this.cache = new Map();
        this.apiKey = apiKey;
        this.logger = DebugLogger.getInstance();
        this.encryptionKey = this.generateEncryptionKey();
        this.cacheSignature = this.generateCacheSignature();
        this.cacheId = this.generateCacheId();
        this.cacheFile = this.getCacheFilePath();
        this.logger.log(`📂 Initialisation cache disque pour API key: ${this.maskApiKey(apiKey)}`);
        this.ensureCacheDirectory();
        this.loadFromDisk();
    }
    maskApiKey(apiKey) {
        if (apiKey.length <= 8)
            return '***';
        return apiKey.substring(0, 4) + '***' + apiKey.substring(apiKey.length - 4);
    }
    generateCacheId() {
        return scryptSync(this.apiKey, 'cache-id-salt-v2', 16).toString('hex');
    }
    getCacheFilePath() {
        const cacheDir = process.env.APPDATA ||
            (process.platform === 'darwin' ?
                process.env.HOME + '/Library/Caches' :
                process.env.HOME + '/.cache');
        return join(cacheDir, 'fetchyourkeys', `cache-${this.cacheId}.dat`);
    }
    generateEncryptionKey() {
        const salt = 'fetchyourkeys-disk-cache-v2';
        return scryptSync(this.apiKey, salt, 32);
    }
    generateCacheSignature() {
        return scryptSync(this.apiKey, 'disk-cache-signature-v2', 16).toString('hex');
    }
    ensureCacheDirectory() {
        const cacheDir = dirname(this.cacheFile);
        if (!existsSync(cacheDir)) {
            try {
                mkdirSync(cacheDir, { recursive: true, mode: 0o700 });
                this.logger.log(`📁 Dossier cache créé: ${cacheDir}`);
            }
            catch (error) {
                this.logger.error('Impossible de créer le dossier cache', error);
                throw new CacheError('Impossible d\'accéder au cache disque', { path: cacheDir, error });
            }
        }
    }
    encrypt(data) {
        try {
            const iv = randomBytes(16);
            const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
            let encrypted = cipher.update(data, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            const authTag = cipher.getAuthTag();
            return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
        }
        catch (error) {
            this.logger.error('Erreur de chiffrement', error);
            throw new SecurityError('Erreur lors du chiffrement des données');
        }
    }
    decrypt(encryptedData) {
        try {
            const parts = encryptedData.split(':');
            if (parts.length !== 3)
                throw new Error('Format invalide');
            const iv = Buffer.from(parts[0], 'hex');
            const authTag = Buffer.from(parts[1], 'hex');
            const encrypted = parts[2];
            const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
            decipher.setAuthTag(authTag);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return JSON.parse(decrypted);
        }
        catch (error) {
            this.logger.error('Erreur de déchiffrement', error);
            throw new SecurityError('Erreur lors du déchiffrement');
        }
    }
    loadFromDisk() {
        try {
            if (existsSync(this.cacheFile)) {
                const encryptedData = readFileSync(this.cacheFile, 'utf8');
                const cacheData = this.decrypt(encryptedData);
                if (cacheData.signature !== this.cacheSignature) {
                    this.logger.warn('Cache invalide - régénération');
                    this.clear();
                    return;
                }
                this.cache = new Map(Object.entries(cacheData.data));
            }
            else {
                this.logger.log('Aucun cache existant');
            }
        }
        catch (error) {
            this.logger.warn('Régénération du cache');
            this.clear();
        }
    }
    saveToDisk() {
        try {
            const cacheData = {
                signature: this.cacheSignature,
                data: Object.fromEntries(this.cache),
                timestamp: new Date().toISOString()
            };
            const encryptedData = this.encrypt(JSON.stringify(cacheData));
            writeFileSync(this.cacheFile, encryptedData, { mode: 0o600 });
        }
        catch (error) {
            this.logger.error('Erreur sauvegarde cache', error);
        }
    }
    set(key, value) {
        this.cache.set(key, value);
        this.saveToDisk();
    }
    get(key) {
        return this.cache.get(key);
    }
    has(key) {
        return this.cache.has(key);
    }
    delete(key) {
        const result = this.cache.delete(key);
        if (result)
            this.saveToDisk();
        return result;
    }
    keys() {
        return Array.from(this.cache.keys());
    }
    clear() {
        this.cache.clear();
        try {
            if (existsSync(this.cacheFile)) {
                writeFileSync(this.cacheFile, '');
            }
        }
        catch (error) {
            this.logger.error('Erreur nettoyage cache', error);
        }
    }
    size() {
        return this.cache.size;
    }
    getCacheId() {
        return this.cacheId;
    }
    isValidForApiKey(apiKey) {
        try {
            const expectedSignature = scryptSync(apiKey, 'disk-cache-signature-v2', 16).toString('hex');
            return this.cacheSignature === expectedSignature;
        }
        catch (error) {
            return false;
        }
    }
}
class SecureMemoryCache {
    constructor(apiKey) {
        this.cache = new Map();
        this.apiKey = apiKey;
        this.logger = DebugLogger.getInstance();
        this.encryptionKey = this.generateEncryptionKey();
        this.cacheSignature = this.generateCacheSignature();
        this.cacheId = this.generateCacheId();
        this.logger.log(`🧠 Initialisation cache mémoire pour API key: ${this.maskApiKey(apiKey)}`);
    }
    maskApiKey(apiKey) {
        if (apiKey.length <= 8)
            return '***';
        return apiKey.substring(0, 4) + '***' + apiKey.substring(apiKey.length - 4);
    }
    generateCacheId() {
        return scryptSync(this.apiKey, 'memory-cache-id-v2', 16).toString('hex');
    }
    static getInstance(apiKey) {
        const cacheKey = this.generateCacheKey(apiKey);
        if (!SecureMemoryCache.instances.has(cacheKey)) {
            SecureMemoryCache.instances.set(cacheKey, new SecureMemoryCache(apiKey));
        }
        return SecureMemoryCache.instances.get(cacheKey);
    }
    static generateCacheKey(apiKey) {
        return scryptSync(apiKey, 'memory-cache-key-v2', 16).toString('hex');
    }
    generateEncryptionKey() {
        return scryptSync(this.apiKey, 'fetchyourkeys-memory-cache-v2', 32);
    }
    generateCacheSignature() {
        return scryptSync(this.apiKey, 'memory-cache-signature-v2', 16).toString('hex');
    }
    set(key, value) {
        this.cache.set(key, value);
    }
    get(key) {
        return this.cache.get(key);
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
    getCacheId() {
        return this.cacheId;
    }
    isValidForApiKey(apiKey) {
        try {
            const expectedSignature = scryptSync(apiKey, 'memory-cache-signature-v2', 16).toString('hex');
            return this.cacheSignature === expectedSignature;
        }
        catch (error) {
            return false;
        }
    }
}
SecureMemoryCache.instances = new Map();
class CacheFactory {
    static createCache(apiKey, environment = 'dev') {
        const logger = DebugLogger.getInstance();
        if (!apiKey || apiKey.length < 10) {
            throw new FetchYourKeysError('Clé API invalide', 'INVALID_API_KEY', { suggestion: 'Vérifiez que votre clé API est correcte' });
        }
        try {
            if (environment === 'prod') {
                logger.log(`🚀 Mode PROD: Cache mémoire`);
                return SecureMemoryCache.getInstance(apiKey);
            }
            else {
                logger.log(`🔧 Mode DEV: Cache disque`);
                return new SecureDiskCache(apiKey);
            }
        }
        catch (error) {
            logger.warn('Cache disque indisponible - bascule vers mémoire', error);
            return SecureMemoryCache.getInstance(apiKey);
        }
    }
}
// ════════════════════════════════════════════════════════════════
// 🎯 CLASSE PRINCIPALE FETCHYOURKEYS AVEC VALIDATION AUTOMATIQUE
// ════════════════════════════════════════════════════════════════
class FetchYourKeys {
    constructor(options = {}) {
        this.isOnline = false;
        this.initializationError = null; // ✅ NOUVEAU
        this.logger = DebugLogger.getInstance();
        this.environment = this.validateEnvironment(options.environment);
        this.debug = options.debug || false;
        this.silentMode = options.silentMode || false;
        if (this.debug) {
            this.logger.enable(this.silentMode);
        }
        this.apiKey = options.apiKey || process.env.FYK_SECRET_KEY || '';
        if (!this.apiKey) {
            const error = new FetchYourKeysError('Clé API manquante', 'MISSING_API_KEY', {
                suggestion: 'Définissez FYK_SECRET_KEY dans .env ou passez apiKey dans les options',
                example: 'new FetchYourKeys({ apiKey: "your-key" })'
            });
            this.logger.error('Erreur initialisation', error);
            throw error;
        }
        this.baseURL = options.baseURL || 'https://apifetchyourkeys.vercel.app/v1/keys';
        this.logger.log('🎯 Initialisation FetchYourKeys SDK', {
            environment: this.environment,
            debug: this.debug,
            silentMode: this.silentMode,
            apiKey: this.maskApiKey(this.apiKey),
            baseURL: this.baseURL
        });
        this.cache = CacheFactory.createCache(this.apiKey, this.environment);
        this.cacheId = this.cache.getCacheId();
        // ✅ INITIALISATION AUTOMATIQUE AVEC VALIDATION DE LA CLÉ FYK
        this.initializationPromise = this.initializeWithAutoValidation();
    }
    maskApiKey(apiKey) {
        if (apiKey.length <= 8)
            return '***';
        return apiKey.substring(0, 4) + '***' + apiKey.substring(apiKey.length - 4);
    }
    validateEnvironment(env) {
        if (env === 'dev' || env === 'prod')
            return env;
        if (env) {
            this.logger.warn(`Environnement "${env}" invalide - utilisation de "dev"`, {
                validEnvironments: ['dev', 'prod']
            });
        }
        return 'dev';
    }
    /**
     * ✅ NOUVELLE MÉTHODE: Initialisation avec validation automatique de la clé FYK
     * Le SDK vérifie automatiquement la validité de la clé à l'initialisation
     */
    async initializeWithAutoValidation() {
        const hasCachedData = this.cache.size() > 0;
        try {
            // ✅ VALIDATION AUTOMATIQUE DE LA CLÉ FYK
            const response = await axios.get(this.baseURL, {
                headers: { 'x-fyk-key': this.apiKey },
                timeout: 10000,
                validateStatus: (status) => status < 500 // Ne pas throw sur 4xx
            });
            // ✅ Gestion explicite des erreurs d'authentification
            if (response.status === 401) {
                const authError = new FetchYourKeysError('Clé API FetchYourKeys invalide ou expirée', 'UNAUTHORIZED', {
                    suggestion: 'Vérifiez que votre clé FYK_SECRET_KEY est correcte et active sur https://fetchyourkeys.vercel.app',
                    baseURL: this.baseURL,
                    apiKey: this.maskApiKey(this.apiKey)
                });
                this.logger.error('❌ Authentification échouée', authError);
                this.initializationError = authError;
                return; // Sortir sans throw
            }
            if (response.status === 403) {
                const forbiddenError = new FetchYourKeysError('Clé API FetchYourKeys non autorisée', 'FORBIDDEN', {
                    suggestion: 'Cette clé n\'a pas les permissions nécessaires. Générez une nouvelle clé sur votre dashboard',
                    baseURL: this.baseURL,
                    apiKey: this.maskApiKey(this.apiKey)
                });
                this.logger.error('❌ Accès refusé', forbiddenError);
                this.initializationError = forbiddenError;
                return;
            }
            const responseData = response.data;
            if (responseData?.success && Array.isArray(responseData.data)) {
                this.cache.clear();
                responseData.data.forEach((key) => {
                    if (key?.label) { // Vérification de sécurité
                        this.cache.set(key.label, key);
                    }
                });
                this.isOnline = true;
                this.logger.log(`✅ Clé FYK validée - ${this.cache.size()} clés chargées`);
            }
            else {
                this.logger.warn('Aucune donnée valide reçue de l\'API', {
                    hasData: !!responseData,
                    hasSuccess: responseData?.success,
                    dataIsArray: Array.isArray(responseData?.data)
                });
            }
        }
        catch (error) {
            this.isOnline = false;
            if (error instanceof FetchYourKeysError) {
                this.initializationError = error;
                return;
            }
            // ✅ Erreur réseau avec cache disponible
            if (hasCachedData) {
                this.logger.warn(`⚠️ Mode hors ligne - utilisation du cache (${this.cache.size()} clés)`);
                return;
            }
            // ✅ Erreur réseau sans cache
            const networkError = new NetworkError('Impossible de se connecter à FetchYourKeys et aucun cache disponible', {
                suggestion: 'Vérifiez votre connexion internet et votre clé FYK_SECRET_KEY',
                baseURL: this.baseURL,
                cacheStatus: 'empty',
                apiKey: this.maskApiKey(this.apiKey)
            });
            this.logger.error('❌ Erreur critique', networkError);
            this.initializationError = networkError;
        }
    }
    async waitForInitialization() {
        try {
            await this.initializationPromise;
            // ✅ NOUVEAU: Vérifier si une erreur a été stockée
            if (this.initializationError) {
                throw this.initializationError;
            }
        }
        catch (error) {
            this.logger.error('Erreur lors de l\'initialisation', error);
            throw error;
        }
    }
    /**
    * ✅ NOUVELLE MÉTHODE: Permet de vérifier l'état d'initialisation
    */
    getInitializationError() {
        return this.initializationError;
    }
    /**
     * ✅ MÉTHODE AMÉLIORÉE: get() retourne Result<Key>
     */
    async get(label) {
        this.logger.log(`🔍 Recherche clé: "${label}"`);
        try {
            await this.waitForInitialization();
            if (!this.cache.isValidForApiKey(this.apiKey)) {
                return {
                    success: false,
                    error: {
                        code: 'CACHE_INVALID',
                        message: 'Cache invalide pour cette clé API',
                        suggestion: 'Reconnectez-vous à internet pour recharger'
                    },
                    metadata: {
                        cached: false,
                        online: this.isOnline,
                        timestamp: new Date().toISOString()
                    }
                };
            }
            const cached = this.cache.get(label);
            if (cached) {
                this.logger.log(`✅ Clé trouvée: "${label}"`);
                return {
                    success: true,
                    data: this.sanitizeKey(cached),
                    metadata: {
                        cached: true,
                        online: this.isOnline,
                        timestamp: new Date().toISOString()
                    }
                };
            }
            // Clé non trouvée
            return {
                success: false,
                error: {
                    code: 'KEY_NOT_FOUND',
                    message: `La clé "${label}" n'existe pas`,
                    suggestion: 'Vérifiez le nom de la clé sur votre dashboard FetchYourKeys',
                    details: {
                        label,
                        availableKeys: this.cache.keys().slice(0, 10)
                    }
                },
                metadata: {
                    cached: false,
                    online: this.isOnline,
                    timestamp: new Date().toISOString()
                }
            };
        }
        catch (error) {
            this.logger.error(`Erreur récupération clé: "${label}"`, error);
            return ErrorMapper.mapHttpError(error, this.apiKey);
        }
    }
    /**
     * ✅ NOUVELLE MÉTHODE: safeGet() - version simple qui ne throw jamais
     */
    async safeGet(label, fallback = '') {
        const result = await this.get(label);
        if (result.success && result.data?.value) {
            return result.data.value;
        }
        if (result.error && this.debug) {
            this.logger.warn(`⚠️ ${result.error.message}`, result.error);
        }
        return fallback;
    }
    /**
     * ✅ MÉTHODE AMÉLIORÉE: getMultiple() retourne Result
     */
    async getMultiple(labels) {
        this.logger.log(`📦 Récupération multiple: ${labels.length} clés`);
        try {
            await this.waitForInitialization();
            if (!this.cache.isValidForApiKey(this.apiKey)) {
                return {
                    success: false,
                    error: {
                        code: 'CACHE_INVALID',
                        message: 'Cache invalide',
                        suggestion: 'Reconnectez-vous pour recharger le cache'
                    },
                    metadata: {
                        cached: false,
                        online: this.isOnline,
                        timestamp: new Date().toISOString()
                    }
                };
            }
            const results = {};
            labels.forEach(label => {
                const cached = this.cache.get(label);
                results[label] = cached ? this.sanitizeKey(cached) : null;
            });
            return {
                success: true,
                data: results,
                metadata: {
                    cached: true,
                    online: this.isOnline,
                    timestamp: new Date().toISOString()
                }
            };
        }
        catch (error) {
            return ErrorMapper.mapHttpError(error, this.apiKey);
        }
    }
    /**
     * ✅ MÉTHODE AMÉLIORÉE: refresh() retourne Result
     */
    async refresh() {
        this.logger.log('🔄 Rafraîchissement manuel du cache');
        try {
            const response = await axios.get(this.baseURL, {
                headers: { 'x-fyk-key': this.apiKey },
                timeout: 10000
            });
            if (response.data?.data) {
                this.cache.clear();
                response.data.data.forEach(key => {
                    this.cache.set(key.label, key);
                });
                this.isOnline = true;
                this.logger.log('✅ Cache rafraîchi');
                return {
                    success: true,
                    data: true,
                    metadata: {
                        cached: false,
                        online: true,
                        timestamp: new Date().toISOString()
                    }
                };
            }
            return {
                success: false,
                error: {
                    code: 'REFRESH_FAILED',
                    message: 'Impossible de rafraîchir le cache',
                    suggestion: 'Vérifiez votre connexion'
                }
            };
        }
        catch (error) {
            this.isOnline = false;
            if (this.cache.size() > 0) {
                return {
                    success: false,
                    error: {
                        code: 'REFRESH_FAILED',
                        message: 'Impossible de rafraîchir, utilisation du cache',
                        suggestion: 'Mode hors ligne actif'
                    },
                    metadata: {
                        cached: true,
                        online: false,
                        timestamp: new Date().toISOString()
                    }
                };
            }
            return ErrorMapper.mapHttpError(error, this.apiKey);
        }
    }
    async getAll() {
        try {
            await this.waitForInitialization();
            return this.cache.keys().map(key => this.sanitizeKey(this.cache.get(key)));
        }
        catch (error) {
            this.logger.error('Erreur récupération totale', error);
            return [];
        }
    }
    async filter(predicate) {
        const allKeys = await this.getAll();
        return allKeys.filter(predicate);
    }
    async getByService(service) {
        return this.filter(key => key.service === service);
    }
    sanitizeKey(key) {
        const { meta, ...sanitized } = key;
        return sanitized;
    }
    getStats() {
        if (this.initializationError) {
            return {
                cachedKeys: 0,
                isOnline: false,
                environment: this.environment,
                cacheType: this.environment === 'prod' ? 'Mémoire sécurisée' : 'Disque chiffré',
                cacheValid: false,
                cacheId: this.cacheId,
                apiKey: this.maskApiKey(this.apiKey),
                status: '🔴 ERREUR INITIALISATION',
                error: {
                    code: this.initializationError.code,
                    message: this.initializationError.message,
                    suggestion: this.initializationError.details?.suggestion
                },
                debugEnabled: this.debug,
                silentMode: this.silentMode
            };
        }
        const cacheKeys = this.cache.keys();
        const isValid = this.cache.isValidForApiKey(this.apiKey);
        return {
            cachedKeys: cacheKeys.length,
            isOnline: this.isOnline,
            environment: this.environment,
            cacheType: this.environment === 'prod' ? 'Mémoire sécurisée' : 'Disque chiffré',
            cacheValid: isValid,
            cacheId: this.cacheId,
            apiKey: this.maskApiKey(this.apiKey),
            status: !isValid ? '🔴 CACHE INVALIDE' :
                this.isOnline ? '🟢 EN LIGNE' :
                    (cacheKeys.length > 0 ? '🟡 HORS LIGNE' : '🔴 HORS LIGNE (vide)'),
            debugEnabled: this.debug,
            silentMode: this.silentMode
        };
    }
    getLogHistory() {
        if (!this.debug) {
            this.logger.warn('Historique non disponible - activez le mode debug');
            return [];
        }
        return this.logger.getHistory();
    }
    clearCache() {
        this.logger.log('🗑️ Nettoyage du cache');
        this.cache.clear();
    }
    setDebug(enabled) {
        this.debug = enabled;
        if (enabled) {
            this.logger.enable(this.silentMode);
        }
        else {
            this.logger.disable();
        }
    }
    setSilentMode(silent) {
        this.silentMode = silent;
        this.logger.setSilentMode(silent);
    }
}
export default FetchYourKeys;
export { FetchYourKeys, FetchYourKeysError, CacheError, NetworkError, SecurityError };
//# sourceMappingURL=index.js.map