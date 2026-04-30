import {
  ChangeDetectionStrategy,
  Component,
  OnChanges,
  SimpleChanges,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MatRadioButton } from '@angular/material/radio';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { Metadata, fromSolrToMetadata } from '../../../../models/metadata.model';
import { RecordHandlerService } from '../../../../services/record-handler.service';
import { DocumentTypeEnum } from '../../../../../modules/constants/document-type';
import { SolrService } from '../../../../../core/solr/solr.service';

export type RepresentativePageTarget =
  | { kind: 'model'; key: string; labelKey: string; pid: string }
  | { kind: 'collections-group'; key: typeof COLLECTIONS_GROUP_KEY; labelKey: string }
  | { kind: 'collection'; key: string; label: string; pid: string };

export interface RepresentativePageSectionData {
  pagePid: string;
  targetPid: string;
  targetLabel: string;
}

export const COLLECTIONS_GROUP_KEY = 'group:collections';

interface CollectionRef {
  uuid: string;
  name: string;
}

@Component({
  selector: 'app-edit-representative-page-section',
  standalone: true,
  imports: [MatRadioButton, TranslatePipe],
  templateUrl: './edit-representative-page-section.component.html',
  styleUrls: [
    './edit-representative-page-section.component.scss',
    '../edit-selected-dialog-section.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditRepresentativePageSectionComponent implements OnChanges {
  readonly document = input<Metadata | null>(null);
  readonly dataChange = output<RepresentativePageSectionData>();
  readonly actionClick = output<void>();

  private readonly recordHandler = inject(RecordHandlerService);
  private readonly solr = inject(SolrService);

  readonly targets = signal<RepresentativePageTarget[]>([]);
  readonly selectedModelKey = signal<string>('');
  readonly selectedCollectionKey = signal<string>('');

  readonly isCollectionGroupSelected = computed(() => !!this.selectedCollectionKey());

  readonly selectedKey = computed(() =>
    this.isCollectionGroupSelected() ? COLLECTIONS_GROUP_KEY : this.selectedModelKey()
  );

  private readonly activeTarget = computed<RepresentativePageTarget | undefined>(() => {
    const lookupKey = this.isCollectionGroupSelected()
      ? this.selectedCollectionKey()
      : this.selectedModelKey();
    return this.targets().find(t => t.key === lookupKey);
  });

  readonly canSave = computed(() => {
    const target = this.activeTarget();
    if (!target || !this.pagePid()) {
      return false;
    }
    return target.kind !== 'collections-group' && !!target.pid;
  });

  private readonly pagePid = signal<string>('');
  private pageDocument: Metadata | null = null;
  private rawPageDoc: Record<string, unknown> | null = null;
  private collectionsForPage: CollectionRef[] = [];
  private loadedForUuid: string | null = null;

  constructor() {
    effect(() => {
      const target = this.activeTarget();
      this.dataChange.emit({
        pagePid: this.pagePid(),
        targetPid: target && target.kind !== 'collections-group' ? target.pid : '',
        targetLabel: this.resolveLabel(target),
      });
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['document']) {
      return;
    }
    const newUuid = this.document()?.uuid ?? null;
    if (newUuid !== this.loadedForUuid) {
      this.loadedForUuid = newUuid;
      this.loadAndBuild();
    }
  }

  onModelRadioChange(key: string): void {
    this.selectedCollectionKey.set('');
    this.selectedModelKey.set(key);
  }

  onCollectionRadioChange(key: string): void {
    this.selectedModelKey.set('');
    this.selectedCollectionKey.set(key);
  }

  onActionClick(): void {
    this.actionClick.emit();
  }

  private async loadAndBuild(): Promise<void> {
    const doc = this.document();
    this.resetState();

    if (!doc?.uuid) {
      this.buildTargets();
      return;
    }

    try {
      // One Solr fetch: the page doc carries `in_collections`, `pid_paths`, and
      // `own_model_path`, which together provide everything we need to show the
      // ancestor chain and resolve concrete PIDs without additional lookups.
      const pageItem = await firstValueFrom(this.solr.getDetailItem(doc.uuid));
      this.rawPageDoc = (pageItem ?? null) as Record<string, unknown> | null;
      this.pageDocument = pageItem ? fromSolrToMetadata(pageItem) : doc;
      this.collectionsForPage = await this.loadCollections(this.pageDocument?.inCollections ?? []);
    } catch (e) {
      console.error('Failed to load representative-page targets', e);
      this.pageDocument ??= doc;
    }

    this.pagePid.set(this.resolvePagePid());
    this.buildTargets();
  }

  private resetState(): void {
    this.pageDocument = null;
    this.rawPageDoc = null;
    this.collectionsForPage = [];
    this.pagePid.set('');
  }

  private async loadCollections(
    raw: ReadonlyArray<{ uuid: string; name?: string }>
  ): Promise<CollectionRef[]> {
    const uuids = raw.map(c => c.uuid).filter(Boolean);
    if (uuids.length === 0) {
      return [];
    }
    const docs = (await firstValueFrom(this.solr.getDocumentsByPids(uuids))) as Array<{
      pid: string;
      'title.search'?: string;
    }>;
    const nameByPid = new Map(docs?.map(d => [d.pid, d['title.search'] ?? '']) ?? []);
    return raw.map(c => ({
      uuid: c.uuid,
      name: c.name || nameByPid.get(c.uuid) || c.uuid,
    }));
  }

  private buildTargets(): void {
    this.selectedModelKey.set('');
    this.selectedCollectionKey.set('');

    const doc = this.pageDocument;
    if (!doc) {
      this.targets.set([]);
      return;
    }

    const next: RepresentativePageTarget[] = [...this.buildModelTargets(doc)];

    if (this.collectionsForPage.length > 0) {
      next.push({
        kind: 'collections-group',
        key: COLLECTIONS_GROUP_KEY,
        labelKey: 'representative-page-group-collection',
      });
      for (const col of this.collectionsForPage) {
        next.push({
          kind: 'collection',
          key: `collection:${col.uuid}`,
          label: col.name,
          pid: col.uuid,
        });
      }
    }

    this.targets.set(next);
  }

  private buildModelTargets(doc: Metadata): RepresentativePageTarget[] {
    const ancestorPidByModel = this.buildAncestorPidMap();
    const hierarchy = this.recordHandler.getShareableDocumentTypes(doc) ?? [];
    const out: RepresentativePageTarget[] = [];

    for (const entry of hierarchy) {
      if (!entry || entry.model === DocumentTypeEnum.page) {
        continue;
      }
      const pid = entry.pid || ancestorPidByModel.get(entry.model) || '';
      if (!pid) {
        continue;
      }
      out.push({
        kind: 'model',
        key: `model:${entry.model}`,
        labelKey: entry.model,
        pid,
      });
    }
    return out;
  }

  /**
   * Fill in ancestor PIDs that `getShareableDocumentTypes` leaves empty (e.g.
   * periodicalitem when a page's direct parent is the volume) using Solr's
   * `pid_paths` + `own_model_path` on the raw page doc.
   */
  private buildAncestorPidMap(): Map<string, string> {
    const map = new Map<string, string>();
    const raw = this.rawPageDoc;
    if (!raw) {
      return map;
    }
    const pidPathRaw = raw['pid_paths'];
    const pidPath = (Array.isArray(pidPathRaw) ? pidPathRaw[0] : pidPathRaw) as string | undefined;
    const modelPath = raw['own_model_path'] as string | undefined;
    if (!pidPath || !modelPath) {
      return map;
    }
    const pids = pidPath.split('/').filter(Boolean);
    const models = modelPath.split('/').filter(Boolean);
    const len = Math.min(pids.length, models.length);
    for (let i = 0; i < len; i++) {
      if (!map.has(models[i])) {
        map.set(models[i], pids[i]);
      }
    }
    return map;
  }

  private resolvePagePid(): string {
    const doc = this.pageDocument;
    return doc?.model === DocumentTypeEnum.page ? (doc.uuid ?? '') : '';
  }

  private resolveLabel(target: RepresentativePageTarget | undefined): string {
    if (!target) {
      return '';
    }
    return target.kind === 'collection' ? target.label : target.labelKey;
  }
}
