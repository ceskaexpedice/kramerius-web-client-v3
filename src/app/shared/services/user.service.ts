import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EnvironmentService } from './environment.service';
import { Observable } from 'rxjs';
import { UserSession } from '../models/user-session.model';
import { map } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { clearSimpleCache } from '../../core/cache/simple-cache.interceptor-fn';

// Admin roles that grant access to admin features
const ADMIN_ROLES = ['kramerius_admin', 'k4_admins'];

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private _licenses = signal<string[]>([]);
  private _roles = signal<string[]>([]);
  private _userSession = signal<UserSession | null>(null);

  // Computed signal for admin status
  private _isAdmin = computed(() => {
    const roles = this._roles();
    return roles.some(role => ADMIN_ROLES.includes(role));
  });

  constructor(
    private http: HttpClient,
    private env: EnvironmentService
  ) { }

  private get API_URL(): string {
    const url = this.env.getApiUrl('user');
    if (!url) {
      console.warn('UserService: API URL not available. Environment may not be loaded yet.');
      return '';
    }
    return url;
  }

  // Licenses getters
  get licenses() { return this._licenses(); }
  get licenses$() { return this._licenses.asReadonly(); }

  // Roles getters
  get roles() { return this._roles(); }
  get roles$() { return this._roles.asReadonly(); }

  // User session getter
  get userSession() { return this._userSession(); }
  get userSession$() { return this._userSession.asReadonly(); }

  // Admin status getters
  get isAdmin() { return this._isAdmin(); }
  get isAdmin$() { return this._isAdmin; }

  // Logged in status getter
  get isLoggedIn() { return !!this._userSession(); }
  get isLoggedIn$() { return computed(() => !!this._userSession()); }

  /**
   * Load user licenses from session
   * @deprecated Use loadUserData() instead
   */
  public async loadLicenses(): Promise<void> {
    await this.loadUserData();
  }

  /**
   * Load user data including licenses, roles, and session information
   * Clears the HTTP cache if licenses change to ensure fresh data is displayed
   */
  public async loadUserData(): Promise<void> {
    const previousLicenses = this._licenses();
    const session = await firstValueFrom(this.getUserSession());
    const newLicenses = session.licenses || [];

    this._userSession.set(session);
    this._licenses.set(newLicenses);
    this._roles.set(session.roles || []);

    // Clear cache if licenses changed (user logged in/out or got new licenses)
    if (!this.arraysEqual(previousLicenses, newLicenses)) {
      clearSimpleCache();
      console.log('[UserService] Licenses changed, cache cleared');
    }
  }

  /**
   * Helper to compare two string arrays
   */
  private arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
  }

  /**
   * Get user session from API
   */
  public getUserSession(): Observable<UserSession> {
    return this.http.get<UserSession>(`${this.API_URL}?sessionAttributes=true`).pipe(
      map(res => res)
    );
  }

  /**
   * Check if user has admin privileges
   * @returns true if user has kramerius_admin or k4_admins role
   */
  public hasAdminRole(): boolean {
    return this.isAdmin;
  }

  /**
   * Check if user has a specific role
   * @param role Role name to check
   */
  public hasRole(role: string): boolean {
    return this._roles().includes(role);
  }

  /**
   * Check if user has any of the specified roles
   * @param roles Array of role names to check
   */
  public hasAnyRole(roles: string[]): boolean {
    const userRoles = this._roles();
    return roles.some(role => userRoles.includes(role));
  }

  /**
   * Check if user has a specific license
   * @param license License name to check
   */
  public hasLicense(license: string): boolean {
    return this._licenses().includes(license);
  }

  /**
   * Check if user has any of the specified licenses
   * Use this to verify if user can access content that requires specific licenses
   * @param requiredLicenses Array of license names that grant access to the content
   * @returns true if user has at least one matching license, false otherwise
   */
  public hasAnyLicense(requiredLicenses: string[]): boolean {
    if (!requiredLicenses || requiredLicenses.length === 0) {
      return false;
    }

    const userLicenses = this._licenses();
    if (!userLicenses || userLicenses.length === 0) {
      return false;
    }

    return requiredLicenses.some(license => userLicenses.includes(license));
  }

  /**
   * Clear all user data (licenses, roles, session)
   * Also clears the HTTP cache to ensure fresh data is displayed
   */
  public clearUserData(): void {
    this._licenses.set([]);
    this._roles.set([]);
    this._userSession.set(null);
    clearSimpleCache();
    console.log('[UserService] User data cleared, cache cleared');
  }

  public getFormattedExpiration(): string {
    const expirationTime = this.userSession?.session?.expiration_time;
    if (!expirationTime) return '';

    const seconds = typeof expirationTime === 'string' ? Number(expirationTime) : expirationTime;
    if (!Number.isFinite(seconds)) return '';

    const d = new Date(seconds * 1000);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }
}
