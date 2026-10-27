import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { SolrService } from '../../core/solr/solr.service';
import { DocumentTypeEnum } from '../../modules/constants/document-type';
import { PeriodicalItemYear } from '../../modules/models/periodical-item';
import {
  selectAvailableYearsForCurrentDocument,
  selectPeriodicalChildren
} from '../../modules/periodical/state/periodical-detail/periodical-detail.selectors';
import { selectDocumentDetail } from '../state/document-detail/document-detail.selectors';
import { normalizeIssueTypeCode } from '../utils/issue-type-code';

/** The issue the header arrows lead to, described only by its own Solr fields. */
export interface PeriodicalNeighbor {
  pid: string;
  date: string;
  number: string;
  issueTypeCode?: string;
  /** Year of the neighbour's volume — set only when it lies in another volume than the current issue. */
  otherVolumeYear?: string;
}

export interface PeriodicalNeighbors {
  previous: PeriodicalNeighbor | null;
  next: PeriodicalNeighbor | null;
}

const NONE: PeriodicalNeighbors = { previous: null, next: null };

/**
 * Previous / next issue of the periodical item on screen (#200), shared by the
 * header arrows (tooltip) and the description panel. Mirrors the order
 * DetailViewService.goTo{Previous,Next}PeriodicalIssue walks: the loaded volume's
 * children, then the last / first issue of the adjacent volume, which is fetched
 * here once per volume.
 */
@Injectable({ providedIn: 'root' })
export class PeriodicalNeighborsService {
  private store = inject(Store);
  private solr = inject(SolrService);
  private translate = inject(TranslateService);

  private document = toSignal(this.store.select(selectDocumentDetail), { initialValue: null });
  private children = toSignal(this.store.select(selectPeriodicalChildren), { initialValue: [] as any[] });
  private volumes = toSignal(this.store.select(selectAvailableYearsForCurrentDocument), { initialValue: [] as PeriodicalItemYear[] });

  /** Issues of adjacent volumes keyed by volume pid. */
  private volumeIssues = signal<Record<string, any[]>>({});
  private requested = new Set<string>();

  /** Index of the current issue in the loaded children, or -1 when not applicable. */
  private position = computed(() => {
    const doc: any = this.document();
    if (doc?.model !== DocumentTypeEnum.periodicalitem || !doc.uuid) return -1;
    return this.children().findIndex(c => c?.pid === doc.uuid);
  });

  readonly neighbors = computed<PeriodicalNeighbors>(() => {
    const index = this.position();
    if (index === -1) return NONE;
    const children = this.children();
    return {
      previous: index > 0 ? this.toNeighbor(children[index - 1]) : this.fromAdjacentVolume(-1),
      next: index < children.length - 1 ? this.toNeighbor(children[index + 1]) : this.fromAdjacentVolume(1),
    };
  });

  constructor() {
    // Fetch the adjacent volume only when the current issue sits at its volume's edge.
    effect(() => {
      const index = this.position();
      if (index === -1) return;
      const last = this.children().length - 1;
      if (index === 0) this.ensureVolumeIssues(this.adjacentVolume(-1));
      if (index === last) this.ensureVolumeIssues(this.adjacentVolume(1));
    });
  }

  /** One-line description, e.g. "14. 3. 1902 · Číslo 11 · Ranné vydanie · Ročník 1903". */
  describe(neighbor: PeriodicalNeighbor | null): string {
    if (!neighbor) return '';
    return [
      neighbor.date,
      neighbor.number ? `${this.translate.instant('issue')} ${neighbor.number}` : '',
      neighbor.issueTypeCode ? this.translate.instant(`${neighbor.issueTypeCode}-issue`) : '',
      neighbor.otherVolumeYear ? `${this.translate.instant('volume')} ${neighbor.otherVolumeYear}` : '',
    ].filter(Boolean).join(' · ');
  }

  private adjacentVolume(direction: -1 | 1): PeriodicalItemYear | null {
    const doc: any = this.document();
    const volumes = this.volumes();
    const index = volumes.findIndex(v => v.pid === doc?.ownParentPid);
    if (index === -1) return null;
    return volumes[index + direction] ?? null;
  }

  private fromAdjacentVolume(direction: -1 | 1): PeriodicalNeighbor | null {
    const volume = this.adjacentVolume(direction);
    const issues = volume ? this.volumeIssues()[volume.pid] : undefined;
    if (!volume || !issues?.length) return null;
    const issue = direction === -1 ? issues[issues.length - 1] : issues[0];
    return this.toNeighbor(issue, String(volume['date.str'] ?? volume.year ?? ''));
  }

  private ensureVolumeIssues(volume: PeriodicalItemYear | null): void {
    if (!volume?.pid || this.requested.has(volume.pid)) return;
    this.requested.add(volume.pid);
    this.solr.getPeriodicalItems(volume.pid).subscribe({
      next: items => {
        const issues = items.filter(i => i?.model !== DocumentTypeEnum.page);
        this.volumeIssues.update(cache => ({ ...cache, [volume.pid]: issues }));
      },
      // Allow a retry on the next visit; the arrows still navigate without it.
      error: () => this.requested.delete(volume.pid),
    });
  }

  private toNeighbor(item: any, otherVolumeYear?: string): PeriodicalNeighbor | null {
    if (!item?.pid) return null;
    return {
      pid: item.pid,
      date: item['date.str'] ?? '',
      number: item['part.number.str'] ?? '',
      issueTypeCode: normalizeIssueTypeCode(item['issue.type.code']),
      otherVolumeYear: otherVolumeYear || undefined,
    };
  }
}
