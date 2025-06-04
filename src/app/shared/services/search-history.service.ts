import {Injectable, signal, WritableSignal} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SearchHistoryService {
  private readonly STORAGE_KEY = 'search-history';
  private readonly MAX_ITEMS = 10;
  private readonly MAX_LENGTH = 100;
  private readonly MIN_LENGTH = 4;

  history: WritableSignal<string[]> = signal(this.load());

  private load(): string[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private save(items: string[]) {
    this.history.set(items);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
  }

  add(term: string) {
    if (!term || term.trim().length < this.MIN_LENGTH) {
      return;
    }
    const current = this.history().filter(t => t.toLowerCase() !== term.toLowerCase());
    const updated = [term.slice(0, this.MAX_LENGTH), ...current].slice(0, this.MAX_ITEMS);
    this.save(updated);
  }

  remove(term: string) {
    const updated = this.history().filter(t => t !== term);
    this.save(updated);
  }

  clear() {
    this.save([]);
  }

}
