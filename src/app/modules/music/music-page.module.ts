import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {MusicPageComponent} from "./music-page.component";
import {DetailViewPageComponent} from "../detail-view-page/detail-view-page.component";
import {DetailLayoutComponent} from "../../shared/components/detail-layout/detail-layout.component";
import {InputComponent} from "../../shared/components/input/input.component";
import {AsyncPipe, NgForOf, NgIf} from "@angular/common";
import {PageNavigatorComponent} from "../../shared/components/page-navigator/page-navigator.component";
import {DetailPagesGridComponent} from "../detail-view-page/components/detail-pages-grid/detail-pages-grid.component";
import {ActionToolbarComponent} from "../../shared/components/action-toolbar/action-toolbar.component";
import {ToolbarHeaderComponent} from "../../shared/components/toolbar-header/toolbar-header.component";
import {DateNavigatorComponent} from "../../shared/components/date-navigator/date-navigator.component";
import {ToolbarControlsComponent} from "../../shared/components/toolbar-controls/toolbar-controls.component";
import {
  DetailViewBottomToolbarComponent
} from "../detail-view-page/components/detail-view-bottom-toolbar/detail-view-bottom-toolbar.component";
import {StoreModule} from "@ngrx/store";
import {documentDetailReducer} from "../../shared/state/document-detail/document-detail.reducer";
import {EffectsModule} from "@ngrx/effects";
import {DocumentDetailEffects} from "../../shared/state/document-detail/document-detail.effects";
import {musicDetailReducer} from "./state/music-detail.reducer";
import {MusicDetailEffects} from "./state/music-detail.effects";
import {MusicTrackListComponent} from "./components/music-track-list/music-track-list.component";

const routes: Routes = [
  {
    path: ':uuid', component: MusicPageComponent
  }
]

@NgModule({
  declarations: [
    MusicPageComponent
  ],
  imports: [
    RouterModule.forChild(routes),
    StoreModule.forFeature('document-detail', documentDetailReducer),
    StoreModule.forFeature('music', musicDetailReducer),
    EffectsModule.forFeature([DocumentDetailEffects, MusicDetailEffects]),
    DetailLayoutComponent,
    InputComponent,
    NgIf,
    AsyncPipe,
    PageNavigatorComponent,
    DetailPagesGridComponent,
    ActionToolbarComponent,
    ToolbarHeaderComponent,
    DateNavigatorComponent,
    ToolbarControlsComponent,
    DetailViewBottomToolbarComponent,
    NgForOf,
    MusicTrackListComponent,
  ],
  providers: [
  ]

})

export class MusicPageModule {}
