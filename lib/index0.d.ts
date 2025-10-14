interface Key {
    id: string;
    label: string;
    service: string;
    value: string;
    meta: {
        tags?: string[];
        notes?: string;
        [key: string]: any;
    };
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
    private loaded;
    /**
     * Initializes the FetchYourKeys SDK.
     * @param {FetchYourKeysOptions} options - Configuration options for the SDK.
     * @param {string} [options.apiKey] - API key for authentication (optional if set via env).
     * @param {string} [options.baseURL] - Base URL for the API (defaults to production URL).
     * @throws {Error} If API key is missing.
     */
    constructor(options?: FetchYourKeysOptions);
    /**
     * Loads all keys from the API into the cache.
     * @private
     * @returns {Promise<void>} Resolves when keys are loaded.
     * @throws {Error} If API response is invalid or network fails.
     */
    private loadAllKeys;
    /**
     * Retrieves a specific key by label from cache or API.
     * @param {string} label - The label of the key to retrieve.
     * @returns {Promise<Key | null>} The key object or null if not found.
     */
    get(label: string): Promise<Key | null>;
    /**
     * Retrieves all keys from the cache.
     * @returns {Promise<Key[]>} Array of all cached keys.
     */
    getAll(): Promise<Key[]>;
}
export default FetchYourKeys;
export { FetchYourKeys as FetchYourKeysCJS };
//# sourceMappingURL=index0.d.ts.map