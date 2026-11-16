import { Component, Input, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { RecordItemComponent } from '../../../../shared/components/record-item/record-item.component';
import { CarouselComponent } from '../../../../shared/components/carousel/carousel.component';
import { HomepageSectionConfig, LocalizedLabel } from '../../../../core/config/config.interfaces';
import { LocalizedPipe } from '../../../../shared/pipes/localized.pipe';
import { SolrService } from '../../../../core/solr/solr.service';
import { searchDocumentToRecordItem, RecordItem } from '../../../../shared/components/record-item/record-item.model';
import { Observable, of } from 'rxjs';
import { map, catchError, startWith } from 'rxjs/operators';
import { parseSearchDocument } from '../../../models/search-document';
import { AppTranslationService } from '../../../../shared/translation/app-translation.service';
import { ConfigService } from '../../../../core/config/config.service';

@Component({
  selector: 'app-featured-documents-section',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    RecordItemComponent,
    CarouselComponent,
    LocalizedPipe
  ],
  template: `
    @let items = items$ | async;
    <!--
      While the documents load (items === null) the section is drawn as its real
      header plus skeleton cards, so it already takes its final height. Rendering
      nothing until Solr answered collapsed every featured section to 0 px and
      then pushed everything below it down when the data arrived (CLS ~0.3 on
      the homepage).
    -->
    @if (items === null || items.length > 0) {
    <section>
      <div class="section-header">
        <h2>{{ config.title | localized }}</h2>
        <button class="show-all with-icon" *ngIf="config.sectionUrl" (click)="onShowMore()">
          <span class="text">{{ (config.buttonText | localized) || ('btn_show_more' | translate) }}</span>
          <i class="icon-arrow-right-3"></i>
        </button>
      </div>

      <div class="carousel-wrapper">
        <div class="carousel-container">
          <app-carousel [edgeToEdge]="true" [actionsPosition]="'top'">
            @if (items === null) {
              @for (_ of skeletonItems; track $index) {
                <app-record-item [showModel]="false" [item]="null" [loading]="true" [variant]="config.cardVariant || 'default'" layout="vertical"></app-record-item>
              }
            } @else {
              @for (item of items; track $index) {
                <app-record-item [showModel]="false" [item]="item" [variant]="config.cardVariant || 'default'" layout="vertical"></app-record-item>
              }
            }
          </app-carousel>
        </div>
      </div>
    </section>
    }
  `,
  styles: [`
    @use 'sass:math';
    @use '../search-section';
  `]
})
export class FeaturedDocumentsSectionComponent implements OnInit {
  @Input() config!: HomepageSectionConfig;

  private solrService = inject(SolrService);
  private translationService = inject(AppTranslationService);
  private configService = inject(ConfigService);
  private router = inject(Router);

  items$: Observable<RecordItem[] | null> = of([]);

  /** Placeholder cards shown while the documents load (see template). */
  skeletonItems: unknown[] = [];

  private resolveTitle(title: string | LocalizedLabel | undefined): string {
    const lang = this.translationService.currentLanguage().code;
    return this.configService.resolveLabel(title, lang);
  }

  ngOnInit() {
    let itemsToProcess: Partial<RecordItem>[] = [];
    if (this.config.items) {
      itemsToProcess = this.config.items;
    } else if (this.config.pids) {
      itemsToProcess = this.config.pids.map(pid => ({ id: pid }));
    }

    if (itemsToProcess.length === 0) {
      this.items$ = of([]);
      return;
    }

    const pids = itemsToProcess.filter(i => !!i.id).map(i => i.id as string);

    if (pids.length === 0) {
      this.items$ = of(itemsToProcess as RecordItem[]);
      return;
    }

    // As many skeleton cards as fit the carousel (it never shows more than ~10).
    this.skeletonItems = Array(Math.min(itemsToProcess.length, 10));
    this.items$ = this.solrService.getDocumentsByPids(pids).pipe(
      map((docs: any[]) => {
        const docMap = new Map(docs.map((d: any) => [d.pid, d]));
        return itemsToProcess.map(item => {
          const configTitle = this.resolveTitle((item as any).title);
          let recordItem: RecordItem;
          if (item.id && docMap.has(item.id)) {
            const doc = docMap.get(item.id);
            const fetchedItem = searchDocumentToRecordItem(parseSearchDocument(doc));
            // Spread item config (imageUrl, externalUrl, date, etc.); prefer config title over API title.
            // Licenses stay whatever the API returned unless the config explicitly overrides them,
            // so restricted documents render locked instead of looking public.
            recordItem = {
              ...fetchedItem,
              ...item,
              title: configTitle || fetchedItem.title,
              licenses: item.licenses ?? fetchedItem.licenses ?? [],
            } as RecordItem;
          } else {
            // Config-only entry: nothing to derive access from, so treat it as public.
            recordItem = { ...item, title: configTitle } as RecordItem;
            if (!recordItem.model) {
              recordItem.model = '';
            }
            const currentLicenses = recordItem.licenses || [];
            if (!currentLicenses.includes('public')) {
              recordItem.licenses = ['public', ...currentLicenses];
            }
          }

          return recordItem;
        });
      }),
      catchError(err => {
        console.error('Error loading featured documents items', err);
        return of(itemsToProcess as RecordItem[]);
      }),
      // null = still loading → the template draws skeleton cards.
      startWith(null),
    );
  }

  onShowMore() {
    if (this.config.sectionUrl) {
      // In-app URLs through the router: a full reload stopped the playing audio.
      const url = this.config.sectionUrl;
      if (url.startsWith('/') && !url.startsWith('//')) {
        this.router.navigateByUrl(url);
      } else {
        window.location.href = url;
      }
    }
  }
}
