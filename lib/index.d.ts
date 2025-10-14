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
declare class FetchYourKeys {
    private apiKey;
    private baseURL;
    private cache;
    private isOnline;
    private initializationPromise;
    constructor(options?: FetchYourKeysOptions);
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
        status: string;
        cacheType: string;
    };
    /**
     * Nettoie complètement le cache
     */
    clearCache(): void;
    destroy(): void;
}
export default FetchYourKeys;
//# sourceMappingURL=index.d.ts.map