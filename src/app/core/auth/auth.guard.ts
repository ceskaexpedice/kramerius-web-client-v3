import {inject, Injectable} from '@angular/core';
import {CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router} from '@angular/router';
import {Observable, map, take} from 'rxjs';
import {AuthService} from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    
    return this.authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        if (isAuthenticated && !this.authService.isTokenExpired()) {
          return true;
        } else {
          this.authService.login(state.url);
          return false;
        }
      })
    );
  }
}