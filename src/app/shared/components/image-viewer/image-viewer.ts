import { Component, inject, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, ViewChild, AfterViewInit } from '@angular/core';
import {NgIf, NgStyle} from '@angular/common';
import { Metadata } from '../../models/metadata.model';
import { ImageViewerService } from '../../services/image-viewer.service';
import { Subscription } from 'rxjs';
import { EnvironmentService } from '../../services/environment.service';
import { FullscreenComponent } from '../fullscreen/fullscreen.component';

@Component({
  selector: 'app-image-viewer',
  imports: [
    NgStyle,
    NgIf,
    FullscreenComponent,
  ],
  templateUrl: './image-viewer.html',
  styleUrl: './image-viewer.scss'
})
export class ImageViewer implements OnInit, AfterViewInit, OnDestroy, OnChanges {

  @Input() metadata: Metadata | null = null;
  @Input() imagePid: string | null = null;
  @ViewChild(FullscreenComponent, { static: false }) fullscreenComponent!: FullscreenComponent;

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

  ngAfterViewInit(): void {
    // Set the fullscreen component reference in the service after view is initialized
    this.imageViewerService.setFullscreenComponent(() => this.fullscreenComponent);
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
    let objectFitStyle = 'initial';

    if (props.fitToScreen) {
      // Fit to height of available space
      heightStyle = '100%';
      widthStyle = 'auto';
      maxWidthStyle = 'none';
      maxHeightStyle = 'none';
      objectFitStyle = 'contain';
    } else if (props.fitToWidth) {
      // Fit to width of available space
      widthStyle = '100%';
      heightStyle = 'auto';
      maxWidthStyle = 'none';
      maxHeightStyle = 'none';
      objectFitStyle = 'contain';
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
      objectFit: objectFitStyle
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

  onWheel(event: WheelEvent): void {
    // Prevent default scroll behavior
    event.preventDefault();
    event.stopPropagation();

    // Determine zoom direction based on wheel delta
    // deltaY > 0 means scrolling down (zoom out)
    // deltaY < 0 means scrolling up (zoom in)
    if (event.deltaY < 0) {
      this.imageViewerService.zoomIn();
    } else if (event.deltaY > 0) {
      this.imageViewerService.zoomOut();
    }
  }
}
