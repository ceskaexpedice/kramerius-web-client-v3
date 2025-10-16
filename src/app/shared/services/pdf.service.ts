import { Injectable } from '@angular/core';
import {EnvironmentService} from './environment.service';

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  _uuid: string | null = null;

  constructor(
    private env: EnvironmentService
  ) {
  }

  set uuid(uuid: string | null) {
    this._uuid = uuid;
  }

  get uuid(): string | null {
    return this._uuid;
  }

  private get API_URL(): string {
    const url = this.env.getApiUrl('items');
    if (!url) {
      console.warn('AuthService: API URL not available. Environment may not be loaded yet.');
      return '';
    }
    return url;
  }

  get url(): string | null {
    return this.uuid ? `${this.API_URL}/${this.uuid}/image` : null;
  }

}
