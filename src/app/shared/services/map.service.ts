import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from '../../core/config/config.service';

@Injectable({ providedIn: 'root' })
export class MapService {
  private httpClient = inject(HttpClient);
  private configService = inject(ConfigService);

  private _mapReady = false;
  private _readyCallbacks: (() => void)[] = [];

  get mapReady(): boolean {
    return this._mapReady;
  }

  get apiKey(): string {
    return this.configService.integrations?.googleMaps?.apiKey || '';
  }

  init(callback: () => void): void {
    if (this._mapReady) {
      callback();
      return;
    }

    this._readyCallbacks.push(callback);

    if (this._readyCallbacks.length > 1) {
      // Already loading, just queued the callback
      return;
    }

    const key = this.apiKey;
    const lang = document.documentElement.lang || 'cs';
    const url = `https://maps.googleapis.com/maps/api/js?key=${key}&language=${lang}`;

    this.httpClient.jsonp(url, 'callback').subscribe({
      next: () => {
        this._mapReady = true;
        this._readyCallbacks.forEach(cb => cb());
        this._readyCallbacks = [];
      },
      error: (err) => {
        console.error('Failed to load Google Maps API:', err);
        this._readyCallbacks = [];
      }
    });
  }
}
