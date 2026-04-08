import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { ConfigService } from '../../../core/config/config.service';
import { TranslateService } from '@ngx-translate/core';
import { LicenseWatermarkConfig, LocalizedLabel } from '../../../core/config/config.interfaces';

@Component({
  selector: 'app-viewer-watermark',
  imports: [],
  templateUrl: './viewer-watermark.component.html',
  styleUrl: './viewer-watermark.component.scss'
})
export class ViewerWatermarkComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() docLicenses: string[] = [];
  @Input() pagePid: string | null = null;
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private configService = inject(ConfigService);
  private translateService = inject(TranslateService);

  private loadedImage: HTMLImageElement | null = null;
  private rafId: number | null = null;

  ngAfterViewInit(): void {
    this.scheduleRender();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['docLicenses'] || changes['pagePid']) {
      this.scheduleRender();
    }
  }

  ngOnDestroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }

  private scheduleRender(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.render();
    });
  }

  private render(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const config = this.configService.getWatermarkConfig(this.docLicenses);
    if (!config) {
      // clear canvas when no watermark applies
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    if (config.type === 'image' && config.logo) {
      if (this.loadedImage?.src.endsWith(config.logo)) {
        this.drawCanvas(config, this.loadedImage);
      } else {
        const img = new Image();
        img.onload = () => {
          this.loadedImage = img;
          this.drawCanvas(config, img);
        };
        img.src = config.logo;
      }
    } else {
      this.drawCanvas(config, null);
    }
  }

  private resolveStaticText(staticText: string | LocalizedLabel | undefined): string | null {
    if (!staticText) return null;
    if (typeof staticText === 'string') return staticText;
    const lang = this.translateService.currentLang;
    return staticText[lang] ?? staticText['en'] ?? staticText[Object.keys(staticText)[0]] ?? null;
  }

  private drawCanvas(config: LicenseWatermarkConfig, img: HTMLImageElement | null): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    if (canvas.width === 0 || canvas.height === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const rows = config.rowCount ?? 3;
    const cols = config.colCount ?? 3;
    const probability = config.probability ?? 100;
    const opacity = config.opacity ?? 0.15;
    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;

    ctx.globalAlpha = opacity;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() * 100 > probability) continue;

        const cx = cellW * c + cellW / 2;
        const cy = cellH * r + cellH / 2;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-Math.PI / 4);

        if (img && config.type === 'image') {
          const scale = config.scale ?? 1.0;
          const maxDim = Math.min(cellW, cellH) * 0.6 * scale;
          const ratio = img.naturalWidth / img.naturalHeight;
          const drawW = ratio >= 1 ? maxDim : maxDim * ratio;
          const drawH = ratio >= 1 ? maxDim / ratio : maxDim;
          ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        } else {
          const text = this.resolveStaticText(config.staticText) ?? '';
          if (!text) { ctx.restore(); continue; }
          const fontSize = config.fontSize ?? 14;
          const color = config.color ?? 'rgba(0,0,0,0.5)';
          ctx.font = `${fontSize}px sans-serif`;
          ctx.fillStyle = color;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, 0, 0);
        }

        ctx.restore();
      }
    }
  }
}
