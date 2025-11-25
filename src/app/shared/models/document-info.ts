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
    accessibleLocks: string[];
}
