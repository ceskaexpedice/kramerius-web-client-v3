import { inject, Injectable, signal } from '@angular/core';
import { SolrService } from '../../core/solr/solr.service';
import { DocumentInfo } from '../models/document-info';
import { UserService } from './user.service';
import { delay } from 'rxjs';

export type DocumentInfoState = 'INITIAL' | 'LOADING' | 'LOADED' | 'ERROR' | 'CLEARED';

/**
 * Service for managing document/page info data
 * Handles fetching and storing page-specific information from the Kramerius API
 */
@Injectable({
    providedIn: 'root'
})
export class DocumentInfoService {
    private solrService = inject(SolrService);
    private userService = inject(UserService);

    // Signal to store the current page info
    private _currentPageInfo = signal<DocumentInfo | null>(null);

    // Public readonly signal
    public readonly currentPageInfo = this._currentPageInfo.asReadonly();

    // Signal to track loading state
    private _isLoading = signal<boolean>(false);
    public readonly isLoading = this._isLoading.asReadonly();

    // Signal to track detailed state
    private _state = signal<DocumentInfoState>('INITIAL');
    public readonly state = this._state.asReadonly();

    // Signal to track errors
    private _error = signal<string | null>(null);
    public readonly error = this._error.asReadonly();

    /**
     * Loads page info for the given page UUID
     * @param pageUuid - The UUID of the page to load info for
     */
    loadPageInfo(pageUuid: string): void {
        if (!pageUuid) {
            console.warn('DocumentInfoService: Cannot load page info without UUID');
            return;
        }

        this._isLoading.set(true);
        this._state.set('LOADING');
        this._error.set(null);

        this.solrService.getPageInfo(pageUuid)
            .pipe(delay(0))
            .subscribe({
                next: (pageInfo: DocumentInfo) => {
                    this._currentPageInfo.set(pageInfo);
                    this._isLoading.set(false);
                    this._state.set('LOADED');
                    console.log('DocumentInfoService: Page info loaded for', pageUuid, pageInfo);
                },
                error: (error: any) => {
                    console.error('DocumentInfoService: Error loading page info:', error);
                    this._error.set(error?.message || 'Failed to load page info');
                    this._isLoading.set(false);
                    this._state.set('ERROR');
                    this._currentPageInfo.set(null);
                }
            });
    }

    /**
     * Clears the current page info
     */
    clearPageInfo(): void {
        this._currentPageInfo.set(null);
        this._error.set(null);
        this._isLoading.set(false);
        this._state.set('CLEARED');
    }

    /**
     * Resets the service to initial state
     */
    reset(): void {
        this._currentPageInfo.set(null);
        this._error.set(null);
        this._isLoading.set(false);
        this._state.set('INITIAL');
    }

    /**
     * Gets the current page info value (non-reactive)
     */
    getCurrentPageInfo(): DocumentInfo | null {
        return this._currentPageInfo();
    }

    /**
   * Checks if OCR text is available for the current page
   */
    hasOcrText(): boolean {
        const info = this._currentPageInfo();
        return info?.data?.ocr?.text === true;
    }

    /**
     * Checks if ALTO XML is available for the current page
     */
    hasAlto(): boolean {
        const info = this._currentPageInfo();
        return info?.data?.ocr?.alto === true;
    }

    /**
     * Checks if full image is available for the current page
     */
    hasFullImage(): boolean {
        const info = this._currentPageInfo();
        return info?.data?.image?.full === true;
    }

    /**
     * Checks if preview image is available for the current page
     */
    hasPreviewImage(): boolean {
        const info = this._currentPageInfo();
        return info?.data?.image?.preview === true;
    }

    /**
     * Checks if MODS metadata is available for the current page
     */
    hasModsMetadata(): boolean {
        const info = this._currentPageInfo();
        return info?.data?.metadata?.mods === true;
    }

    /**
     * Checks if the user has any of the required licenses to access the document
     * Compares user's licenses from UserService with providedByLicenses from page info
     * providedByLicenses has higher priority - these are the licenses that grant access
     * @returns true if user has at least one matching license from providedByLicenses, false otherwise
     */
    userHasRequiredLicense(): boolean {
        const info = this._currentPageInfo();

        // If no page info or providedByLicenses is empty, deny access
        if (!info || !info.providedByLicenses || info.providedByLicenses.length === 0) {
            return false;
        }

        const userLicenses = this.userService.licenses;
        if (!userLicenses || userLicenses.length === 0) {
            // User has no licenses
            return false;
        }

        // Check if user has at least one license that matches providedByLicenses
        return info.providedByLicenses.some(providedLicense =>
            userLicenses.includes(providedLicense)
        );
    }

    /**
     * Checks if the user can access the current document/page
     * Alias for userHasRequiredLicense() for better readability
     * @returns true if user can access the document, false otherwise
     */
    canAccessDocument(): boolean {
        return this.userHasRequiredLicense();
    }

    /**
     * Gets the list of required licenses for the current page
     * @returns Array of required license strings, or empty array if none
     */
    getRuntimeLicenses(): string[] {
        const info = this._currentPageInfo();
        return info?.providedByLicenses || [];
    }

    /**
     * Gets the list of licenses the user currently has
     * @returns Array of user's license strings
     */
    getUserLicenses(): string[] {
        return this.userService.licenses;
    }

    /**
     * Gets the list of missing licenses (required but not owned by user)
     * @returns Array of license strings that are required but user doesn't have
     */
    getMissingLicenses(): string[] {
        const requiredLicenses = this.getRuntimeLicenses();
        const userLicenses = this.getUserLicenses();

        return requiredLicenses.filter(license => !userLicenses.includes(license));
    }
}
