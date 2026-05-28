import { Component, computed, inject, Input, OnDestroy, signal } from '@angular/core';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
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
import {CdkTooltipDirective} from '../../../../shared/directives';
import { map } from 'rxjs';
import { PopupPositioningService, PopupState } from '../../../../shared/services/popup-positioning.service';
import { PeriodicalDayIssuesPopupComponent } from '../periodical-day-issues-popup/periodical-day-issues-popup.component';

/** A set of issues that share the same date and are displayed as a single card. */
interface IssueGroup {
  representative: PeriodicalItemChild;
  issues: PeriodicalItemChild[];
  isPublic: boolean;
}

interface GroupsData {
  groups: IssueGroup[];
  representatives: PeriodicalItemChild[];
}

@Component({
  selector: 'app-periodical-year-issues-grid',
  imports: [
    NgForOf,
    NgIf,
    AsyncPipe,
    RecordItemComponent,
    SkeletonListPipe,
    CdkTooltipDirective,
    TranslatePipe,
    PeriodicalDayIssuesPopupComponent,
  ],
  templateUrl: './periodical-year-issues-grid.component.html',
  styleUrl: './periodical-year-issues-grid.component.scss'
})
export class PeriodicalYearIssuesGridComponent implements OnDestroy {
  private store = inject(Store);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private recordHandlerService = inject(RecordHandlerService);
  private popupPositioningService = inject(PopupPositioningService);

  @Input() year!: string;
  @Input() pid!: string;

  children$ = this.store.select(selectPeriodicalChildren);
  loading$ = this.store.select(selectPeriodicalLoading);

  // Children collapsed into one card per date; days with several issues become a single group.
  groupsData$ = this.children$.pipe(map(children => this.buildGroups(children ?? [])));

  // Popup state for multi-issue cards (managed by PopupPositioningService)
  popupIssues = signal<PeriodicalItemChild[]>([]);
  popupRecordItems = computed<RecordItem[]>(() => this.popupIssues().map(issue => this.toRecordItem(issue)));
  issuesPopupState: PopupState = this.popupPositioningService.createPopupState();

  private buildGroups(children: PeriodicalItemChild[]): GroupsData {
    const map = new Map<string, PeriodicalItemChild[]>();
    const order: string[] = [];

    for (const child of children) {
      // Children without a date are never merged: each gets a unique key.
      const key = child['date.str'] || `__pid__${child.pid}`;
      if (!map.has(key)) {
        map.set(key, []);
        order.push(key);
      }
      map.get(key)!.push(child);
    }

    const groups = order.map<IssueGroup>(key => {
      const issues = map.get(key)!;
      const isPublic = !issues.some(
        issue => !this.recordHandlerService.isRecordPublic(issue['licenses.facet'] || issue.licenses || [])
      );
      return { representative: issues[0], issues, isPublic };
    });

    return { groups, representatives: groups.map(g => g.representative) };
  }

  getIssueTypeCode(item: PeriodicalItemChild | undefined): string | null {
    return normalizeIssueTypeCode(item?.['issue.type.code']) ?? null;
  }

  trackByGroup(index: number, group: IssueGroup | undefined): string {
    return group?.representative?.pid || `skeleton-${index}`;
  }

  /** Dots rendered for a multi-issue group: two or three, capped regardless of count. */
  groupDots(group: IssueGroup): number[] {
    return group.issues.length >= 3 ? [0, 1, 2] : [0, 1];
  }

  /** Opens the day-issues popup so the user can pick which issue to open. */
  openGroupPopup(group: IssueGroup, event: Event): void {
    this.popupIssues.set(group.issues);
    this.popupPositioningService.showPopup(
      this.issuesPopupState,
      {
        triggerEvent: event,
        preferredSide: 'right',
        offsetY: 4,
      },
      '.issues-popup-wrapper',
    );
  }

  closePopup(): void {
    this.issuesPopupState.closePopup();
    this.popupIssues.set([]);
  }

  getItemTitle(item: PeriodicalItemChild): string {
    // item['date_range_end.day'] + '.' + item['date_range_end.month']
    if (item['date_range_end.day'] && item['date_range_end.month']) {
      return `${item['date_range_end.day']}.${item['date_range_end.month']}`;
    }
    return item['date.str'];
  }

  // Convert PeriodicalItemChild to RecordItem (used for the day-issues popup cards).
  // Mirrors the calendar's title logic: prefer the issue-type label (e.g. morning/
  // evening edition) over the date, falling back to the date range then part number.
  toRecordItem(item: PeriodicalItemChild): RecordItem {
    const subtitlePrefix = this.translate.instant('periodicalvolume-part-subtitle');
    const issueTypeCode = this.getIssueTypeCode(item);
    let title = '';
    if (issueTypeCode) {
      title = this.translate.instant(`${issueTypeCode}-issue`);
    } else if (item['date_range_end.day'] && item['date_range_end.month']) {
      title = `${item['date_range_end.day']}.${item['date_range_end.month']}`;
    } else if (item['part.number.str']) {
      title = `${subtitlePrefix} ${item['part.number.str']}`;
    }
    return {
      id: item.pid,
      title,
      subtitle: item['date.str'] ?? '',
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

  ngOnDestroy(): void {
    this.popupPositioningService.cleanup();
  }

}
