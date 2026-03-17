import { Component, ElementRef, inject, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import ePub, { Book, Rendition } from 'epubjs';
import { Metadata } from '../../models/metadata.model';
import { EnvironmentService } from '../../services/environment.service';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';
import { Subscription } from 'rxjs';
import { InlineLoaderComponent } from '../inline-loader/inline-loader.component';
import { CommonModule } from '@angular/common';
import { EpubService } from '../../services/epub.service';

@Component({
  selector: 'app-epub-viewer',
  standalone: true,
  imports: [
    CommonModule,
    InlineLoaderComponent
  ],
  templateUrl: './epub-viewer.html',
  styleUrl: './epub-viewer.scss'
})
export class EpubViewerComponent implements OnInit, OnDestroy {
  @Input() metadata: Metadata | null = null;
  @ViewChild('viewerContainer', { static: true }) viewerContainer!: ElementRef;

  private book?: Book;
  private rendition?: Rendition;
  private fetchSub?: Subscription;
  private navigationSub?: Subscription;
  private controlSub?: Subscription;
  private searchSub?: Subscription;

  private currentFontSize = 100;
  private isBookMode = false;

  public isLoading = true;

  private env = inject(EnvironmentService);
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private epubService = inject(EpubService);

  private get API_URL(): string {
    const url = this.env.getApiUrl('items');
    return url || '';
  }

  private get httpHeaders(): Record<string, string> {
    const token = this.authService.getAccessToken();
    const isExpired = this.authService.isTokenExpired();

    if (token && !isExpired) {
      return {
        'Authorization': `Bearer ${token}`
      };
    }
    return {};
  }

  ngOnInit() {
    this.initViewer();

    // Listen for cross-component navigation commands (e.g. from the EpubSidebarComponent)
    this.navigationSub = this.epubService.navigate$.subscribe((href) => {
      if (this.rendition && href) {
        this.isLoading = true;
        this.rendition.display(href).then(() => {
          this.isLoading = false;
        });
      }
    });

    // Listen for viewer-controls actions
    this.controlSub = this.epubService.control$.subscribe((event) => {
      this.handleControlEvent(event);
    });

    // Listen for search queries
    this.searchSub = this.epubService.searchQuery$.subscribe((query) => {
      this.performSearch(query);
    });
  }

  private handleControlEvent(event: {action: string, data?: any}) {
    if (!this.rendition) return;

    switch (event.action) {
      case 'zoomIn':
        this.currentFontSize += 10;
        this.rendition.themes.fontSize(`${this.currentFontSize}%`);
        break;
      case 'zoomOut':
        this.currentFontSize = Math.max(50, this.currentFontSize - 10);
        this.rendition.themes.fontSize(`${this.currentFontSize}%`);
        break;
      case 'fullscreen':
        this.toggleFullscreen();
        break;
      case 'bookMode':
        this.isBookMode = !this.isBookMode;
        // @ts-ignore - spread dynamically alters the layout configuration on the fly in some epubjs versions
        this.rendition.spread ? this.rendition.spread(this.isBookMode ? 'auto' : 'none') : null;
        break;
      case 'nextPage':
        this.rendition.next();
        break;
      case 'prevPage':
        this.rendition.prev();
        break;
      case 'gotoPage':
         // Navigating to explicit index requires locations generated.
         if (this.book?.locations) {
            const total = (this.book.locations as any).total || 1;
            const cfi = this.book.locations.cfiFromPercentage(event.data / total);
            if (cfi) this.rendition.display(cfi);
         }
        break;
      case 'gotoCFI':
         if (event.data) {
           this.rendition.display(event.data);
         }
         break;
    }
  }

  private toggleFullscreen() {
    const elem = this.viewerContainer.nativeElement;
    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  private async performSearch(query: string) {
    if (!this.book || !this.book.spine) return;

    if (!query || query.trim() === '') {
      this.epubService.setIsSearching(false);
      this.epubService.setSearchResults([]);
      return;
    }

    this.epubService.setIsSearching(true);
    let globalResults: any[] = [];

    try {
      // Create an array of promises for each spine item search
      const spineItems = (this.book.spine as any).spineItems || [];
      const searchPromises = spineItems.map((item: any) => {
        return item.load(this.book!.load.bind(this.book)).then(() => {
          const results = item.find(query);
          item.unload();
          return results;
        }).catch(() => {
          return []; // Ignore failed chapter loads
        });
      });

      const chapterResults = await Promise.all(searchPromises);
      // Flatten arrays
      globalResults = chapterResults.reduce((acc, curr) => acc.concat(curr), []);
      
    } catch (err) {
      console.error("Error during EPUB search:", err);
    }

    this.epubService.setSearchResults(globalResults);
    this.epubService.setIsSearching(false);

    if (globalResults.length > 0) {
      this.rendition?.display(globalResults[0].cfi);
    }
  }

  private initViewer() {
    if (!this.metadata?.uuid) {
      this.isLoading = false;
      return;
    }

    const fileUrl = `${this.API_URL}/${this.metadata.uuid}/image`;

    this.isLoading = true;

    // Fetch the EPUB file using native fetch to bypass Angular HttpClient JSON parsing issues
    window.fetch(fileUrl, {
      method: 'GET',
      headers: this.httpHeaders
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.blob();
    })
    .then(blob => {
      // Create a File from the Blob to match the expected format
      const epubFile = new File([blob], `${this.metadata?.uuid}.epub`, { type: 'application/epub+zip' });
      
      const reader = new FileReader();
      reader.onload = () => {
        this.renderEpub(reader.result as ArrayBuffer);
      };
      reader.readAsArrayBuffer(epubFile);
    })
    .catch(err => {
      console.error('Failed to load EPUB file', err);
      this.isLoading = false;
    });
  }

  private renderEpub(fileData: ArrayBuffer) {
    try {
      this.book = ePub();
      this.book.open(fileData, 'binary');

      this.rendition = this.book.renderTo(this.viewerContainer.nativeElement, {
        width: '100%',
        height: '100%',
        spread: 'none', // Set to auto to support two-page spreads depending on screen width
        manager: 'continuous',
        flow: 'paginated'
      });

      // Await standard EPUB parsing of the internal Table of Contents map
      this.book.loaded.navigation.then(nav => {
        if (nav && nav.toc) {
          this.epubService.setToc(nav.toc);
        }
      });

      // Calculate Pagination
      this.book.ready.then(() => {
        return this.book!.locations.generate(1600); // generates locs based on approx chars
      }).then((locations: string[]) => {
        const total = (this.book!.locations as any).total || locations.length;
        this.epubService.setPageParams(1, total);
      });

      // Hook up page tracking
      this.rendition.on('relocated', (location: any) => {
        if (this.book?.locations && location.start) {
          const percentage = this.book.locations.percentageFromCfi(location.start.cfi);
          const totalPages = (this.book.locations as any).total || 1;
          const currentPage = Math.round(percentage * totalPages);
          this.epubService.setPageParams(currentPage || 1, totalPages);
          
          if (location.start.href) {
            this.epubService.setActiveHref(location.start.href);
          }
        }
      });

      this.rendition.display().then(() => {
        this.isLoading = false;
      });
    } catch (error) {
      console.error('Error rendering EPUB', error);
      this.isLoading = false;
    }
  }

  ngOnDestroy() {
    if (this.fetchSub) {
      this.fetchSub.unsubscribe();
    }
    if (this.navigationSub) {
      this.navigationSub.unsubscribe();
    }
    if (this.controlSub) {
      this.controlSub.unsubscribe();
    }
    if (this.searchSub) {
      this.searchSub.unsubscribe();
    }
    if (this.book) {
      this.book.destroy();
    }
    this.epubService.clear();
  }

  // Exposed methods for viewer-controls if needed
  nextPage() {
    if (this.rendition) {
      this.rendition.next();
    }
  }

  prevPage() {
    if (this.rendition) {
      this.rendition.prev();
    }
  }
}
