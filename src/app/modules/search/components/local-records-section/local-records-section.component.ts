import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RecordItemComponent } from '../../../../shared/components/record-item/record-item.component';
import { CarouselComponent } from '../../../../shared/components/carousel/carousel.component';
import { HomepageSectionConfig, LocalizedLabel } from '../../../../core/config/config.interfaces';
import { LocalizedPipe } from '../../../../shared/pipes/localized.pipe';
import { SolrService } from '../../../../core/solr/solr.service';
import { searchDocumentToRecordItem, RecordItem } from '../../../../shared/components/record-item/record-item.model';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { parseSearchDocument } from '../../../models/search-document';
import { AppTranslationService } from '../../../../shared/translation/app-translation.service';

@Component({
  selector: 'app-local-records-section',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    RecordItemComponent,
    CarouselComponent,
    LocalizedPipe
  ],
  template: `
    <section *ngIf="(items$ | async) as items">
      <div class="section-header" *ngIf="items.length > 0">
        <h2>{{ config.title | localized }}</h2>
        <button class="show-all with-icon" *ngIf="config.sectionUrl" (click)="onShowMore()">
          <span class="text">{{ (config.buttonText | localized) || ('btn_show_more' | translate) }}</span>
          <i class="icon-arrow-right-3"></i>
        </button>
      </div>

      <div class="carousel-wrapper" *ngIf="items.length > 0">
        <div class="carousel-container">
          <app-carousel [edgeToEdge]="true" [actionsPosition]="'top'">
            <ng-container *ngFor="let item of items">
              <app-record-item [showModel]="false" [item]="item" [variant]="config.cardVariant || 'default'" layout="vertical"></app-record-item>
            </ng-container>
          </app-carousel>
        </div>
      </div>
    </section>
  `,
  styles: [`
    @use 'sass:math';
    @import '../search-section.scss';
  `]
})
export class LocalRecordsSectionComponent implements OnInit {
  @Input() config!: HomepageSectionConfig;

  private solrService = inject(SolrService);
  private translationService = inject(AppTranslationService);

  items$: Observable<RecordItem[]> = of([]);

  private resolveTitle(title: string | LocalizedLabel | undefined): string {
    if (!title) return '';
    if (typeof title === 'string') return title;
    const lang = this.translationService.currentLanguage().code;
    return title[lang] ?? title['en'] ?? title['cs'] ?? Object.values(title)[0] ?? '';
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

    this.items$ = this.solrService.getDocumentsByPids(pids).pipe(
      map((docs: any[]) => {
        const docMap = new Map(docs.map((d: any) => [d.pid, d]));
        return itemsToProcess.map(item => {
          const configTitle = this.resolveTitle((item as any).title);
          let recordItem: RecordItem;
          if (item.id && docMap.has(item.id)) {
            const doc = docMap.get(item.id);
            const fetchedItem = searchDocumentToRecordItem(parseSearchDocument(doc));
            // Spread item config (imageUrl, externalUrl, date, etc.); prefer config title over API title
            recordItem = { ...fetchedItem, ...item, title: configTitle || fetchedItem.title } as RecordItem;
          } else {
            recordItem = { ...item, title: configTitle } as RecordItem;
            if (!recordItem.model) {
              recordItem.model = '';
            }
          }

          const currentLicenses = recordItem.licenses || [];
          if (!currentLicenses.includes('public')) {
            recordItem.licenses = ['public', ...currentLicenses];
          }

          return recordItem;
        });
      }),
      catchError(err => {
        console.error('Error loading local records items', err);
        return of(itemsToProcess as RecordItem[]);
      })
    );
  }

  onShowMore() {
    if (this.config.sectionUrl) {
      window.location.href = this.config.sectionUrl;
    }
  }
}
