import { Component, inject, OnDestroy, effect } from '@angular/core';
import { RecordHandlerService } from '../../../../shared/services/record-handler.service';
import { UserService } from '../../../../shared/services/user.service';
import { DetailViewService } from '../../services/detail-view.service';
import { UiStateService } from '../../../../shared/services/ui-state.service';
import { AsyncPipe, NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-dnnto-bar',
  imports: [AsyncPipe, NgIf, TranslatePipe],
  templateUrl: './dnnto-bar.component.html',
  styleUrl: './dnnto-bar.component.scss'
})
export class DnntoBarComponent implements OnDestroy {
  public recordHandler = inject(RecordHandlerService);
  public userService = inject(UserService);
  public detailViewService = inject(DetailViewService);
  private uiState = inject(UiStateService);

  private visible = toSignal(
    this.detailViewService.document$.pipe(
      map(doc => !!doc && this.recordHandler.shouldShowDnntoBar(doc.licences) && !!this.userService.userSession?.authenticated)
    ),
    { initialValue: false }
  );

  constructor() {
    effect(() => {
      this.uiState.dnntoBarVisible.set(this.visible());
    });
  }

  ngOnDestroy() {
    this.uiState.dnntoBarVisible.set(false);
  }
}
