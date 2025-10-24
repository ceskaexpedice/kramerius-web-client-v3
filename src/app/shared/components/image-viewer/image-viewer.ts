import { Component, inject, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import {AsyncPipe, NgIf, NgStyle} from '@angular/common';
import { Metadata } from '../../models/metadata.model';
import { ImageViewerService } from '../../services/image-viewer.service';
import { ImageViewerControls } from './image-viewer-controls/image-viewer-controls';
import { Subscription } from 'rxjs';
import { EnvironmentService } from '../../services/environment.service';

@Component({
  selector: 'app-image-viewer',
  imports: [
    AsyncPipe,
    NgStyle,
    ImageViewerControls,
    NgIf,
  ],
  templateUrl: './image-viewer.html',
  styleUrl: './image-viewer.scss'
})
export class ImageViewer implements OnInit, OnDestroy, OnChanges {

  @Input() metadata: Metadata | null = null;
  @Input() imagePid: string | null = null;

  public imageViewerService = inject(ImageViewerService);
  private envService = inject(EnvironmentService);
  private subscriptions: Subscription[] = [];

  imageUrl: string | null = null;
  imageStyles: any = {};

  constructor() {
  }

  ngOnInit(): void {
    this.imageViewerService.uuid = this.metadata?.uuid || null;
    this.updateImageUrl();

    // Subscribe to property changes
    const propsSub = this.imageViewerService.properties$.subscribe(props => {
      this.updateImageStyles(props);
    });
    this.subscriptions.push(propsSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Update image URL when imagePid changes
    if (changes['imagePid'] && !changes['imagePid'].firstChange) {
      this.updateImageUrl();
    }
  }

  private updateImageUrl(): void {
    if (this.imagePid) {
      const apiUrl = this.envService.getApiUrl('items');
      this.imageUrl = `${apiUrl}/${this.imagePid}/image`;
    } else if (this.metadata?.uuid) {
      this.imageUrl = this.imageViewerService.url;
    }
  }

  private updateImageStyles(props: any): void {
    const transform: string[] = [];

    if (props.rotation) {
      transform.push(`rotate(${props.rotation}deg)`);
    }

    if (props.zoom && !props.fitToScreen) {
      transform.push(`scale(${props.zoom / 100})`);
    }

    this.imageStyles = {
      transform: transform.join(' '),
      width: props.fitToScreen ? '100%' : 'auto',
      height: props.fitToScreen ? '100%' : 'auto',
      objectFit: props.fitToScreen ? 'contain' : 'fill'
    };
  }

  onZoomIn(): void {
    this.imageViewerService.zoomIn();
  }

  onZoomOut(): void {
    this.imageViewerService.zoomOut();
  }

  onRotate(): void {
    this.imageViewerService.toggleRotation();
  }

  onFullscreen(): void {
    this.imageViewerService.toggleFullscreen();
  }

  onFitToScreen(): void {
    this.imageViewerService.fitToScreen();
  }

  onResetView(): void {
    this.imageViewerService.resetView();
  }
}
