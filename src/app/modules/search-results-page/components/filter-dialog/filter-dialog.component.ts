import {Component, computed, effect, inject, Inject, OnInit, signal} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {FacetItem} from '../../../models/facet-item';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {AsyncPipe, NgForOf, NgIf} from '@angular/common';
import {AutocompleteComponent} from '../../../../shared/components/autocomplete/autocomplete.component';
import {MatCheckbox} from '@angular/material/checkbox';
import {MatButton} from '@angular/material/button';
import {debounceTime, distinctUntilChanged, of} from 'rxjs';
import {switchMap, map} from 'rxjs/operators';
import {ActivatedRoute, Router} from '@angular/router';
import { SolrService } from '../../../../core/solr/solr.service';
import { SolrResponseParser } from '../../../../core/solr/solr-response-parser';

@Component({
  selector: 'app-filter-dialog',
  imports: [
    FormsModule,
    NgForOf,
    MatCheckbox,
    MatButton,
    ReactiveFormsModule,
    NgIf,
  ],
  standalone: true,
  templateUrl: './filter-dialog.component.html',
  styleUrl: './filter-dialog.component.scss'
})
export class FilterDialogComponent implements OnInit {
  public data = inject(MAT_DIALOG_DATA) as {
    facetKey: string;
    facetLabel: string;
  };

  private dialogRef = inject(MatDialogRef<FilterDialogComponent>);
  private solr = inject(SolrService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly searchControl = new FormControl('');
  readonly selected = signal<Set<string>>(new Set());
  readonly items = signal<FacetItem[]>([]);
  readonly loading = signal(false);

  ngOnInit() {
    this.initSelectedFromUrl();
    this.loadInitialFacets();

    effect(() => {
      const sub = this.searchControl.valueChanges
        .pipe(
          debounceTime(300),
          distinctUntilChanged(),
          switchMap(term => {
            if (!term || term.length < 2) {
              this.loadInitialFacets();
              return of(null);
            }

            this.loading.set(true);
            return this.solr.loadFacet(
              this.route.snapshot.queryParams['q'] || '*:*',
              this.getCurrentFilters(),
              this.data.facetKey,
              term,
              true
            ).pipe(
              map((response: any) => {
                const facets = SolrResponseParser.parseFacet(response.facet_counts.facet_fields?.[this.data.facetKey] || []);
                this.items.set(facets);
                this.loading.set(false);
                return facets;
              })
            );
          })
        )
        .subscribe();

      return () => sub.unsubscribe();
    });
  }

  private loadInitialFacets() {
    this.loading.set(true);
    this.solr.loadFacet(
      this.route.snapshot.queryParams['q'] || '*:*',
      this.getCurrentFilters(),
      this.data.facetKey
    ).subscribe(response => {
      const facets = SolrResponseParser.parseFacet(response.facet_counts.facet_fields?.[this.data.facetKey] || []);
      this.items.set(facets);
      this.loading.set(false);
    });
  }

  private initSelectedFromUrl() {
    const fq = this.route.snapshot.queryParams['fq'];
    const active = Array.isArray(fq) ? fq : fq ? [fq] : [];

    const selected = new Set(
      active
        .filter(f => f.startsWith(this.data.facetKey + ':'))
        .map(f => f.split(':')[1])
    );

    this.selected.set(selected);
  }

  isSelected(value: string): boolean {
    return this.selected().has(value);
  }

  toggle(value: string) {
    const next = new Set(this.selected());
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    this.selected.set(next);
    this.updateUrl();
  }

  updateUrl() {
    const fq = this.route.snapshot.queryParams['fq'];
    const otherFilters = (Array.isArray(fq) ? fq : fq ? [fq] : []).filter(
      f => !f.startsWith(this.data.facetKey + ':')
    );

    const updated = [
      ...otherFilters,
      ...Array.from(this.selected()).map(v => `${this.data.facetKey}:${v}`)
    ];

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { fq: updated },
      queryParamsHandling: 'merge'
    });
  }

  close() {
    this.dialogRef.close();
  }

  private getCurrentFilters(): string[] {
    const fq = this.route.snapshot.queryParams['fq'];
    return Array.isArray(fq) ? fq : fq ? [fq] : [];
  }
}
