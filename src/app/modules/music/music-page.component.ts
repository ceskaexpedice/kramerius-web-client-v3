import {Component, inject, OnInit} from '@angular/core';
import {DetailViewService} from "../detail-view-page/services/detail-view.service";
import {RecordHandlerService} from "../../shared/services/record-handler.service";
import {EnvironmentService} from "../../shared/services/environment.service";
import {DocumentTypeEnum} from "../constants/document-type";
import {MusicService} from "./services/music.service";

@Component({
  selector: 'app-music-page',
  templateUrl: './music-page.component.html',
  styleUrl: './music-page.component.scss',
  standalone: false
})
export class MusicPageComponent implements OnInit {

  private krameriusBaseUrl: string;

  public detailViewService = inject(DetailViewService);
  public recordHandler = inject(RecordHandlerService);
  public musicService = inject(MusicService);

  constructor(private envService: EnvironmentService) {
    this.krameriusBaseUrl = this.envService.get('krameriusBaseUrl');
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

  goBackClicked() {
    window.history.back();
  }

  getKrameriusBaseUrl(): string {
    return this.krameriusBaseUrl;
  }

  protected readonly DocumentTypeEnum = DocumentTypeEnum;

}
