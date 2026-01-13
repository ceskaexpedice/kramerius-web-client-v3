import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RecordItemComponent } from '../../../../shared/components/record-item/record-item.component';
import { CarouselComponent } from '../../../../shared/components/carousel/carousel.component';
import { SectionConfig } from '../../services/home-web-config.service';
import { SolrService } from '../../../../core/solr/solr.service';
import { searchDocumentToRecordItem, RecordItem } from '../../../../shared/components/record-item/record-item.model';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-dynamic-section',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    RecordItemComponent,
    CarouselComponent
  ],
  template: `
    <section *ngIf="(items$ | async) as items">
      <div class="section-header" *ngIf="items.length > 0">
        <h2>{{ config.title | translate }}</h2>
      </div>

      <div class="carousel-wrapper" *ngIf="items.length > 0">
        <div class="carousel-container">
          <app-carousel [edgeToEdge]="true" [actionsPosition]="'top'">
            <ng-container *ngFor="let item of items">
              <app-record-item [showModel]="false" [item]="item"></app-record-item>
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
export class DynamicSectionComponent implements OnInit {
  @Input() config!: SectionConfig;

  private solrService = inject(SolrService);

  items$: Observable<RecordItem[]> = of([]);

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
          if (item.id && docMap.has(item.id)) {
            const doc = docMap.get(item.id);
            const recordItem = searchDocumentToRecordItem(doc);
            return { ...recordItem, ...item } as RecordItem;
          }
          // Fallback: ensure model is present if not in item
          if (!item.model) {
            return { ...item, model: '' } as RecordItem;
          }
          return item as RecordItem;
        });
      }),
      catchError(err => {
        console.error('Error loading dynamic items', err);
        return of(itemsToProcess as RecordItem[]);
      })
    );
  }
}
