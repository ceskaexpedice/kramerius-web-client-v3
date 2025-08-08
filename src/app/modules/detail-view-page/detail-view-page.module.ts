import { NgModule } from '@angular/core';
import { DetailViewPageComponent } from './detail-view-page.component';
import { RouterModule, Routes } from '@angular/router';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { documentDetailReducer } from '../../shared/state/document-detail/document-detail.reducer';
import { DocumentDetailEffects } from '../../shared/state/document-detail/document-detail.effects';
import { AsyncPipe, JsonPipe, NgIf } from '@angular/common';
import {ActionToolbarComponent} from '../../shared/components/action-toolbar/action-toolbar.component';
import {FilterSidebarComponent} from '../search-results-page/components/filter-sidebar/filter-sidebar.component';
import {ToolbarControlsComponent} from '../../shared/components/toolbar-controls/toolbar-controls.component';
import {ToolbarHeaderComponent} from '../../shared/components/toolbar-header/toolbar-header.component';
import {DetailPagesGridComponent} from './components/detail-pages-grid/detail-pages-grid.component';
import {InputComponent} from '../../shared/components/input/input.component';
import {
  DetailViewBottomToolbarComponent
} from './components/detail-view-bottom-toolbar/detail-view-bottom-toolbar.component';
import {PageNavigatorComponent} from '../../shared/components/page-navigator/page-navigator.component';
import {TabsComponent} from '../../shared/components/tabs/tabs.component';
import {TabItemComponent} from '../../shared/components/tabs/tab-item.component';
import {DateNavigatorComponent} from '../../shared/components/date-navigator/date-navigator.component';
import {DetailLayoutComponent} from "../../shared/components/detail-layout/detail-layout.component";
import {TranslatePipe} from '@ngx-translate/core';
import {musicDetailReducer} from '../music/state/music-detail.reducer';
import {routerReducer} from '@ngrx/router-store';

const routes: Routes = [
  {
    path: ':uuid', component: DetailViewPageComponent
  }
]

@NgModule({
  declarations: [
    DetailViewPageComponent
  ],
  imports: [
    RouterModule.forChild(routes),
    StoreModule.forFeature('document-detail', documentDetailReducer),
    StoreModule.forFeature('music', musicDetailReducer),
    StoreModule.forFeature('router', routerReducer),
    EffectsModule.forFeature([DocumentDetailEffects]),
    NgIf,
    AsyncPipe,
    JsonPipe,
    ActionToolbarComponent,
    FilterSidebarComponent,
    ToolbarControlsComponent,
    ToolbarHeaderComponent,
    DetailPagesGridComponent,
    InputComponent,
    DetailViewBottomToolbarComponent,
    PageNavigatorComponent,
    TabsComponent,
    TabItemComponent,
    DateNavigatorComponent,
    DetailLayoutComponent,
    TranslatePipe,
  ],
})

export class DetailViewPageModule { }
