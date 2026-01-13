import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { RecordItem } from '../../../shared/components/record-item/record-item.model';
import { SKIP_ERROR_INTERCEPTOR } from '../../../core/services/http-context-tokens';

/**
 * Configuration for a section on the search/home page.
 */
export interface SectionConfig {
    /**
     * The type of the section.
     * - `periodicals`, `books`, `genres`, etc.: Standard sections with built-in logic.
     * - `custom`: A section where you define items manually or via API lookup.
     */
    type: 'periodicals' | 'books' | 'authors' | 'genres' | 'images' | 'document-types' | 'map' | 'institutions' | 'custom';

    /** The title of the section (translation key or raw string). */
    title: string;

    /**
     * List of items to display in a 'custom' section.
     * - If an item has an `id` (PID), data will be fetched from the API.
     * - Properties defined here (title, imageUrl, etc.) override API data.
     * - Items without `id` are purely manual.
     */
    items?: Partial<RecordItem>[];

    /**
     * @deprecated Use `items` with `id` property instead.
     * List of PIDs to fetch from API. 
     */
    pids?: string[];

    /** If true, the section will be hidden if there are no items to display. */
    hideIfEmpty?: boolean;

    /** 
     * Controls visibility of the section. 
     * Default is true. Set to false to hide the section.
     */
    visible?: boolean;

    /** Optional comment for configuration management (ignored by application). */
    comment?: string;
}

@Injectable({
    providedIn: 'root'
})
export class HomeWebConfigService {
    private http = inject(HttpClient);

    private configUrl = 'local-config/home-sections.json';

    private readonly DEFAULT_SECTIONS: SectionConfig[] = [
        { type: 'periodicals', title: 'periodical' },
        { type: 'books', title: 'book' },
        { type: 'genres', title: 'genres' },
        { type: 'document-types', title: 'document-types' },
        // Add other default sections if needed to match original hardcoded template
        // { type: 'images', title: 'images' }, 
        // { type: 'authors', title: 'authors' },
        // { type: 'map', title: 'map' },
        // { type: 'institutions', title: 'institutions' }
    ];

    config$: Observable<SectionConfig[]> = this.http.get<SectionConfig[]>(`${this.configUrl}?t=${new Date().getTime()}`, {
        context: new HttpContext().set(SKIP_ERROR_INTERCEPTOR, true)
    }).pipe(
        shareReplay(1),
        map(config => {
            if (!config || config.length === 0) {
                return this.DEFAULT_SECTIONS;
            }
            return config.filter(section => section.visible !== false);
        }),
        catchError(err => {
            console.error('Failed to load home sections config, using default', err);
            return of(this.DEFAULT_SECTIONS);
        })
    );

    getConfig(): Observable<SectionConfig[]> {
        return this.config$;
    }
}
