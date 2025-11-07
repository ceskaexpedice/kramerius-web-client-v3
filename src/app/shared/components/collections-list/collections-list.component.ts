import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  AfterViewInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {Subject} from 'rxjs';
import { SearchDocument } from '../../../modules/models/search-document';
import {InputComponent} from '../input/input.component';
import {CollectionsService} from '../../services/collections.service';

@Component({
  selector: 'app-collections-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatButtonModule,
    ScrollingModule,
    FormsModule,
    TranslateModule,
    InputComponent,
  ],
  providers: [
    CollectionsService
  ],
  templateUrl: './collections-list.component.html',
  styleUrl: './collections-list.component.scss'
})
export class CollectionsListComponent {
  @Input() selectedCollections: string[] = [];
  @Output() selectionChange = new EventEmitter<string[]>();
  @Input() title: string = '';

  @ViewChild('scrollContainer', { static: false }) scrollContainer?: ElementRef;

  searchQuery: string = '';
  private searchQuery$ = new Subject<string>();

  public collectionsService = inject(CollectionsService);

  onSearchInput(value: string | number) {
    this.searchQuery = value.toString();
    this.searchQuery$.next(this.searchQuery);
  }

  clearSearch() {
    this.searchQuery = '';
    this.searchQuery$.next('');
  }

  onCollectionToggle(collectionPid: string, checked: boolean) {
    const currentSelection = [...this.selectedCollections];

    if (checked) {
      if (!currentSelection.includes(collectionPid)) {
        currentSelection.push(collectionPid);
      }
    } else {
      const index = currentSelection.indexOf(collectionPid);
      if (index > -1) {
        currentSelection.splice(index, 1);
      }
    }

    this.selectionChange.emit(currentSelection);
  }

  isCollectionSelected(collectionPid: string): boolean {
    return this.selectedCollections.includes(collectionPid);
  }

  selectAll(collections: SearchDocument[]) {
    const allPids = collections.map(c => c.pid);
    this.selectionChange.emit(allPids);
  }

  clearAll() {
    this.selectionChange.emit([]);
  }

  trackByPid(index: number, collection: SearchDocument): string {
    return collection.pid;
  }
}
