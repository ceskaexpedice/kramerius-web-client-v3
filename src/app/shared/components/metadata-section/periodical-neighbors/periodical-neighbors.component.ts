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
      <nav class="periodical-neighbors" [attr.aria-label]="'neighbor-issues' | translate">
        <ul class="periodical-neighbors__list">
          <li>
            @if (neighbors().previous; as prev) {
              <ng-container *ngTemplateOutlet="row; context: { $implicit: prev, dir: 'previous' }"></ng-container>
            } @else {
              <ng-container *ngTemplateOutlet="missing; context: { dir: 'previous' }"></ng-container>
            }
          </li>
          <li>
            @if (neighbors().next; as next) {
              <ng-container *ngTemplateOutlet="row; context: { $implicit: next, dir: 'next' }"></ng-container>
            } @else {
              <ng-container *ngTemplateOutlet="missing; context: { dir: 'next' }"></ng-container>
            }
          </li>
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

    <!-- First or last issue: the missing side keeps the pair's shape as a quiet
         placeholder that says why there is nothing there (plain text, no arrow). -->
    <ng-template #missing let-dir="dir">
      <span class="periodical-neighbors__missing" [class.periodical-neighbors__missing--next]="dir === 'next'">
        {{ (dir === 'previous' ? 'neighbor-issues--first' : 'neighbor-issues--last') | translate }}
      </span>
    </ng-template>
  `,
  styleUrl: './periodical-neighbors.component.scss',
})
export class PeriodicalNeighborsComponent {
  protected service = inject(PeriodicalNeighborsService);
  private libraryContext = inject(LibraryContextService);

  protected readonly neighbors = this.service.neighbors;

  protected link(issue: PeriodicalNeighbor): any[] {
    return this.libraryContext.prependLibraryPrefix(['/' + APP_ROUTES_ENUM.DETAIL_VIEW, issue.pid]);
  }
}
