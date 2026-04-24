import { Injectable, computed, inject } from '@angular/core';
import { SelectionService } from './selection.service';

@Injectable({
  providedIn: 'root'
})
export class AdminModeService {
  private selectionService = inject(SelectionService);

  readonly adminMode = computed(() => this.selectionService.selectionMode());

  toggleAdminMode(): void {
    this.selectionService.toggleSelectionMode();
  }

  setAdminMode(enabled: boolean): void {
    this.selectionService.setSelectionMode(enabled);
  }
}
