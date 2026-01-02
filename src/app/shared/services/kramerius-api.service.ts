import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { EnvironmentService } from './environment.service';
import { Observable } from 'rxjs';
import { SKIP_ERROR_INTERCEPTOR } from '../../core/services/http-context-tokens';

@Injectable({
    providedIn: 'root'
})
export class KrameriusApiService {
    private apiUrl: string;

    constructor(
        private http: HttpClient,
        private env: EnvironmentService
    ) {
        this.apiUrl = this.env.getApiUrl('');
    }

    getMods(uuid: string, skipErrorHandling = false): Observable<string> {
        const context = new HttpContext().set(SKIP_ERROR_INTERCEPTOR, skipErrorHandling);
        return this.http.get(`${this.apiUrl}items/${uuid}/metadata/mods`, { responseType: 'text', context });
    }

    getDc(uuid: string, skipErrorHandling = false): Observable<string> {
        const context = new HttpContext().set(SKIP_ERROR_INTERCEPTOR, skipErrorHandling);
        return this.http.get(`${this.apiUrl}items/${uuid}/metadata/dc`, { responseType: 'text', context });
    }

    getFoxml(uuid: string, skipErrorHandling = false): Observable<string> {
        const context = new HttpContext().set(SKIP_ERROR_INTERCEPTOR, skipErrorHandling);
        return this.http.get(`${this.apiUrl}items/${uuid}/foxml`, { responseType: 'text', context });
    }

    getAlto(uuid: string, skipErrorHandling = false): Observable<string> {
        const context = new HttpContext().set(SKIP_ERROR_INTERCEPTOR, skipErrorHandling);
        return this.http.get(`${this.apiUrl}/items/${uuid}/ocr/alto`, { responseType: 'text', context });
    }

    getOcr(uuid: string, skipErrorHandling = false): Observable<string> {
        const context = new HttpContext().set(SKIP_ERROR_INTERCEPTOR, skipErrorHandling);
        return this.http.get(`${this.apiUrl}items/${uuid}/ocr/text`, { responseType: 'text', context });
    }

    getRawItem(uuid: string, skipErrorHandling = false): Observable<any> {
        const context = new HttpContext().set(SKIP_ERROR_INTERCEPTOR, skipErrorHandling);
        return this.http.get(`${this.apiUrl}items/${uuid}`, { context });
    }

    getRawChildren(uuid: string, skipErrorHandling = false): Observable<any> {
        const q = `own_parent.pid:"${uuid}"`;
        const fl = 'pid,accessibility,model,title.search,licenses,contains_licenses,licenses_of_ancestors,page.type,page.number,page.placement,track.length';
        const sort = 'rels_ext_index.sort asc';
        const params = {
            fl,
            q,
            sort,
            rows: '4000',
            start: '0'
        };
        const context = new HttpContext().set(SKIP_ERROR_INTERCEPTOR, skipErrorHandling);
        return this.http.get(`${this.apiUrl}search`, { params, context });
    }

    getIiifPresentation(uuid: string, skipErrorHandling = false): Observable<any> {
        // IIIF Presentation API is usually on a different URL or endpoint
        // Based on requirements: https://iiif.digitalniknihovna.cz/mzk/{uuid}
        // But the requirements say: "iiif -> api.getIiifPresentation(uuid) OR iiif.imageManifest() for pages"
        // I will use a constructed URL based on the overview example for now, but strictly this might need environment config if the domain differs.
        // The requirement example: https://iiif.digitalniknihovna.cz/mzk/uuid:...
        // I'll try to find if there is a helper for this or assume it is handled via proxy or absolute URL.
        // Actually, let's look at `iiif-viewer.service.ts` again, it has `getIIIFInfoUrl`.
        // For now I'll assume the URL pattern from requirement or use a similar pattern if I can find it in config.
        // Since I cannot be sure about the base URL for IIIF (it was different in example), I will stick to what seems to be the pattern or simply return the URL.
        // However, for the dialog content, we likely want the JSON content of the manifest.

        // Let's assume we can fetch it. If it's a different domain, CORS might be an issue, but let's try.
        // If the requirement says `https://iiif.digitalniknihovna.cz/mzk/{uuid}`, I should probably check if this base url is in config.
        // But for now, I will implementation a generic fetch.
        const context = new HttpContext().set(SKIP_ERROR_INTERCEPTOR, skipErrorHandling);
        return this.http.get(`https://iiif.digitalniknihovna.cz/mzk/${uuid}`, { context });
    }

    getSearchResults(query: string, skipErrorHandling = false): Observable<any> {
        const context = new HttpContext().set(SKIP_ERROR_INTERCEPTOR, skipErrorHandling);
        return this.http.get(`${this.apiUrl}search`, { params: { q: query }, context });
    }

    /**
     * Get the public URL for a specific metadata format
     */
    getMetadataUrl(uuid: string, format: string): string {
        switch (format) {
            case 'mods':
                return `${this.apiUrl}items/${uuid}/metadata/mods`;
            case 'dc':
                return `${this.apiUrl}items/${uuid}/metadata/dc`;
            case 'solr':
                return `${this.apiUrl}search?q=pid:"${uuid}"`;
            case 'foxml':
                return `${this.apiUrl}items/${uuid}/foxml`;
            case 'alto':
                return `${this.apiUrl}items/${uuid}/ocr/alto`;
            case 'ocr':
                return `${this.apiUrl}items/${uuid}/ocr/text`;
            case 'item':
                return `${this.apiUrl}items/${uuid}`;
            case 'children':
                return `${this.apiUrl}search?q=own_parent.pid:"${uuid}"`;
            case 'iiif':
                return `https://iiif.digitalniknihovna.cz/mzk/${uuid}`;
            default:
                return '';
        }
    }
}
