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
import {TabsComponent} from '../../shared/components/tabs/tabs.component';
import {TabItemComponent} from '../../shared/components/tabs/tab-item.component';
import {MobileNavBarComponent} from '../../shared/components/mobile-nav-bar/mobile-nav-bar.component';
import {ViewerTapToggleDirective} from '../../shared/directives/viewer-tap-toggle.directive';
import {AiContentPanelComponent} from '../../shared/components/ai-content-panel/ai-content-panel.component';
import {AiActionsComponent} from '../../shared/components/metadata-sidebar/ai-actions/ai-actions.component';
import {SlideUpPanelComponent} from '../../shared/components/slide-up-panel/slide-up-panel.component';
import {MetadataSection} from '../../shared/components/metadata-section/metadata-section';
import {
  ExportDocumentSectionComponent
} from '../../shared/components/metadata-sidebar/export-document-section-component/export-document-section-component';
import {
  SearchResultsSidebarComponent
} from '../../shared/components/metadata-sidebar/search-results-sidebar/search-results-sidebar.component';

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
        TabsComponent,
        TabItemComponent,
        MobileNavBarComponent,
        ViewerTapToggleDirective,
        AiContentPanelComponent,
        AiActionsComponent,
        SlideUpPanelComponent,
        MetadataSection,
        ExportDocumentSectionComponent,
        SearchResultsSidebarComponent,
    ],
  providers: [
  ]

})

export class MusicPageModule {}
