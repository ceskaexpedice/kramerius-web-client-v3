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

  API_URL = '';

  constructor(
    private http: HttpClient,
    private env: EnvironmentService
  ) {
    this.API_URL = this.env.getApiUrl('user');
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
}
