import { Injectable, signal, computed } from '@angular/core';

/**
 * Interface for the instance information from the API
 */
export interface AppInstanceInfo {
    registr: string;
    acronym: string;
}

/**
 * Interface for the complete API configuration response
 */
export interface AppConfig {
    rightMsg: string;
    instance: AppInstanceInfo;
    pdfMaxRange: string;
    version: string;
    indexerVersion: number;
    hash: string;
}

/**
 * Default configuration values used as fallback
 */
const DEFAULT_CONFIG: AppConfig = {
    rightMsg: '',
    instance: {
        registr: 'https://registr.digitalniknihovna.cz/library/mzk',
        acronym: 'mzk'
    },
    pdfMaxRange: '120',
    version: '7.1.3',
    indexerVersion: 20,
    hash: ''
};

/**
 * Service for managing application-wide configuration
 * Fetches and stores API configuration from the Kramerius API
 */
@Injectable({
    providedIn: 'root'
})
export class AppConfigService {

    /**
     * Writable signal containing the full app configuration
     */
    private config = signal<AppConfig>(DEFAULT_CONFIG);

    /**
     * Computed signal for PDF max range as a number
     */
    pdfMaxRange = computed(() => parseInt(this.config().pdfMaxRange, 10));

    /**
     * Computed signal for the instance acronym
     */
    instanceAcronym = computed(() => this.config().instance.acronym);

    /**
     * Computed signal for the API version
     */
    apiVersion = computed(() => this.config().version);

    /**
     * Computed signal for the indexer version
     */
    indexerVersion = computed(() => this.config().indexerVersion);

    /**
     * Computed signal for the right message
     */
    rightMsg = computed(() => this.config().rightMsg);

    /**
     * Gets the full configuration object
     */
    getConfig(): AppConfig {
        return this.config();
    }

    /**
     * Updates the configuration
     * @param newConfig - New configuration object
     */
    setConfig(newConfig: Partial<AppConfig>): void {
        this.config.update(current => ({
            ...current,
            ...newConfig
        }));
    }

    /**
     * Resets configuration to default values
     */
    resetToDefaults(): void {
        this.config.set(DEFAULT_CONFIG);
    }
}
