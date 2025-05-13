import {NgModule} from '@angular/core';
import {DetailViewPageComponent} from './detail-view-page.component';
import {RouterModule, Routes} from '@angular/router';
import {StoreModule} from '@ngrx/store';
import {EffectsModule} from '@ngrx/effects';
import {documentDetailReducer} from '../../shared/state/document-detail/document-detail.reducer';
import {DocumentDetailEffects} from '../../shared/state/document-detail/document-detail.effects';
import {AsyncPipe, JsonPipe, NgIf} from '@angular/common';

const routes: Routes = [
  {
    path: '', component: DetailViewPageComponent
  }
]

@NgModule({
  declarations: [
    DetailViewPageComponent
  ],
  imports: [
    RouterModule.forChild(routes),
    StoreModule.forFeature('document-detail', documentDetailReducer),
    EffectsModule.forFeature([DocumentDetailEffects]),
    NgIf,
    AsyncPipe,
    JsonPipe,
  ],
})

export class DetailViewPageModule {}
