import { inject, Injectable } from '@angular/core';
import { ConfigService } from '../../core/config/config.service';

@Injectable({ providedIn: 'root' })
export class MapService {
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
      return;
    }

    const key = this.apiKey;
    const lang = document.documentElement.lang || 'cs';
    const callbackName = '__googleMapsCallback';

    (window as any)[callbackName] = () => {
      delete (window as any)[callbackName];
      this._mapReady = true;
      this._readyCallbacks.forEach(cb => cb());
      this._readyCallbacks = [];
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&language=${lang}&loading=async&callback=${callbackName}`;
    script.async = true;
    script.onerror = () => {
      delete (window as any)[callbackName];
      console.error('Failed to load Google Maps API');
      this._readyCallbacks = [];
    };
    document.head.appendChild(script);
  }
}
