/**
 * Page info response from Kramerius API
 * Endpoint: /items/{uuid}/info
 */
export interface DocumentInfo {
    image: {
        type: string; // e.g., "tiles"
    };
    providedByLicenses: string[];
    data: {
        image: {
            preview: boolean;
            thumb: boolean;
            full: boolean;
        };
        metadata: {
            mods: boolean;
            dc: boolean;
        };
        audio: {
            mp3: boolean;
            wav: boolean;
            ogg: boolean;
        };
        ocr: {
            text: boolean;
            alto: boolean;
        };
    };
    /** Locks the signed-in reader may request to get the content (see `LockService`). */
    accessibleLocks?: AccessibleLock[];
}

/** An exclusive-reader lock offered by `items/{uuid}/info`. */
export interface AccessibleLock {
    right: {
        license: string;
        id: number;
    };
    type: string; // e.g. "INSTANCE"
    hash: string;
}

/** A held lock, as returned by `locks/{hash}` and `locks/{hash}/refresh`. */
export interface LockItem {
    username: string;
    tokenId: string;
    /** Seconds the lock stays valid after its last refresh. */
    refreshInterval: number;
    createdTime: string;
    refreshedTime: string;
    /** The lock cannot be held past this instant, refreshed or not. */
    maxTime: string;
}
