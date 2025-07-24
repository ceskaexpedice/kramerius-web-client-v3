import {Component, inject} from '@angular/core';
import {NgIf} from '@angular/common';
import {LoadingService} from '../../services/loading.service';

@Component({
  selector: 'app-loading-overlay',
  imports: [
    NgIf,
  ],
  templateUrl: './loading-overlay.component.html',
  styleUrl: './loading-overlay.component.scss'
})
export class LoadingOverlayComponent {

  private loadingService = inject(LoadingService);

  isLoading = this.loadingService.isLoading;

}
