interface Key {
    id: string;
    label: string;
    service: string;
    value: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
/**
 * Structure de réponse standardisée pour toutes les opérations
 */
interface Result<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        suggestion?: string;
        details?: any;
    };
    metadata?: {
        cached: boolean;
        online: boolean;
        timestamp: string;
    };
}
interface FetchYourKeysOptions {
    apiKey?: string;
    baseURL?: string;
    environment?: 'dev' | 'prod';
    debug?: boolean;
    silentMode?: boolean;
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
    private initializationError;
    private environment;
    private debug;
    private silentMode;
    private logger;
    private cacheId;
    constructor(options?: FetchYourKeysOptions);
    private maskApiKey;
    private validateEnvironment;
    /**
     * ✅ NOUVELLE MÉTHODE: Initialisation avec validation automatique de la clé FYK
     * Le SDK vérifie automatiquement la validité de la clé à l'initialisation
     */
    private initializeWithAutoValidation;
    private waitForInitialization;
    /**
    * ✅ NOUVELLE MÉTHODE: Permet de vérifier l'état d'initialisation
    */
    getInitializationError(): FetchYourKeysError | null;
    /**
     * ✅ MÉTHODE AMÉLIORÉE: get() retourne Result<Key>
     */
    get(label: string): Promise<Result<Key>>;
    /**
     * ✅ NOUVELLE MÉTHODE: safeGet() - version simple qui ne throw jamais
     */
    safeGet(label: string, fallback?: string): Promise<string>;
    /**
     * ✅ MÉTHODE AMÉLIORÉE: getMultiple() retourne Result
     */
    getMultiple(labels: string[]): Promise<Result<Record<string, Key | null>>>;
    /**
     * ✅ MÉTHODE AMÉLIORÉE: refresh() retourne Result
     */
    refresh(): Promise<Result<boolean>>;
    getAll(): Promise<Key[]>;
    filter(predicate: (key: Key) => boolean): Promise<Key[]>;
    getByService(service: string): Promise<Key[]>;
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
        error: {
            code: string;
            message: string;
            suggestion: any;
        };
        debugEnabled: boolean;
        silentMode: boolean;
    } | {
        cachedKeys: number;
        isOnline: boolean;
        environment: "dev" | "prod";
        cacheType: string;
        cacheValid: boolean;
        cacheId: string;
        apiKey: string;
        status: string;
        debugEnabled: boolean;
        silentMode: boolean;
        error?: undefined;
    };
    getLogHistory(): Array<{
        timestamp: string;
        level: string;
        message: string;
        data?: any;
    }>;
    clearCache(): void;
    setDebug(enabled: boolean): void;
    setSilentMode(silent: boolean): void;
}
export default FetchYourKeys;
export { FetchYourKeys, FetchYourKeysError, CacheError, NetworkError, SecurityError, type Result, type Key, type FetchYourKeysOptions };
//# sourceMappingURL=index.d.ts.map