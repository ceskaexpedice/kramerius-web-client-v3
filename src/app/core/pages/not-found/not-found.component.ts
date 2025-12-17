import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import {ENVIRONMENT} from '../../../app.config';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss'
})
export class NotFoundComponent {
  contactEmail = ENVIRONMENT.contactEmail;

  constructor(private router: Router) { }

  goHome() {
    this.router.navigate(['/']);
  }
}
