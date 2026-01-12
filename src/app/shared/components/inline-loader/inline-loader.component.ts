import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-inline-loader',
  standalone: true,
  imports: [
    NgIf,
    TranslatePipe
  ],
  templateUrl: './inline-loader.component.html',
  styleUrl: './inline-loader.component.scss'
})
export class InlineLoaderComponent {
  @Input() message?: string;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() minHeight = '200px';
  @Input() overlay = false;
}