import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {EnvironmentService} from './environment.service';
import {Observable} from 'rxjs';
import {UserSession} from '../models/user-session.model';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  API_URL = '';

  constructor(
    private http: HttpClient,
    private env: EnvironmentService
  ) {
    this.API_URL = this.env.getApiUrl('user');
  }

  public getUserSession(): Observable<UserSession> {
    return this.http.get<UserSession>(`${this.API_URL}?sessionAttributes=true`).pipe(
      map(res => res)
    );
  }
}
