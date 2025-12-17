import {Component, inject, OnInit, OnDestroy} from '@angular/core';
import {DetailViewService} from "../detail-view-page/services/detail-view.service";
import {RecordHandlerService} from "../../shared/services/record-handler.service";
import {EnvironmentService} from "../../shared/services/environment.service";
import {DocumentTypeEnum} from "../constants/document-type";
import {MusicService} from "./services/music.service";
import {SoundService} from '../../shared/services/sound.service';
import {ViewToggleOption} from '../../shared/components/toolbar-controls/toolbar-controls.component';
import {FavoritesService} from '../../shared/services/favorites.service';
import {PopupPositioningService} from '../../shared/services/popup-positioning.service';
import {Router} from '@angular/router';
import {FavoritesPopupHelper} from '../../shared/helpers/favorites-popup.helper';

@Component({
  selector: 'app-music-page',
  templateUrl: './music-page.component.html',
  styleUrl: './music-page.component.scss',
  standalone: false
})
export class MusicPageComponent implements OnInit, OnDestroy {

  private krameriusBaseUrl: string;

  public detailViewService = inject(DetailViewService);
  public recordHandler = inject(RecordHandlerService);
  public musicService = inject(MusicService);
  public soundService = inject(SoundService);

  // Favorites popup helper
  public favoritesHelper: FavoritesPopupHelper;

  // View toggle options for sound recordings - static to prevent re-rendering
  readonly viewToggleOptions: ViewToggleOption[] = [
    { label: 'sound-records--toggle', icon: 'icon-music-filter', value: 'records' },
    { label: 'images--toggle', icon: 'icon-gallery', value: 'images' }
  ];

  constructor(
    private envService: EnvironmentService,
    favoritesService: FavoritesService,
    popupPositioning: PopupPositioningService,
    router: Router
  ) {
    this.krameriusBaseUrl = this.envService.getKrameriusUrl();
    this.favoritesHelper = new FavoritesPopupHelper(favoritesService, popupPositioning, router);
  }

  ngOnInit() {
    this.detailViewService.loadDocument();
    this.detailViewService.loadPages();

    this.detailViewService.getSoundRecordings()
      .subscribe(recordings => {
        if (!recordings) return;
        this.musicService.loadMusic(recordings);
      })

  }

  ngOnDestroy(): void {
    this.favoritesHelper.cleanup();
  }

  goBackClicked() {
    window.history.back();
  }

  onFavoritesClicked(event: Event) {
    // Do not show hierarchy selector for music page
    this.favoritesHelper.onFavoritesClicked(event, this.detailViewService.document$, false);
  }

  onFavoritesPopupClose() {
    this.favoritesHelper.onFavoritesPopupClose();
  }

  getKrameriusBaseUrl(): string {
    return this.krameriusBaseUrl;
  }

  protected readonly DocumentTypeEnum = DocumentTypeEnum;

}
