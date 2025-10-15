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
declare class FetchYourKeysError extends Error {
    code: string;
    details?: any | undefined;
    constructor(message: string, code: string, details?: any | undefined);
}
declare class CacheError extends FetchYourKeysError {
    constructor(message: string, details?: any);
}
declare class NetworkError extends FetchYourKeysError {
    constructor(message: string, details?: any);
}
declare class SecurityError extends FetchYourKeysError {
    constructor(message: string, details?: any);
}
declare class FetchYourKeys {
    private apiKey;
    private baseURL;
    private cache;
    private isOnline;
    private initializationPromise;
    private environment;
    private debug;
    private logger;
    private cacheId;
    constructor(options?: FetchYourKeysOptions);
    private maskApiKey;
    /**
     * Valide et normalise l'environnement
     */
    private validateEnvironment;
    private initializeWithOfflineSupport;
    private waitForInitialization;
    private loadAllKeys;
    get(label: string): Promise<Key | null>;
    getWithFallback(label: string, fallback?: string): Promise<string>;
    getMultiple(labels: string[]): Promise<Record<string, Key | null>>;
    getAll(): Promise<Key[]>;
    filter(predicate: (key: Key) => boolean): Promise<Key[]>;
    getByService(service: string): Promise<Key[]>;
    refresh(): Promise<boolean>;
    checkConnection(): Promise<boolean>;
    private sanitizeKey;
    getStats(): {
        cachedKeys: number;
        isOnline: boolean;
        environment: "dev" | "prod";
        cacheType: string;
        cacheValid: boolean;
        cacheId: string;
        apiKey: string;
        status: string;
        debugEnabled: boolean;
    };
    /**
     * Obtient l'historique des logs (seulement en mode debug)
     */
    getLogHistory(): string[];
    /**
     * Nettoie complètement le cache
     */
    clearCache(): void;
    /**
     * Active/désactive le mode debug à la volée
     */
    setDebug(enabled: boolean): void;
    destroy(): void;
}
export default FetchYourKeys;
export { FetchYourKeys, FetchYourKeysError, CacheError, NetworkError, SecurityError };
//# sourceMappingURL=index.d.ts.map