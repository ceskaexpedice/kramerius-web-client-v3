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

    // Apply zoom using width/height instead of scale transform
    let widthStyle = 'auto';
    let heightStyle = 'auto';
    let maxWidthStyle = '100%';
    let maxHeightStyle = '100%';

    if (props.fitToScreen) {
      // Fit to height of available space
      heightStyle = '100%';
      widthStyle = 'auto';
      maxWidthStyle = 'none';
      maxHeightStyle = 'none';
    } else if (props.zoom && props.zoom !== 100) {
      // Apply zoom by changing max-width/max-height
      maxWidthStyle = `${props.zoom}%`;
      maxHeightStyle = `${props.zoom}%`;
    }

    this.imageStyles = {
      transform: transform.join(' ') || 'none',
      width: widthStyle,
      height: heightStyle,
      maxWidth: maxWidthStyle,
      maxHeight: maxHeightStyle,
      objectFit: props.fitToScreen ? 'contain' : 'initial'
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
