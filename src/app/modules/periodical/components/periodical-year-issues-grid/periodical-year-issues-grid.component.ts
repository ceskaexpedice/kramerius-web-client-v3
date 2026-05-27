import { Component, inject, Input } from '@angular/core';
// --- GROUPED/POPUP VIEW (disabled, kept for later) ---
// Additional Angular APIs needed only by the grouped + popup view.
// import { computed, OnDestroy, signal } from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
// --- GROUPED/POPUP VIEW (disabled, kept for later) ---
// TranslatePipe is used only by the grouped template (tooltip / popup labels).
// import {TranslatePipe} from '@ngx-translate/core';
import { selectPeriodicalChildren } from '../../state/periodical-detail/periodical-detail.selectors';
import { Store } from '@ngrx/store';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { RecordItemComponent } from '../../../../shared/components/record-item/record-item.component';
import { APP_ROUTES_ENUM } from '../../../../app.routes';
import { PeriodicalItemChild } from '../../../models/periodical-item';
import { Router } from '@angular/router';
import { RecordItem } from '../../../../shared/components/record-item/record-item.model';
import { RecordHandlerService } from '../../../../shared/services/record-handler.service';
import { DocumentTypeEnum } from "../../../constants/document-type";
import { selectPeriodicalLoading } from '../../state/periodical-detail/periodical-detail.selectors';
import { SkeletonListPipe } from '../../../../shared/pipes/skeleton-list.pipe';
import { normalizeIssueTypeCode } from '../../../../shared/utils/issue-type-code';
// --- GROUPED/POPUP VIEW (disabled, kept for later) ---
// Imports needed only by the grouped-by-date + selection-popup view.
// CdkTooltipDirective backs the issue-type tooltip in the grouped template.
// import {CdkTooltipDirective} from '../../../../shared/directives';
// import { map } from 'rxjs';
// import { PopupPositioningService, PopupState } from '../../../../shared/services/popup-positioning.service';
// import { PeriodicalDayIssuesPopupComponent } from '../periodical-day-issues-popup/periodical-day-issues-popup.component';

// --- GROUPED/POPUP VIEW (disabled, kept for later) ---
// /** A set of issues that share the same date and are displayed as a single card. */
// interface IssueGroup {
//   representative: PeriodicalItemChild;
//   issues: PeriodicalItemChild[];
//   isPublic: boolean;
// }
//
// interface GroupsData {
//   groups: IssueGroup[];
//   representatives: PeriodicalItemChild[];
// }

@Component({
  selector: 'app-periodical-year-issues-grid',
  imports: [
    NgForOf,
    NgIf,
    AsyncPipe,
    RecordItemComponent,
    SkeletonListPipe,
    // --- GROUPED/POPUP VIEW (disabled, kept for later) ---
    // CdkTooltipDirective,
    // TranslatePipe,
    // PeriodicalDayIssuesPopupComponent,
  ],
  templateUrl: './periodical-year-issues-grid.component.html',
  styleUrl: './periodical-year-issues-grid.component.scss'
})
export class PeriodicalYearIssuesGridComponent {
  private store = inject(Store);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private recordHandlerService = inject(RecordHandlerService);
  // --- GROUPED/POPUP VIEW (disabled, kept for later) ---
  // private popupPositioningService = inject(PopupPositioningService);

  @Input() year!: string;
  @Input() pid!: string;

  children$ = this.store.select(selectPeriodicalChildren);
  loading$ = this.store.select(selectPeriodicalLoading);

  getIssueTypeCode(item: PeriodicalItemChild | undefined): string | null {
    return normalizeIssueTypeCode(item?.['issue.type.code']) ?? null;
  }

  trackByPid(index: number, item: any): string {
    return item?.pid || item?.id || index.toString();
  }

  onDateSelected(item: PeriodicalItemChild) {
    if (item.pid) {
      this.router.navigate([APP_ROUTES_ENUM.DETAIL_VIEW, item.pid]);
    }
  }

  getItemTitle(item: PeriodicalItemChild): string {
    // Base title is the date (range end if present, otherwise the date string).
    let title: string;
    if (item['date_range_end.day'] && item['date_range_end.month']) {
      title = `${item['date_range_end.day']}.${item['date_range_end.month']}.`;
    } else {
      title = item['date.str'];
    }
    // When the issue carries a morning/evening (issue-type) attribute, append its
    // localized label so the title reads e.g. "12.5. - morning".
    const issueTypeCode = this.getIssueTypeCode(item);
    if (issueTypeCode) {
      title = `${title} | ${this.translate.instant(`${issueTypeCode}-issue`)}`;
    }
    return title;
  }

  // Convert PeriodicalItemChild to RecordItem
  toRecordItem(item: PeriodicalItemChild): RecordItem {
    const subtitlePrefix = this.translate.instant('periodicalvolume-part-subtitle');
    return {
      id: item.pid,
      title: this.getItemTitle(item),
      subtitle: `${subtitlePrefix} ${item['part.number.str']}`,
      model: item.model as DocumentTypeEnum,
      licenses: item['licenses.facet'] || [],
      className: 'card--fluid',
      showFavoriteButton: false,
      showAccessibilityBadge: true
    };
  }

  // Convert PeriodicalItemChild to RecordItem with badge layout consideration
  toRecordItemWithBadgeLayout(item: PeriodicalItemChild, allItems: PeriodicalItemChild[]): RecordItem {
    const subtitlePrefix = this.translate.instant('periodicalvolume-part-subtitle');
    return this.recordHandlerService.periodicalChildToRecordItemWithBadgeLayout(
      item,
      allItems,
      subtitlePrefix,
      (item) => this.getItemTitle(item)
    );
  }

  // ===========================================================================
  // GROUPED-BY-DATE + SELECTION-POPUP VIEW (disabled, kept for later)
  // ---------------------------------------------------------------------------
  // The block below collapses issues sharing the same date into a single card,
  // renders dots on multi-issue cards, and opens a popup so the user can pick
  // which issue to open. Currently we display every issue as its own card, so
  // this is commented out. To re-enable:
  //   1. Uncomment the related imports, the IssueGroup/GroupsData interfaces,
  //      the PeriodicalDayIssuesPopupComponent import entry, the
  //      popupPositioningService injection, and `implements OnDestroy` above.
  //   2. Uncomment the members/methods below.
  //   3. Switch the template + scss to their grouped variants (see the matching
  //      "GROUPED/POPUP VIEW" blocks there).
  // ===========================================================================
  //
  // // Children collapsed into one card per date; days with several issues become a single group.
  // groupsData$ = this.children$.pipe(map(children => this.buildGroups(children ?? [])));
  //
  // // Popup state for multi-issue cards (managed by PopupPositioningService)
  // popupIssues = signal<PeriodicalItemChild[]>([]);
  // popupRecordItems = computed<RecordItem[]>(() => this.popupIssues().map(issue => this.toRecordItemForPopup(issue)));
  // issuesPopupState: PopupState = this.popupPositioningService.createPopupState();
  //
  // private buildGroups(children: PeriodicalItemChild[]): GroupsData {
  //   const map = new Map<string, PeriodicalItemChild[]>();
  //   const order: string[] = [];
  //
  //   for (const child of children) {
  //     // Children without a date are never merged: each gets a unique key.
  //     const key = child['date.str'] || `__pid__${child.pid}`;
  //     if (!map.has(key)) {
  //       map.set(key, []);
  //       order.push(key);
  //     }
  //     map.get(key)!.push(child);
  //   }
  //
  //   const groups = order.map<IssueGroup>(key => {
  //     const issues = map.get(key)!;
  //     const isPublic = !issues.some(
  //       issue => !this.recordHandlerService.isRecordPublic(issue['licenses.facet'] || issue.licenses || [])
  //     );
  //     return { representative: issues[0], issues, isPublic };
  //   });
  //
  //   return { groups, representatives: groups.map(g => g.representative) };
  // }
  //
  // trackByGroup(index: number, group: IssueGroup | undefined): string {
  //   return group?.representative?.pid || `skeleton-${index}`;
  // }
  //
  // /** Dots rendered for a multi-issue group: two or three, capped regardless of count. */
  // groupDots(group: IssueGroup): number[] {
  //   return group.issues.length >= 3 ? [0, 1, 2] : [0, 1];
  // }
  //
  // /** Opens the day-issues popup so the user can pick which issue to open. */
  // openGroupPopup(group: IssueGroup, event: Event): void {
  //   this.popupIssues.set(group.issues);
  //   this.popupPositioningService.showPopup(
  //     this.issuesPopupState,
  //     {
  //       triggerEvent: event,
  //       preferredSide: 'right',
  //       offsetY: 4,
  //     },
  //     '.issues-popup-wrapper',
  //   );
  // }
  //
  // closePopup(): void {
  //   this.issuesPopupState.closePopup();
  //   this.popupIssues.set([]);
  // }
  //
  // // Convert PeriodicalItemChild to RecordItem (used for the day-issues popup cards).
  // // Mirrors the calendar's title logic: prefer the issue-type label (e.g. morning/
  // // evening edition) over the date, falling back to the date range then part number.
  // toRecordItemForPopup(item: PeriodicalItemChild): RecordItem {
  //   const subtitlePrefix = this.translate.instant('periodicalvolume-part-subtitle');
  //   const issueTypeCode = this.getIssueTypeCode(item);
  //   let title = '';
  //   if (issueTypeCode) {
  //     title = this.translate.instant(`${issueTypeCode}-issue`);
  //   } else if (item['date_range_end.day'] && item['date_range_end.month']) {
  //     title = `${item['date_range_end.day']}.${item['date_range_end.month']}`;
  //   } else if (item['part.number.str']) {
  //     title = `${subtitlePrefix} ${item['part.number.str']}`;
  //   }
  //   return {
  //     id: item.pid,
  //     title,
  //     subtitle: item['date.str'] ?? '',
  //     model: item.model as DocumentTypeEnum,
  //     licenses: item['licenses.facet'] || [],
  //     className: 'card--fluid',
  //     showFavoriteButton: false,
  //     showAccessibilityBadge: true
  //   };
  // }
  //
  // ngOnDestroy(): void {
  //   this.popupPositioningService.cleanup();
  // }

}
