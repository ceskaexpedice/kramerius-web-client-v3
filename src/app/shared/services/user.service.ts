import { Injectable, signal } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {EnvironmentService} from './environment.service';
import {Observable} from 'rxjs';
import {UserSession} from '../models/user-session.model';
import {map} from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private _licenses = signal<string[]>([]);


  constructor(
    private http: HttpClient,
    private env: EnvironmentService
  ) {}

  private get API_URL(): string {
    const url = this.env.getApiUrl('user');
    if (!url) {
      console.warn('UserService: API URL not available. Environment may not be loaded yet.');
      return '';
    }
    return url;
  }


  get licenses() { return this._licenses(); }

  public async loadLicenses(): Promise<void> {
    const session = await firstValueFrom(this.getUserSession());
    this._licenses.set(session.licenses);
  }

  public getUserSession(): Observable<UserSession> {
    return this.http.get<UserSession>(`${this.API_URL}?sessionAttributes=true`).pipe(
      map(res => res)
    );
  }

  public clearUserData(): void {
    this._licenses.set([]);
  }
}
