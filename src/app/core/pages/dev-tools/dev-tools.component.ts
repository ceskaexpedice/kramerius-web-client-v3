import { Component, OnInit, signal, WritableSignal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EnvironmentService } from '../../../shared/services/environment.service';
import { InputComponent } from '../../../shared/components/input/input.component';
import { SelectComponent } from '../../../shared/components/select/select.component';

@Component({
  selector: 'app-dev-tools',
  standalone: true,
  imports: [CommonModule, FormsModule, InputComponent, SelectComponent],
  template: `
    <div class="dev-tools-container">
      <h1>Developer Tools</h1>
      <div class="card">
        <h2>API Configuration</h2>

        <div class="current-config form-group">
          <p><strong>Current Active Base URL:</strong></p>
          <app-input
            [initialValue]="currentBaseUrl"
            [theme]="'dark'"
            [readonly]="true"
            placeholder="https://api..."
            [withIcons]="false"
          ></app-input>
        </div>

        <div class="form-group">
          <label class="label">Quick Select:</label>
          <app-select
            [theme]="'light'"
            [options]="presets"
            [value]="selectedPreset()"
            [displayFn]="displayPreset"
            (valueChange)="onPresetChange($event)"
          ></app-select>
        </div>

        <div class="form-group">
          <label class="label">Override Base URL:</label>
          <app-input
            [theme]="'dark'"
            [signalInput]="customBaseUrl"
            placeholder="https://api..."
            [withIcons]="false"
          ></app-input>
          <p class="hint">Enter the full base URL (e.g., https://api.kramerius.mzk.cz) or select from above.</p>
        </div>

        <div class="actions">
          <button (click)="save()" class="button primary">Save & Reload</button>
          <button (click)="clear()" class="button tertiary outlined">Clear Override</button>
        </div>

        <div class="status-message" *ngIf="message" [class.error]="isError">
          {{ message }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dev-tools-container {
      padding: 2rem;
      max-width: 800px;
      margin: 0 auto;
      font-family: sans-serif;
    }
    .card {
      background: var(--color-bg-base);
      padding: 2rem;
      border-radius: var(--spacing-x2);
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .form-group {
      margin-bottom: 1.5rem;
    }
    app-select {
      width: 50%;
    }
    .label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: bold;
    }
    .hint {
      font-size: 0.85rem;
      color: var(--color-text-secondary);
      margin-top: 0.25rem;
    }
    .actions {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .status-message {
      padding: 0.5rem;
      border-radius: 4px;
      background-color: #d4edda;
      color: var(--color-success);
    }
    .status-message.error {
      background-color: #f8d7da;
      color: var(--color-error);
    }
  `]
})
export class DevToolsComponent implements OnInit {
  customBaseUrl: WritableSignal<string | number> = signal('');

  currentBaseUrl: string = '';
  message: string = '';
  isError: boolean = false;

  presets = [
    { label: 'api.kramerius.mzk.cz', url: 'https://api.kramerius.mzk.cz' },
    { label: 'api.ceskadigitalniknihovna.cz', url: 'https://api.ceskadigitalniknihovna.cz' },
    { label: 'kramerius.lib.cas.cz', url: 'https://kramerius.lib.cas.cz/' },
    { label: 'api-npo.val.ceskadigitalniknihovna.cz', url: 'https://api-npo.val.ceskadigitalniknihovna.cz' },
    { label: 'kramerius.difmoe.trinera.cloud', url: 'https://kramerius.difmoe.trinera.cloud' }
  ];

  selectedPreset = computed(() => {
    const current = this.customBaseUrl();
    return this.presets.find(p => p.url === current) || null;
  });

  private readonly STORAGE_KEY = 'CDK_DEV_BASE_URL';

  constructor(private environmentService: EnvironmentService) { }

  ngOnInit() {
    const stored = localStorage.getItem(this.STORAGE_KEY) || '';
    this.customBaseUrl.set(stored);
    this.currentBaseUrl = this.environmentService.getKrameriusUrl(false);
  }

  displayPreset = (preset: any) => preset ? preset.label : ' - Select Preset - ';

  onPresetChange(preset: any) {
    if (preset) {
      this.customBaseUrl.set(preset.url);
    }
  }

  save() {
    const val = String(this.customBaseUrl());
    if (!val) {
      this.isError = true;
      this.message = 'Please enter a URL';
      return;
    }

    try {
      // Basic validation
      new URL(val);

      localStorage.setItem(this.STORAGE_KEY, val);
      this.message = 'Base URL saved. Reloading...';
      this.isError = false;

      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (e) {
      this.isError = true;
      this.message = 'Invalid URL format';
    }
  }

  clear() {
    localStorage.removeItem(this.STORAGE_KEY);
    this.customBaseUrl.set('');
    this.message = 'Override cleared. Reloading...';
    this.isError = false;

    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
}
