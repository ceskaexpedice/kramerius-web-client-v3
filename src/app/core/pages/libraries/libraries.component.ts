import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { InputComponent } from '../../../shared/components/input/input.component';
import { ConfigService } from '../../config/config.service';

interface Library {
  id: number;
  alive: boolean | null;
  name: string;
  name_en: string | null;
  code: string;
  url: string;
  version: string;
  logo: string;
}

/**
 * Remove diacritics / accent marks for fuzzy matching.
 * Uses Unicode NFD decomposition + strip combining marks.
 */
function removeDiacritics(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

@Component({
  selector: 'app-libraries',
  standalone: true,
  imports: [CommonModule, FormsModule, InputComponent, TranslatePipe],
  template: `
    <div class="libraries-container">
      <h1>{{ 'libraries.title' | translate }}</h1>

      <div class="search-bar">
        <app-input
          [theme]="'light'"
          [signalInput]="searchQuery"
          [placeholder]="'libraries.filter-placeholder' | translate"
          [withIcons]="false"
        ></app-input>
      </div>

      @if (loading()) {
        <div class="loading">{{ 'libraries.loading' | translate }}</div>
      } @else if (error()) {
        <div class="error">{{ 'libraries.error' | translate }}</div>
      } @else {
        <div class="active-override" *ngIf="activeCode()">
          <span>{{ 'libraries.active' | translate }}: <strong>{{ activeCode() }}</strong></span>
          <button class="button tertiary outlined small" (click)="clearOverride()">{{ 'libraries.clear' | translate }}</button>
        </div>

        <div class="libraries-grid">
          @for (lib of filteredLibraries(); track lib.id) {
            <div
              class="library-card"
              [class.active]="lib.code === activeCode()"
              [class.inactive]="lib.alive === false"
              (click)="selectLibrary(lib)"
            >
              <img
                [src]="lib.logo"
                [alt]="lib.name"
                class="library-logo"
                (error)="onImageError($event)"
              />
              <div class="library-info">
                <span class="library-name">{{ lib.name }}</span>
                <span class="library-version">v{{ lib.version }}</span>
              </div>
            </div>
          }
        </div>
      }

      <div class="status-message" *ngIf="message()" [class.error]="isError()">
        {{ message() }}
      </div>
    </div>
  `,
  styles: [`
    .libraries-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .search-bar {
      margin-bottom: 1.5rem;
      max-width: 400px;
    }

    .active-override {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
      padding: 0.5rem 1rem;
      background: var(--color-bg-base);
      border-radius: var(--spacing-x2);
      font-size: 0.9rem;
    }

    .libraries-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
    }

    .library-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      padding: 1.25rem 1rem;
      background: var(--color-bg-base);
      border-radius: var(--spacing-x2);
      cursor: pointer;
      transition: box-shadow 0.15s, transform 0.15s;
      border: 2px solid transparent;
    }

    .library-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
      transform: translateY(-2px);
    }

    .library-card.active {
      border-color: var(--color-primary);
    }

    .library-card.inactive {
      opacity: 0.5;
    }

    .library-logo {
      width: 80px;
      height: 80px;
      object-fit: contain;
      border-radius: 8px;
    }

    .library-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 0.25rem;
    }

    .library-name {
      font-size: 0.85rem;
      font-weight: 600;
      line-height: 1.3;
    }

    .library-version {
      font-size: 0.75rem;
      color: var(--color-text-secondary);
    }

    .loading, .error {
      padding: 2rem;
      text-align: center;
    }

    .error {
      color: var(--color-error);
    }

    .status-message {
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      background-color: #d4edda;
      color: var(--color-success);
    }

    .status-message.error {
      background-color: #f8d7da;
      color: var(--color-error);
    }

    .small {
      font-size: 0.8rem;
      padding: 0.25rem 0.75rem;
    }
  `]
})
export class LibrariesComponent implements OnInit {

  private readonly STORAGE_KEY = 'CDK_DEV_BASE_URL';
  private readonly STORAGE_KEY_ID = 'CDK_DEV_KRAMERIUS_ID';

  libraries = signal<Library[]>([]);
  searchQuery = signal<string | number>('');
  loading = signal(true);
  error = signal('');
  message = signal('');
  isError = signal(false);

  activeCode = signal<string>('');

  private translate = inject(TranslateService);

  filteredLibraries = computed(() => {
    const rawQuery = String(this.searchQuery()).toLowerCase().trim();
    const libs = this.libraries();
    if (!rawQuery) return libs;
    const query = removeDiacritics(rawQuery);
    return libs.filter(lib =>
      removeDiacritics(lib.name.toLowerCase()).includes(query) ||
      (lib.name_en && removeDiacritics(lib.name_en.toLowerCase()).includes(query)) ||
      lib.code.toLowerCase().includes(query)
    );
  });

  ngOnInit() {
    this.activeCode.set(localStorage.getItem(this.STORAGE_KEY_ID) || '');
    this.loadLibraries();
  }

  private async loadLibraries() {
    try {
      const response = await fetch(ConfigService.getLibrariesUrl());
      if (!response.ok) throw new Error('Failed to load libraries');
      const data: Library[] = await response.json();
      this.libraries.set(data.filter(lib => {
        const major = parseInt(lib.version?.split('.')[0] ?? '0', 10);
        return major >= 7;
      }));
    } catch (err) {
      this.error.set('Failed to load libraries. Please try again later.');
    } finally {
      this.loading.set(false);
    }
  }

  selectLibrary(lib: Library) {
    try {
      localStorage.setItem(this.STORAGE_KEY, lib.url);
      localStorage.setItem(this.STORAGE_KEY_ID, lib.code);
      this.message.set(this.translate.instant('libraries.switching', { name: lib.name }));
      this.isError.set(false);
      setTimeout(() => window.location.reload(), 1000);
    } catch (e) {
      this.message.set(this.translate.instant('libraries.save-error'));
      this.isError.set(true);
    }
  }

  clearOverride() {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.STORAGE_KEY_ID);
    this.message.set(this.translate.instant('libraries.cleared'));
    this.isError.set(false);
    setTimeout(() => window.location.reload(), 1000);
  }

  onImageError(event: Event) {
    (event.target as HTMLImageElement).style.display = 'none';
  }
}
