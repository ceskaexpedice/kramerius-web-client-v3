import { inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SolrService } from '../../core/solr/solr.service';
import { DocumentInfo } from '../models/document-info';
import { UserService } from './user.service';
import { LockService } from './lock.service';
import { concatMap, delay, first, from, map, Observable, of, switchMap } from 'rxjs';
import { getOpenLicenses } from '../../core/solr/solr-misc';

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
    private lockService = inject(LockService);

    /** The pid whose info is on display, so a lost lock can re-check it. */
    private currentPid: string | null = null;

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

    constructor() {
        // A lock that lapsed or was taken over no longer covers the page on screen;
        // re-reading its info flips the view to access denied (or re-acquires).
        this.lockService.lost$.pipe(takeUntilDestroyed()).subscribe(() => {
            if (this.currentPid) {
                this.loadPageInfo(this.currentPid);
            }
        });
    }

    /**
     * Loads page info for the given page UUID
     * @param pageUuid - The UUID of the page to load info for
     */
    loadPageInfo(pageUuid: string): void {
        if (!pageUuid) {
            console.warn('DocumentInfoService: Cannot load page info without UUID');
            return;
        }

        this.currentPid = pageUuid;
        this._isLoading.set(true);
        this._state.set('LOADING');
        this._error.set(null);

        this.solrService.getPageInfo(pageUuid)
            .pipe(
                switchMap(info => this.withLock(pageUuid, info)),
                delay(0)
            )
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
     * Takes a lock `info` offers when the page is not otherwise served, and returns
     * the info as it reads once the lock is held — `providedByLicenses` then names the
     * lock license. Stays in the LOADING state meanwhile, so access denied does not
     * flash up before the lock arrives.
     *
     * Nothing here is tied to a particular license: the backend lists under
     * `accessibleLocks` every lock license the reader may use for the page. They are
     * tried in order until one is free; one is enough to open the page. When all are
     * taken by other readers (409), the info is returned as is and
     * `LockService.unavailable` tells the access denied screen why.
     */
    private withLock(pageUuid: string, info: DocumentInfo): Observable<DocumentInfo> {
        const locks = info.accessibleLocks ?? [];

        // The reader moved on to something the held lock does not cover (another
        // document, without a full teardown of the detail view): free the slot.
        const held = this.lockService.held();
        if (held
            && !info.providedByLicenses?.includes(held.lock.right.license)
            && !locks.some(l => l.hash === held.lock.hash)) {
            this.lockService.release();
        }

        // Released for idleness, yet still served under it: the release has not
        // reached the server yet, or another tab of the session still holds the
        // lock. This tab stays released all the same.
        const idleReleased = this.lockService.idleReleased();
        if (idleReleased && info.providedByLicenses?.includes(idleReleased.right.license)) {
            return of(info);
        }

        if (!locks.length || info.providedByLicenses?.length) {
            // Served without a lock: neither a busy nor an idle-released lock applies
            // to this page. Moving on to it is input, too, so a later locked page may
            // take the lock again.
            this.lockService.clearUnavailable();
            this.lockService.clearIdleReleased();
            return of(info);
        }

        // Already held, yet the page is not served under it: re-reading would only
        // repeat this answer, so leave the page denied. A lock released because the
        // reader went idle stays released until they ask for it again (`retryLock`).
        if (locks.some(l => this.lockService.isHeld(l.hash) || this.lockService.idleReleased()?.hash === l.hash)) {
            return of(info);
        }

        return from(locks).pipe(
            concatMap(lock => this.lockService.acquire(lock)),
            first(acquired => acquired, false),
            switchMap(acquired => acquired
                ? this.solrService.getPageInfo(pageUuid)
                : of(info)),
            map(result => result ?? info)
        );
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
        this.currentPid = null;
        this.lockService.release();
        this.lockService.clearIdleReleased();
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

        // Open/public licenses are accessible to everyone, including anonymous users
        const openLicenses = getOpenLicenses();
        const publicLicenses = openLicenses.length > 0 ? openLicenses : ['public'];
        if (publicLicenses.some(l => info.providedByLicenses.includes(l))) {
            return true;
        }

        // A lock license is granted by holding the lock, not by the user's profile.
        if (this.lockService.holdsLicense(info.providedByLicenses)) {
            return true;
        }

        return this.userService.hasAnyLicense(info.providedByLicenses);
    }

    /**
     * Checks if the user can access the current document/page.
     * Mirrors the access-denied condition in the template:
     *   !isRecordPublic(licences) && !canAccessDocument() && !hasAnyLicense(licences)
     * When document licences are provided, a public document is always accessible.
     * @param documentLicences optional licences array from the document metadata
     * @returns true if user can access the document, false otherwise
     */
    canAccessDocument(documentLicences?: string[]): boolean {
        // A lock license is used through the lock itself: without it (busy, or
        // released for idleness) the profile license does not open the document.
        if (this.isLockUnavailable()) {
            return false;
        }
        if (documentLicences && documentLicences.length > 0) {
            const openLicenses = getOpenLicenses();
            const publicLicenses = openLicenses.length > 0 ? openLicenses : ['public'];
            if (publicLicenses.some(l => documentLicences.includes(l))) {
                return true;
            }
            if (this.userService.hasAnyLicense(documentLicences)) {
                return true;
            }
        }
        return this.userHasRequiredLicense();
    }

    /**
     * Why the page cannot be opened under its lock license, or null when the lock
     * is not in the way: `busy` — other readers hold every slot (409); `idle` — it
     * was released because the reader went idle.
     */
    lockBlockReason(): 'busy' | 'idle' | null {
        if (this.lockService.idleReleased()) return 'idle';
        if (this.lockService.unavailable()) return 'busy';
        return null;
    }

    /**
     * Whether the page can only be opened with a lock the reader does not hold.
     * Overrides the profile-license check: holding a lock license in the profile
     * does not serve the page without the lock itself.
     */
    isLockUnavailable(): boolean {
        return this.lockBlockReason() !== null;
    }

    /** Asks again for the lock of the page on display, after a 409 or an idle release. */
    retryLock(): void {
        this.lockService.clearIdleReleased();
        if (this.currentPid) {
            this.loadPageInfo(this.currentPid);
        }
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
