import { Component, ElementRef, inject, OnDestroy, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EpubViewerComponent } from '../../../shared/components/epub-viewer/epub-viewer';
import { EpubSidebarComponent } from '../../../shared/components/epub-sidebar/epub-sidebar.component';
import { DetailLayoutComponent } from '../../../shared/components/detail-layout/detail-layout.component';
import { ActionToolbarComponent } from '../../../shared/components/action-toolbar/action-toolbar.component';
import { ViewerControls } from '../../../shared/components/viewer-controls/viewer-controls';
import { EpubService } from '../../../shared/services/epub.service';

@Component({
  selector: 'app-epub-test-page',
  standalone: true,
  imports: [
    CommonModule,
    DetailLayoutComponent,
    ActionToolbarComponent,
    EpubViewerComponent,
    EpubSidebarComponent,
    ViewerControls,
  ],
  templateUrl: './epub-test-page.component.html',
  styleUrl: './epub-test-page.component.scss',
})
export class EpubTestPageComponent implements OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  public epubService = inject(EpubService);

  // Signals: the file is read asynchronously and the app runs without zone.js.
  readonly localFileName = signal<string | null>(null);
  readonly hasLocalEpub = signal(false);

  openFilePicker(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.localFileName.set(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      this.epubService.loadLocalEpub(reader.result as ArrayBuffer);
      // Defer showing the viewer to the next tick so Angular creates it
      // in a separate CD cycle after layout has settled.
      setTimeout(() => this.hasLocalEpub.set(true));
    };
    reader.readAsArrayBuffer(file);

    // Reset so re-selecting same file triggers change
    input.value = '';
  }

  ngOnDestroy(): void {
    this.epubService.clear();
  }
}
