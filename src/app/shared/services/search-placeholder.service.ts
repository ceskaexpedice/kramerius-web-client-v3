import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';

import { ConfigService } from '../../core/config/config.service';
import {
  customDefinedFacetsEnum,
  facetKeysEnum,
} from '../../modules/search-results-page/const/facets';
import { AppTranslationService } from '../translation/app-translation.service';
import { resolveNamespacedTranslation } from '../translation/namespaced-translation';

/**
 * Builds the header search input placeholder from the currently active filters,
 * mirroring the behaviour of the legacy client:
 *
 *  - no filters                   -> "Hledat v celé digitální knihovně"
 *  - only "Veřejné" accessibility -> "Hledat ve veřejných dokumentech digitální knihovny"
 *  - anything else                -> "Hledat s filtry <label>, <label>, ..."
 *
 * Filter labels are resolved with the same rules the filter chips use, so the
 * placeholder always reads exactly like the selected facet values.
 */
@Injectable({ providedIn: 'root' })
export class SearchPlaceholderService {
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly translationService = inject(AppTranslationService);
  private readonly configService = inject(ConfigService);

  /**
   * Order in which filters are listed, matching the legacy client:
   * document type, author, year range, keyword, geographic name, publisher,
   * language, physical location. Anything unlisted keeps its natural order at
   * the end, so new facets degrade gracefully instead of disappearing.
   */
  private static readonly FACET_ORDER: string[] = [
    customDefinedFacetsEnum.accessibility,
    facetKeysEnum.license,
    customDefinedFacetsEnum.model,
    facetKeysEnum.model,
    facetKeysEnum.rootModel,
    facetKeysEnum.authors,
    facetKeysEnum.keywords,
    facetKeysEnum.geographic_names,
    facetKeysEnum.publishers,
    facetKeysEnum.publication_places,
    facetKeysEnum.genres,
    facetKeysEnum.subjectNamesPersonal,
    facetKeysEnum.subjectNamesCorporate,
    facetKeysEnum.subjectTemporals,
    facetKeysEnum.languages,
    facetKeysEnum.physical_locations,
    facetKeysEnum.cdkCollection,
  ];

  /** Year range is injected right after the author group, as in the old client. */
  private static readonly YEAR_RANGE_AFTER = facetKeysEnum.authors;

  /** Query params that carry active filters, watched for changes. */
  private readonly queryParams = toSignal(
    this.router.events.pipe(map(() => this.router.routerState.snapshot.root.queryParams)),
    { initialValue: this.router.routerState.snapshot.root.queryParams }
  );

  /**
   * The placeholder for the header search input, recomputed whenever the active
   * filters or the UI language change.
   */
  readonly placeholder = computed<string>(() => {
    // Touch the current language so the placeholder recomputes on switch.
    this.translationService.currentLanguage();

    const labels = this.activeFilterLabels(this.queryParams());

    if (labels.length === 0) {
      return this.translate.instant('search-placeholder-whole-library');
    }

    if (labels.length === 1 && this.isPublicOnly(this.queryParams())) {
      return this.translate.instant('search-placeholder-public-documents');
    }

    return this.translate.instant('search-placeholder-with-filters', {
      filters: labels.join(', '),
    });
  });

  /** True when the only active filter is the "public" accessibility facet. */
  private isPublicOnly(params: Record<string, any>): boolean {
    const filters = this.collectFilters(params);
    return (
      filters.length === 1 &&
      filters[0] === `${customDefinedFacetsEnum.accessibility}:public`
    );
  }

  /** Human-readable labels of every active filter, in display order. */
  private activeFilterLabels(params: Record<string, any>): string[] {
    const filters = this.collectFilters(params);
    const ordered = this.sortFilters(filters);

    const labels = ordered.map(filter => this.labelFor(filter)).filter(label => !!label);

    const yearRange = this.yearRangeLabel(params);
    if (!yearRange) {
      return labels;
    }

    // Insert the year range at the position the legacy client uses.
    const anchor = ordered.findIndex(
      f => this.fieldOf(f) === SearchPlaceholderService.YEAR_RANGE_AFTER
    );
    const insertAt = anchor === -1 ? labels.length : anchor + 1;
    return [...labels.slice(0, insertAt), yearRange, ...labels.slice(insertAt)];
  }

  /** Active `fq` + `customSearch` filters as `field:value` strings. */
  private collectFilters(params: Record<string, any>): string[] {
    const fq = params['fq'];
    const fqFilters: string[] = Array.isArray(fq) ? fq : fq ? [fq] : [];

    const custom = params['customSearch'];
    const customFilters: string[] = Array.isArray(custom)
      ? custom
      : custom
        ? String(custom).split(',')
        : [];

    return [...fqFilters, ...customFilters]
      .map(f => String(f).trim())
      .filter(f => f.length > 0)
      // "all" is the default accessibility and reads as no filter at all.
      .filter(f => f !== `${customDefinedFacetsEnum.accessibility}:all`);
  }

  private sortFilters(filters: string[]): string[] {
    const rank = (filter: string) => {
      const index = SearchPlaceholderService.FACET_ORDER.indexOf(this.fieldOf(filter));
      return index === -1 ? SearchPlaceholderService.FACET_ORDER.length : index;
    };
    return [...filters].sort((a, b) => rank(a) - rank(b));
  }

  private fieldOf(filter: string): string {
    return filter.includes(':') ? filter.split(':')[0] : '';
  }

  private valueOf(filter: string): string {
    // Values may themselves contain ':' (e.g. "vc:uuid"), so only split once.
    const separator = filter.indexOf(':');
    return separator === -1 ? filter : filter.slice(separator + 1);
  }

  /**
   * Resolves a single `field:value` filter to its display label using the same
   * rules as the filter chips: licenses come from config, languages from the
   * 'language' namespace, accessibility from its custom keys, everything else
   * from the global namespace (which already contains the physical-location and
   * source code tables) with a raw-value fallback.
   */
  private labelFor(filter: string): string {
    const field = this.fieldOf(filter);
    const value = this.valueOf(filter);

    if (!value) {
      return '';
    }

    if (field === facetKeysEnum.license) {
      const lang = this.translationService.currentLanguage().code;
      return this.configService.getLocalizedLabel('license', value, lang) || value;
    }

    if (field === facetKeysEnum.languages) {
      return resolveNamespacedTranslation(this.translate, value, 'language');
    }

    if (field === customDefinedFacetsEnum.accessibility) {
      return this.translateOrRaw(`custom-accessibility--${value}`, value);
    }

    return this.translateOrRaw(value, value);
  }

  /** Translates a key, falling back to the raw value when there is no entry. */
  private translateOrRaw(key: string, raw: string): string {
    const translated = this.translate.instant(key);
    return translated === key ? raw : translated;
  }

  /** "1900 - 1950" when a year range is active, otherwise an empty string. */
  private yearRangeLabel(params: Record<string, any>): string {
    const from = params['yearFrom'];
    const to = params['yearTo'];

    if (!from && !to) {
      return '';
    }

    const currentYear = new Date().getFullYear();
    return `${from ?? 0} - ${to ?? currentYear}`;
  }
}
