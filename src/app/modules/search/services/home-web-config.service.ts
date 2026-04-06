import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { RecordItem } from '../../../shared/components/record-item/record-item.model';
import { SKIP_ERROR_INTERCEPTOR } from '../../../core/services/http-context-tokens';

/**
 * Configuration for a section on the search/home page.
 */
/**
 * Category item for the 'local-categories' section type.
 */
export interface LinkItem {
    /** The label to display (translation key or raw string). */
    label: string;
    /** The URL to navigate to when clicked. */
    url: string;
    /** Optional icon URL. */
    icon?: string;
    /** Optional count/badge to display. */
    count?: number;
}

export interface SectionConfig {
    /**
     * The type of the section.
     * - `periodicals`, `books`, `genres`, etc.: Standard sections with built-in logic.
     * - `local-records`: A carousel section with record items from local config.
     * - `local-categories`: A grid section with category items from local config (like genres but with custom data).
     */
    type: 'periodicals' | 'books' | 'authors' | 'genres' | 'images' | 'document-types' | 'map' | 'institutions' | 'local-records' | 'local-categories';

    /** The title of the section (translation key or raw string). */
    title: string;

    /**
     * List of items to display in a 'local-records' section.
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

    /**
     * Optional URL for the "Show more" button.
     * If present, a button will be displayed in the section header linking to this URL.
     */
    sectionUrl?: string;

    /**
     * Optional text for the "Show more" button.
     * If not present, the default translation key 'btn_show_more' is used.
     */
    buttonText?: string;

    /**
     * Optional card variant for custom sections.
     * - `default`: Standard record item card
     * - `author`: Author card with different dimensions
     */
    cardVariant?: 'default' | 'portrait';

    /**
     * List of category items for 'local-categories' section type.
     * Each item has a label and URL, optionally an icon and count.
     */
    categories?: LinkItem[];

    /**
     * Whether to show count badges in 'local-categories' section.
     * Default is true.
     */
    showCount?: boolean;
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
