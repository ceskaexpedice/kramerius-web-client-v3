import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-ai-loading',
  standalone: true,
  templateUrl: './ai-loading.component.html',
  styleUrl: './ai-loading.component.scss'
})
export class AiLoadingComponent {
  @Input() text = '';
}
