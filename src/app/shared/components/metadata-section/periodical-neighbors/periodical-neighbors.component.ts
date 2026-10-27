import { Component, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { APP_ROUTES_ENUM } from '../../../../app.routes';
import { LibraryContextService } from '../../../services/library-context.service';
import { PeriodicalNeighbor, PeriodicalNeighborsService } from '../../../services/periodical-neighbors.service';

/**
 * Previous and next issue of a periodical with their date, number and issue
 * type (#200), so a calendar-year change or a skipped number is visible at a
 * glance. Nothing is inferred: the rows only show each neighbour's own data.
 */
@Component({
  selector: 'app-periodical-neighbors',
  imports: [NgTemplateOutlet, RouterLink, TranslatePipe],
  template: `
    @if (neighbors().previous || neighbors().next) {
      <nav class="periodical-neighbors" [attr.aria-labelledby]="headingId">
        <p class="periodical-neighbors__label" [id]="headingId">{{ 'neighbor-issues' | translate }}</p>
        <ul class="periodical-neighbors__list">
          @if (neighbors().previous; as prev) {
            <li>
              <ng-container *ngTemplateOutlet="row; context: { $implicit: prev, dir: 'previous' }"></ng-container>
            </li>
          }
          @if (neighbors().next; as next) {
            <li>
              <ng-container *ngTemplateOutlet="row; context: { $implicit: next, dir: 'next' }"></ng-container>
            </li>
          }
        </ul>
      </nav>
    }

    <ng-template #row let-issue let-dir="dir">
      <a class="periodical-neighbors__link" [class.periodical-neighbors__link--next]="dir === 'next'"
         [routerLink]="link(issue)"
         [attr.aria-label]="(dir + '-issue--tooltip' | translate) + ': ' + service.describe(issue)">
        <i [class]="dir === 'previous' ? 'icon-arrow-left-3' : 'icon-arrow-right-3'" aria-hidden="true"></i>
        <span class="periodical-neighbors__text">
          <span class="periodical-neighbors__date">{{ issue.date }}</span>
          @if (issue.number || issue.issueTypeCode) {
            <span>
              @if (issue.number) { {{ 'issue' | translate }} {{ issue.number }} }
              @if (issue.number && issue.issueTypeCode) { · }
              @if (issue.issueTypeCode) { {{ issue.issueTypeCode + '-issue' | translate }} }
            </span>
          }
          @if (issue.otherVolumeYear) {
            <span class="periodical-neighbors__volume">{{ 'volume' | translate }} {{ issue.otherVolumeYear }}</span>
          }
        </span>
      </a>
    </ng-template>
  `,
  styleUrl: './periodical-neighbors.component.scss',
})
export class PeriodicalNeighborsComponent {
  protected service = inject(PeriodicalNeighborsService);
  private libraryContext = inject(LibraryContextService);

  private static nextId = 0;
  protected readonly headingId = `periodical-neighbors-${PeriodicalNeighborsComponent.nextId++}`;
  protected readonly neighbors = this.service.neighbors;

  protected link(issue: PeriodicalNeighbor): any[] {
    return this.libraryContext.prependLibraryPrefix(['/' + APP_ROUTES_ENUM.DETAIL_VIEW, issue.pid]);
  }
}
