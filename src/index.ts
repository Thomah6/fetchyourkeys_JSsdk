import axios from 'axios';
import dotenv from 'dotenv';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

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
  environment?: 'dev' | 'prod';
  debug?: boolean;
}

// ✅ Types d'erreurs personnalisées
class FetchYourKeysError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'FetchYourKeysError';
  }
}

class CacheError extends FetchYourKeysError {
  constructor(message: string, details?: any) {
    super(message, 'CACHE_ERROR', details);
    this.name = 'CacheError';
  }
}

class NetworkError extends FetchYourKeysError {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}

class SecurityError extends FetchYourKeysError {
  constructor(message: string, details?: any) {
    super(message, 'SECURITY_ERROR', details);
    this.name = 'SecurityError';
  }
}

// ✅ Logger intelligent
class DebugLogger {
  private static instance: DebugLogger;
  private enabled: boolean = false;
  private logHistory: string[] = [];

  private constructor() {}

  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  enable(): void {
    this.enabled = true;
    this.log('🔧 Debug mode activé');
  }

  disable(): void {
    this.enabled = false;
  }

  log(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    
    this.logHistory.push(logEntry);
    if (this.logHistory.length > 1000) {
      this.logHistory.shift();
    }

    if (this.enabled) {
      console.log(logEntry);
      if (data) {
        console.log('📋 Données:', data);
      }
    }
  }

  warn(message: string, data?: any): void {
    this.log(`⚠️ ${message}`, data);
  }

  error(message: string, error?: any): void {
    this.log(`❌ ${message}`, error);
  }

  getHistory(): string[] {
    return [...this.logHistory];
  }

  clearHistory(): void {
    this.logHistory = [];
  }
}

// ✅ Interface commune pour tous les caches
interface SecureCache {
  set(key: string, value: any): void;
  get(key: string): any;
  has(key: string): boolean;
  delete(key: string): boolean;
  keys(): string[];
  clear(): void;
  size(): number;
  getCacheId(): string;
  isValidForApiKey(apiKey: string): boolean;
}

// ✅ Cache DISQUE sécurisé avec isolation par API key
class SecureDiskCache implements SecureCache {
  private cache: Map<string, any> = new Map();
  private encryptionKey: Buffer;
  private apiKey: string;
  private cacheSignature: string;
  private cacheFile: string;
  private cacheId: string;
  private logger: DebugLogger;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.logger = DebugLogger.getInstance();
    this.encryptionKey = this.generateEncryptionKey();
    this.cacheSignature = this.generateCacheSignature();
    this.cacheId = this.generateCacheId();
    this.cacheFile = this.getCacheFilePath();
    
    // Log simplifié
    this.logger.log(`📂 Initialisation cache disque pour API key: ${this.maskApiKey(apiKey)}`);
    
    this.ensureCacheDirectory();
    this.loadFromDisk();
  }

  private maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) return '***';
    return apiKey.substring(0, 4) + '***' + apiKey.substring(apiKey.length - 4);
  }

  private generateCacheId(): string {
    // ✅ Cache ID unique basé sur l'API key
    return scryptSync(this.apiKey, 'cache-id-salt-v2', 16).toString('hex');
  }

  private getCacheFilePath(): string {
    const cacheDir = process.env.APPDATA || 
      (process.platform === 'darwin' ? 
        process.env.HOME + '/Library/Caches' : 
        process.env.HOME + '/.cache');
    
    return join(cacheDir, 'fetchyourkeys', `cache-${this.cacheId}.dat`);
  }

  private generateEncryptionKey(): Buffer {
    const salt = 'fetchyourkeys-disk-cache-v2';
    return scryptSync(this.apiKey, salt, 32);
  }

  private generateCacheSignature(): string {
    // ✅ Signature unique par API key
    return scryptSync(this.apiKey, 'disk-cache-signature-v2', 16).toString('hex');
  }

  private ensureCacheDirectory(): void {
    const cacheDir = dirname(this.cacheFile);
    if (!existsSync(cacheDir)) {
      try {
        mkdirSync(cacheDir, { recursive: true, mode: 0o700 });
        this.logger.log(`📁 Dossier cache créé: ${cacheDir}`);
      } catch (error) {
        this.logger.error('❌ Impossible de créer le dossier cache disque', error);
        throw new CacheError(
          'Impossible d\'accéder au cache disque', 
          { path: cacheDir, error: error }
        );
      }
    }
  }

  private encrypt(data: string): string {
    try {
      const iv = randomBytes(16);
      const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();
      
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      this.logger.error('❌ Erreur de chiffrement', error);
      throw new SecurityError('Erreur lors du chiffrement des données');
    }
  }

  private decrypt(encryptedData: string): any {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Format de données chiffrées invalide');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      this.logger.error('❌ Erreur de déchiffrement', error);
      throw new SecurityError('Erreur lors du déchiffrement des données');
    }
  }

  private loadFromDisk(): void {
    try {
      if (existsSync(this.cacheFile)) {
        this.logger.log(`📖 Tentative de chargement du cache depuis: ${this.cacheFile}`);
        const encryptedData = readFileSync(this.cacheFile, 'utf8');
        const cacheData = this.decrypt(encryptedData);
        
        // ✅ Vérification CRITIQUE : la signature ET l'API key correspondent
        if (cacheData.signature !== this.cacheSignature || cacheData.apiKey !== this.maskApiKey(this.apiKey)) {
          // Log simplifié, cache signature et apiKey retirées pour l'utilisateur
          this.logger.warn('⚠️ Cache disque invalide (API key différente ou signature altérée) - régénération');
          this.clear();
          return;
        }
        
        this.cache = new Map(Object.entries(cacheData.data));
        // Log simplifié
        this.logger.log(`✅ Cache disque chargé: ${this.cache.size} clés`);
      } else {
        this.logger.log('📝 Aucun cache disque existant trouvé pour cette API key');
      }
    } catch (error) {
      if (error instanceof SecurityError) {
        this.logger.warn('🔄 Régénération du cache (données corrompues ou invalides)');
      } else {
        this.logger.error('❌ Erreur chargement cache disque', error);
      }
      this.clear();
    }
  }

  private saveToDisk(): void {
    try {
      const cacheData = {
        signature: this.cacheSignature,
        apiKey: this.maskApiKey(this.apiKey), // ✅ Stocke l'API key masquée pour vérification
        data: Object.fromEntries(this.cache),
        timestamp: new Date().toISOString(),
        version: '2.0',
        cacheId: this.cacheId
      };
      
      const encryptedData = this.encrypt(JSON.stringify(cacheData));
      writeFileSync(this.cacheFile, encryptedData, { mode: 0o600 });
      // Log simplifié
      // this.logger.log(`💾 Cache sauvegardé: ${this.cache.size} clés`);
    } catch (error) {
      this.logger.error('❌ Impossible de sauvegarder le cache disque', error);
      throw new CacheError('Erreur lors de la sauvegarde du cache');
    }
  }

  set(key: string, value: any): void {
    try {
      this.cache.set(key, value);
      this.saveToDisk();
    } catch (error) {
      this.logger.error(`❌ Erreur sauvegarde clé: ${key}`, error);
      throw error;
    }
  }

  get(key: string): any {
    return this.cache.get(key);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    try {
      const result = this.cache.delete(key);
      if (result) this.saveToDisk();
      return result;
    } catch (error) {
      this.logger.error(`❌ Erreur suppression clé: ${key}`, error);
      return false;
    }
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  clear(): void {
    this.cache.clear();
    try {
      if (existsSync(this.cacheFile)) {
        writeFileSync(this.cacheFile, '');
        this.logger.log('🗑️ Cache disque vidé pour cette API key');
      }
    } catch (error) {
      this.logger.error('❌ Erreur nettoyage cache disque', error);
    }
  }

  size(): number {
    return this.cache.size;
  }

  getCacheId(): string {
    return this.cacheId;
  }

  isValidForApiKey(apiKey: string): boolean {
    try {
      const expectedSignature = scryptSync(apiKey, 'disk-cache-signature-v2', 16).toString('hex');
      return this.cacheSignature === expectedSignature;
    } catch (error) {
      this.logger.error('❌ Erreur vérification signature cache', error);
      return false;
    }
  }
}

// ✅ Cache MÉMOIRE sécurisé avec isolation par API key
class SecureMemoryCache implements SecureCache {
  private static instances: Map<string, SecureMemoryCache> = new Map();
  private cache: Map<string, any> = new Map();
  private encryptionKey: Buffer;
  private apiKey: string;
  private cacheSignature: string;
  private cacheId: string;
  private logger: DebugLogger;

  private constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.logger = DebugLogger.getInstance();
    this.encryptionKey = this.generateEncryptionKey();
    this.cacheSignature = this.generateCacheSignature();
    this.cacheId = this.generateCacheId();
    // Log simplifié
    this.logger.log(`🧠 Initialisation cache mémoire pour API key: ${this.maskApiKey(apiKey)}`);
  }

  private maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) return '***';
    return apiKey.substring(0, 4) + '***' + apiKey.substring(apiKey.length - 4);
  }

  private generateCacheId(): string {
    // ✅ Cache ID unique basé sur l'API key
    return scryptSync(this.apiKey, 'memory-cache-id-v2', 16).toString('hex');
  }

  public static getInstance(apiKey: string): SecureMemoryCache {
    const cacheKey = this.generateCacheKey(apiKey);
    
    if (!SecureMemoryCache.instances.has(cacheKey)) {
      SecureMemoryCache.instances.set(cacheKey, new SecureMemoryCache(apiKey));
    }
    
    const instance = SecureMemoryCache.instances.get(cacheKey)!;
    
    // ✅ VÉRIFICATION CRITIQUE : l'instance correspond bien à cette API key
    if (!instance.isValidForApiKey(apiKey)) {
      // Log simplifié
      instance.logger.warn('⚠️ Instance cache mémoire invalide - recréation');
      SecureMemoryCache.instances.delete(cacheKey);
      return SecureMemoryCache.getInstance(apiKey);
    }
    
    return instance;
  }

  private static generateCacheKey(apiKey: string): string {
    return scryptSync(apiKey, 'memory-cache-key-v2', 16).toString('hex');
  }

  private generateEncryptionKey(): Buffer {
    const salt = 'fetchyourkeys-memory-cache-v2';
    return scryptSync(this.apiKey, salt, 32);
  }

  private generateCacheSignature(): string {
    return scryptSync(this.apiKey, 'memory-cache-signature-v2', 16).toString('hex');
  }

  private encrypt(data: string): string {
    try {
      const iv = randomBytes(16);
      const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();
      
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      this.logger.error('❌ Erreur de chiffrement mémoire', error);
      throw new SecurityError('Erreur lors du chiffrement en mémoire');
    }
  }

  private decrypt(encryptedData: string): any {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Format de données chiffrées invalide');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      this.logger.error('❌ Erreur de déchiffrement mémoire', error);
      throw new SecurityError('Erreur lors du déchiffrement en mémoire');
    }
  }

  set(key: string, value: any): void {
    try {
      const encryptedValue = this.encrypt(JSON.stringify({
        value,
        apiKey: this.maskApiKey(this.apiKey), // ✅ Stocke l'API key dans les données
        timestamp: Date.now()
      }));
      this.cache.set(key, encryptedValue);
      // Log simplifié
      this.logger.log(`💾 Clé mise en cache: ${key}`);
    } catch (error) {
      this.logger.error(`❌ Erreur mise en cache clé: ${key}`, error);
      throw error;
    }
  }

  get(key: string): any {
    try {
      const encryptedValue = this.cache.get(key);
      if (!encryptedValue) return undefined;
      
      const decrypted = this.decrypt(encryptedValue);
      
      // ✅ VÉRIFICATION CRITIQUE : les données appartiennent bien à cette API key
      if (decrypted.apiKey !== this.maskApiKey(this.apiKey)) {
        // Log simplifié
        this.logger.warn(`⚠️ Données cache invalides pour clé: ${key} - suppression`);
        this.cache.delete(key);
        return undefined;
      }
      
      return decrypted.value;
    } catch (error) {
      this.logger.error(`❌ Erreur récupération clé: ${key}`, error);
      return undefined;
    }
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result) {
      // Log simplifié
      this.logger.log(`🗑️ Clé supprimée du cache: ${key}`);
    }
    return result;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  clear(): void {
    this.cache.clear();
    this.logger.log(`🧹 Cache mémoire vidé pour API key: ${this.maskApiKey(this.apiKey)}`);
  }

  size(): number {
    return this.cache.size;
  }

  getCacheId(): string {
    return this.cacheId;
  }

  isValidForApiKey(apiKey: string): boolean {
    try {
      const expectedSignature = scryptSync(apiKey, 'memory-cache-signature-v2', 16).toString('hex');
      return this.cacheSignature === expectedSignature;
    } catch (error) {
      this.logger.error('❌ Erreur vérification signature mémoire', error);
      return false;
    }
  }
}

// ✅ Factory pour choisir le cache adapté
class CacheFactory {
  static createCache(apiKey: string, environment: 'dev' | 'prod' = 'dev'): SecureCache {
    const logger = DebugLogger.getInstance();
    
    // ✅ Validation de l'API key
    if (!apiKey || apiKey.length < 10) {
      logger.error('❌ API key invalide', { length: apiKey?.length });
      throw new FetchYourKeysError(
        'API key invalide',
        'INVALID_API_KEY',
        { suggestion: 'Vérifiez que votre clé API est correcte' }
      );
    }
    
    try {
      // Log simplifié pour ne pas répéter l'API key masquée
      const maskedKey = apiKey.substring(0, 4) + '***' + apiKey.substring(apiKey.length - 4);
      if (environment === 'prod') {
        logger.log(`🚀 Mode PROD: Cache mémoire sécurisé pour API key: ${maskedKey}`);
        return SecureMemoryCache.getInstance(apiKey);
      } else {
        logger.log(`🔧 Mode DEV: Cache disque sécurisé pour API key: ${maskedKey}`);
        return new SecureDiskCache(apiKey);
      }
    } catch (error) {
      logger.warn('⚠️ Cache disque indisponible - bascule vers cache mémoire', error);
      return SecureMemoryCache.getInstance(apiKey);
    }
  }
}

// ✅ Classe principale FetchYourKeys
class FetchYourKeys {
  private apiKey: string;
  private baseURL: string;
  private cache: SecureCache;
  private isOnline: boolean = false;
  private initializationPromise: Promise<void>;
  private environment: 'dev' | 'prod';
  private debug: boolean;
  private logger: DebugLogger;
  private cacheId: string;

  constructor(options: FetchYourKeysOptions = {}) {
    this.logger = DebugLogger.getInstance();
    
    // ✅ Validation et normalisation de l'environnement
    this.environment = this.validateEnvironment(options.environment);
    this.debug = options.debug || false;
    
    if (this.debug) {
      this.logger.enable();
    }
    
    this.apiKey = options.apiKey || process.env.FYK_SECRET_KEY || '';
    if (!this.apiKey) {
      const error = new FetchYourKeysError(
        'Clé API manquante',
        'MISSING_API_KEY',
        {
          suggestion: 'Définissez FYK_SECRET_KEY dans .env ou passez apiKey dans les options',
          example: 'new FetchYourKeys({ apiKey: "your-key" })'
        }
      );
      this.logger.error('❌ Erreur initialisation', error);
      throw error;
    }
    
    this.baseURL = options.baseURL || 'https://apifetchyourkeys.vercel.app/v1/keys';
    
    this.logger.log('🎯 Initialisation FetchYourKeys SDK', {
      environment: this.environment,
      debug: this.debug,
      apiKey: this.maskApiKey(this.apiKey),
      baseURL: this.baseURL
    });

    // ✅ Cache adaptatif selon l'environnement
    this.cache = CacheFactory.createCache(this.apiKey, this.environment);
    this.cacheId = this.cache.getCacheId();

    this.initializationPromise = this.initializeWithOfflineSupport();
  }

  private maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) return '***';
    return apiKey.substring(0, 4) + '***' + apiKey.substring(apiKey.length - 4);
  }

  /**
   * Valide et normalise l'environnement
   */
  private validateEnvironment(env?: string): 'dev' | 'prod' {
    if (env === 'dev' || env === 'prod') {
      return env;
    }
    
    if (env) {
      this.logger.warn(`⚠️ Environnement "${env}" invalide - utilisation de "dev" par défaut`, {
        validEnvironments: ['dev', 'prod'],
        suggestion: 'Utilisez environment: "dev" ou "prod"'
      });
    }
    
    return 'dev';
  }

  private async initializeWithOfflineSupport(): Promise<void> {
    const hasCachedData = this.cache.size() > 0;
    
    // Logs simplifiés
    this.logger.log('🔍 État initial', {
      hasCachedData,
      cacheSize: this.cache.size(),
      environment: this.environment,
    });

    try {
      this.logger.log('🔄 Tentative de connexion à l\'API...');
      await this.loadAllKeys();
      this.isOnline = true;
      this.logger.log('✅ Connexion API réussie');
      
    } catch (error) {
      this.isOnline = false;
      
      if (hasCachedData) {
        // Logs simplifiés (pas de cacheId)
        this.logger.warn(`⚠️ Mode hors ligne - utilisation du cache (${this.cache.size()} clés)`);
        
        // ✅ Vérification de sécurité RENFORCÉE
        if (!this.cache.isValidForApiKey(this.apiKey)) {
          const securityError = new SecurityError(
            'Cache invalide pour cette clé API',
            {
              suggestion: 'Le cache a été vidé automatiquement pour raisons de sécurité',
              action: 'Reconnexion nécessaire',
              apiKey: this.maskApiKey(this.apiKey),
              cacheId: this.cacheId
            }
          );
          this.logger.error('❌ Violation de sécurité', securityError);
          this.cache.clear();
          throw securityError;
        }
      } else {
        const networkError = new NetworkError(
          'Impossible de se connecter et cache vide',
          {
            suggestion: 'Vérifiez votre connexion internet et votre clé API',
            baseURL: this.baseURL,
            cacheStatus: 'empty',
            apiKey: this.maskApiKey(this.apiKey)
          }
        );
        this.logger.error('❌ Erreur critique', networkError);
      }
    }
  }

  private async waitForInitialization(): Promise<void> {
    try {
      await this.initializationPromise;
    } catch (error) {
      this.logger.error('❌ Erreur lors de l\'initialisation', error);
      throw error;
    }
  }

  private async loadAllKeys(): Promise<void> {
    try {
      this.logger.log('📥 Chargement des clés depuis l\'API...');
      const response = await axios.get<{ data: Key[] }>(this.baseURL, {
        headers: { 'x-fyk-key': this.apiKey },
        timeout: 10000
      });

      if (response.data?.data) {
        this.logger.log(`📦 ${response.data.data.length} clés reçues de l'API`);
        this.cache.clear();
        
        response.data.data.forEach(key => {
          this.cache.set(key.label, key);
        });
        
        this.logger.log(`💾 Cache ${this.environment} chargé: ${this.cache.size()} clés`);
      } else {
        throw new FetchYourKeysError(
          'Réponse API invalide',
          'INVALID_API_RESPONSE',
          { response: response.data }
        );
      }
    } catch (error) {
      this.logger.error('❌ Erreur chargement des clés', {
        apiKey: this.maskApiKey(this.apiKey),
        error
      });
      
      if (error instanceof Error && (error as any).isAxiosError) {
        throw new NetworkError(
          `Erreur réseau: ${(error as any).message}`,
          {
            status: (error as any).response?.status,
            statusText: (error as any).response?.statusText,
            url: this.baseURL,
            apiKey: this.maskApiKey(this.apiKey)
          }
        );
      }
      throw error;
    }
  }

  async get(label: string): Promise<Key | null> {
    this.logger.log(`🔍 Recherche clé: "${label}"`);
    
    try {
      await this.waitForInitialization();

      // ✅ Vérification de sécurité AVANT chaque accès
      if (!this.cache.isValidForApiKey(this.apiKey)) {
        const error = new SecurityError('Cache invalide pour cette clé API', {
          apiKey: this.maskApiKey(this.apiKey),
          cacheId: this.cacheId
        });
        this.logger.error('❌ Erreur sécurité', error);
        return null;
      }

      const cached = this.cache.get(label);
      if (cached) {
        this.logger.log(`✅ Clé trouvée en cache: "${label}"`);
        return this.sanitizeKey(cached);
      }

      this.logger.log(`❌ Clé non trouvée en cache: "${label}"`);

      if (this.isOnline) {
        try {
          this.logger.log(`🔄 Tentative de rechargement pour: "${label}"`);
          await this.loadAllKeys();
          const refreshed = this.cache.get(label);
          if (refreshed) {
            this.logger.log(`✅ Clé trouvée après rechargement: "${label}"`);
            return this.sanitizeKey(refreshed);
          }
        } catch (error) {
          this.logger.error(`❌ Erreur rechargement pour: "${label}"`, {
            apiKey: this.maskApiKey(this.apiKey),
            error
          });
          this.isOnline = false;
        }
      }

      this.logger.warn(`⚠️ Clé introuvable: "${label}"`);
      return null;

    } catch (error) {
      this.logger.error(`❌ Erreur récupération clé: "${label}"`, {
        apiKey: this.maskApiKey(this.apiKey),
        error
      });
      return null;
    }
  }

  async getWithFallback(label: string, fallback?: string): Promise<string> {
    // this.logger.log(`🛡️ Récupération avec fallback: "${label}"`);
    
    try {
      await this.waitForInitialization();

      if (!this.cache.isValidForApiKey(this.apiKey)) {
        this.logger.error('❌ Cache invalide - utilisation du fallback', {
          apiKey: this.maskApiKey(this.apiKey)
        });
        return fallback || '';
      }

      const cached = this.cache.get(label);
      if (cached?.value) {
        this.logger.log(`✅ Clé trouvée: "${label}"`);
        return cached.value;
      }

      if (!this.isOnline && !cached) {
        this.logger.warn(`⚠️ Clé "${label}" non trouvée en cache - utilisation du fallback`);
      }

      return fallback || '';

    } catch (error) {
      this.logger.error(`❌ Erreur récupération avec fallback: "${label}"`, {
        apiKey: this.maskApiKey(this.apiKey),
        error
      });
      return fallback || '';
    }
  }

  async getMultiple(labels: string[]): Promise<Record<string, Key | null>> {
    this.logger.log(`📦 Récupération multiple: ${labels.length} clés`);
    
    try {
      await this.waitForInitialization();

      if (!this.cache.isValidForApiKey(this.apiKey)) {
        this.logger.error('❌ Cache invalide - retour résultats vides', {
          apiKey: this.maskApiKey(this.apiKey)
        });
        return labels.reduce((acc, label) => {
          acc[label] = null;
          return acc;
        }, {} as Record<string, Key | null>);
      }
      
      const results: Record<string, Key | null> = {};
      const found: string[] = [];
      const missing: string[] = [];
      
      labels.forEach(label => {
        const cached = this.cache.get(label);
        results[label] = cached ? this.sanitizeKey(cached) : null;
        
        if (cached) found.push(label);
        else missing.push(label);
      });

      this.logger.log('📊 Résultats récupération multiple', {
        trouvées: found,
        manquantes: missing,
        total: `${found.length}/${labels.length}`,
      });

      if (!this.isOnline && missing.length > 0) {
        this.logger.warn(`⚠️ Clés manquantes en cache: ${missing.join(', ')}`);
      }

      return results;

    } catch (error) {
      this.logger.error('❌ Erreur récupération multiple', {
        apiKey: this.maskApiKey(this.apiKey),
        error
      });
      return labels.reduce((acc, label) => {
        acc[label] = null;
        return acc;
      }, {} as Record<string, Key | null>);
    }
  }

  async getAll(): Promise<Key[]> {
    this.logger.log('📚 Récupération de toutes les clés');
    
    try {
      await this.waitForInitialization();

      if (!this.cache.isValidForApiKey(this.apiKey)) {
        this.logger.error('❌ Cache invalide - retour tableau vide', {
          apiKey: this.maskApiKey(this.apiKey)
        });
        return [];
      }
      
      const keys = this.cache.keys().map(key => this.sanitizeKey(this.cache.get(key)));
      this.logger.log(`📖 ${keys.length} clés récupérées`);
      return keys;

    } catch (error) {
      this.logger.error('❌ Erreur récupération totale', {
        apiKey: this.maskApiKey(this.apiKey),
        error
      });
      return [];
    }
  }

  async filter(predicate: (key: Key) => boolean): Promise<Key[]> {
    this.logger.log('🔎 Filtrage des clés');
    
    try {
      const allKeys = await this.getAll();
      const filtered = allKeys.filter(predicate);
      this.logger.log(`🎯 ${filtered.length} clés filtrées`);
      return filtered;
    } catch (error) {
      this.logger.error('❌ Erreur filtrage', {
        apiKey: this.maskApiKey(this.apiKey),
        error
      });
      return [];
    }
  }

  async getByService(service: string): Promise<Key[]> {
    this.logger.log(`🏷️ Récupération par service: "${service}"`);
    return this.filter(key => key.service === service);
  }

  async refresh(): Promise<boolean> {
    this.logger.log('🔄 Rafraîchissement manuel du cache');
    
    try {
      await this.loadAllKeys();
      this.isOnline = true;
      this.logger.log('✅ Cache rafraîchi avec succès');
      return true;
    } catch (error) {
      this.logger.error('❌ Erreur rafraîchissement', {
        apiKey: this.maskApiKey(this.apiKey),
        error
      });
      this.isOnline = false;
      
      const hasData = this.cache.size() > 0;
      if (hasData) {
        this.logger.warn('⚠️ Rafraîchissement échoué - utilisation du cache existant');
      } else {
        this.logger.error('❌ Impossible de rafraîchir - pas de connexion et cache vide');
      }
      return false;
    }
  }

  async checkConnection(): Promise<boolean> {
    this.logger.log('🌐 Vérification de connexion');
    
    try {
      await axios.get(this.baseURL, {
        headers: { 'x-fyk-key': this.apiKey },
        timeout: 5000
      });
      this.isOnline = true;
      this.logger.log('✅ Connexion OK');
      return true;
    } catch (error) {
      this.isOnline = false;
      this.logger.error('❌ Connexion échouée', {
        apiKey: this.maskApiKey(this.apiKey),
        error
      });
      return false;
    }
  }

  private sanitizeKey(key: Key): Key {
    const { meta, ...sanitized } = key;
    return sanitized as Key;
  }

  getStats() {
    const cacheKeys = this.cache.keys();
    const isValid = this.cache.isValidForApiKey(this.apiKey);
    
    const stats = {
      cachedKeys: cacheKeys.length,
      isOnline: this.isOnline,
      environment: this.environment,
      cacheType: this.environment === 'prod' ? 'Mémoire sécurisée' : 'Disque chiffré',
      // Maintient cacheValid et cacheId dans les stats, mais pas les logs habituels
      cacheValid: isValid,
      cacheId: this.cacheId,
      apiKey: this.maskApiKey(this.apiKey),
      status: !isValid ? '🔴 CACHE INVALIDE' : 
              this.isOnline ? '🟢 EN LIGNE' : 
              (cacheKeys.length > 0 ? '🟡 HORS LIGNE' : '🔴 HORS LIGNE (vide)'),
      debugEnabled: this.debug
    };

    this.logger.log('📊 Statistiques', stats);
    return stats;
  }

  /**
   * Obtient l'historique des logs (seulement en mode debug)
   */
  getLogHistory(): string[] {
    if (!this.debug) {
      this.logger.warn('📝 Historique des logs non disponible - activez le mode debug');
      return ['Mode debug non activé'];
    }
    return this.logger.getHistory();
  }

  /**
   * Nettoie complètement le cache
   */
  clearCache(): void {
    this.logger.log('🗑️ Nettoyage du cache demandé');
    this.cache.clear();
    this.logger.log('✅ Cache nettoyé');
  }

  /**
   * Active/désactive le mode debug à la volée
   */
  setDebug(enabled: boolean): void {
    this.debug = enabled;
    if (enabled) {
      this.logger.enable();
    } else {
      this.logger.disable();
    }
    this.logger.log(`🔧 Mode debug ${enabled ? 'activé' : 'désactivé'}`);
  }

  destroy(): void {
    this.logger.log('♻️ Destruction de l\'instance FetchYourKeys');
    this.cache.clear();
    this.logger.disable();
  }
}

export default FetchYourKeys;
export { 
  FetchYourKeys, 
  FetchYourKeysError, 
  CacheError, 
  NetworkError, 
  SecurityError 
};
