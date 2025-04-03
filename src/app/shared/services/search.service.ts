import { Injectable } from '@angular/core';
  import { APP_ROUTES_ENUM } from '../../app.routes';
  import { Router } from '@angular/router';

  @Injectable({
    providedIn: 'root'
  })
  export class SearchService {

    constructor(
      private router: Router
    ) { }

    search(query: string): void {
      this.router.navigate([`/${APP_ROUTES_ENUM.SEARCH_RESULTS}`], { queryParams: { query } });
    }

  }
