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
import {MusicTrackListComponent} from "./components/music-track-list/music-track-list.component";
import {TranslatePipe} from '@ngx-translate/core';
import {ViewerControls} from '../../shared/components/viewer-controls/viewer-controls';
import {ImageViewer} from '../../shared/components/image-viewer/image-viewer';
import {IIIFViewer} from "../../shared/components/iiif-viewer/iiif-viewer";
import {FavoritesPopupComponent} from '../../shared/components/favorites-popup/favorites-popup.component';
import {DocumentAccessDenied} from '../detail-view-page/components/access-denied/document-access-denied/document-access-denied';
import {InlineLoaderComponent} from '../../shared/components/inline-loader/inline-loader.component';
import {MetadataSidebarComponent} from '../../shared/components/metadata-sidebar/metadata-sidebar.component';

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
        TranslatePipe,
        ViewerControls,
        ImageViewer,
        IIIFViewer,
        FavoritesPopupComponent,
        DocumentAccessDenied,
        InlineLoaderComponent,
        MetadataSidebarComponent,
    ],
  providers: [
  ]

})

export class MusicPageModule {}
