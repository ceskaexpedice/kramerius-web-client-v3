import {
  Component,
  ElementRef,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { Metadata } from '../../models/metadata.model';
import { GeoreferenceService } from '../../services/georeference.service';
import { MapViewerService } from '../../services/map-viewer.service';
import { SliderComponent } from '../slider/slider.component';

@Component({
  selector: 'app-georeference-viewer',
  standalone: true,
  imports: [CommonModule, TranslatePipe, SliderComponent],
  templateUrl: './georeference-viewer.html',
  styleUrl: './georeference-viewer.scss'
})
export class GeoreferenceViewerComponent implements OnInit, OnChanges, OnDestroy {
  @Input() metadata!: Metadata;
  @Input() imagePid!: string;

  @ViewChild('viewerEl', { static: true }) viewerEl!: ElementRef<HTMLElement>;

  loading = true;
  loadError: string | null = null;
  opacityPercent = 100;

  private destroyed = false;
  private georeferenceService = inject(GeoreferenceService);
  public mapViewer = inject(MapViewerService);

  async ngOnInit(): Promise<void> {
    await this.initViewer();
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if ((changes['imagePid'] && !changes['imagePid'].firstChange) && this.mapViewer.getViewer()) {
      await this.loadMapsForCurrentImage();
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    try {
      this.mapViewer.clearMaps();
    } catch {
      /* noop */
    }
    this.mapViewer.detachViewer();
  }

  private async initViewer(): Promise<void> {
    this.loading = true;
    this.loadError = null;
    try {
      const { createAllmapsViewer } = await import('@allmaps/viewer-lite');
      if (this.destroyed) return;

      const viewer = createAllmapsViewer(this.viewerEl.nativeElement, {
        maps: [],
        basemap: 'osm',
        fitOnInit: true
      });
      this.mapViewer.attachViewer(viewer);
      this.mapViewer.setContainer(this.viewerEl.nativeElement);

      await this.loadMapsForCurrentImage();
    } catch (err) {
      console.error('Failed to initialize Allmaps viewer', err);
      this.loadError = 'Failed to initialize map viewer';
    } finally {
      this.loading = false;
    }
  }

  private async loadMapsForCurrentImage(): Promise<void> {
    if (!this.mapViewer.getViewer() || !this.imagePid) return;

    try {
      const annotation = await firstValueFrom(this.georeferenceService.getAnnotation(this.imagePid));
      if (!annotation) {
        await this.mapViewer.clearMaps();
        this.loadError = 'No georeference annotation available for this map';
        return;
      }
      const { parseAnnotation } = await import('@allmaps/viewer-lite');
      const maps = parseAnnotation(annotation);
      if (this.destroyed) return;

      await this.mapViewer.setMaps(maps);
      this.mapViewer.fitToMaps();
      this.mapViewer.setOpacity(this.opacityPercent);
      this.loadError = null;
    } catch (err) {
      console.error('Failed to load Allmaps annotation', err);
      this.loadError = 'Failed to load georeference annotation';
    }
  }

  onOpacityChange(value: number): void {
    this.opacityPercent = value;
    this.mapViewer.setOpacity(value);
  }
}
