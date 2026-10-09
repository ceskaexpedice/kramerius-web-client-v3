import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { RecordItemComponent } from './record-item.component';
import { RecordItem } from './record-item.model';
import { FavoritesService } from '../../services/favorites.service';
import { FolderItemsService } from '../../../modules/saved-lists-page/services/folder-items.service';
import { AdminModeService } from '../../services';
import { EnvironmentService } from '../../services/environment.service';
import { PopupPositioningService } from '../../services/popup-positioning.service';
import { SavedListsService } from '../../../modules/saved-lists-page/services/saved-lists.service';
import { RecordHandlerService } from '../../services/record-handler.service';
import { SolrService } from '../../../core/solr/solr.service';

/**
 * RecordItemComponent is rendered up to 180x per section, and several sections
 * can be on screen at once, so it was switched to OnPush and its favourite
 * observables were shareReplay'd (the template subscribes to isItemFavorited$
 * six times per card).
 *
 * These tests pin the two things that could have broken:
 *  - OnPush must not stop input- or signal-driven updates reaching the DOM.
 *  - shareReplay must collapse the repeated subscriptions to ONE upstream
 *    subscription per card, without changing what is rendered.
 */
describe('RecordItemComponent (OnPush + shared favourite state)', () => {

  @Component({
    standalone: true,
    imports: [RecordItemComponent],
    template: `
      <app-record-item [item]="item" [loading]="loading" [showModel]="showModel"></app-record-item>
    `,
  })
  class HostComponent {
    item: RecordItem | null = {
      id: 'uuid:doc-1',
      title: 'First title',
      model: 'monograph',
      licenses: [],
      className: '',
      showFavoriteButton: true,
      showAccessibilityBadge: false,
    } as RecordItem;
    loading = false;
    showModel = true;
  }

  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let favoritedSubject: BehaviorSubject<boolean>;
  let upstreamSubscriptions: number;
  let adminModeSignal: ReturnType<typeof signal<boolean>>;

  beforeEach(async () => {
    favoritedSubject = new BehaviorSubject<boolean>(false);
    upstreamSubscriptions = 0;
    adminModeSignal = signal(false);

    // A real Observable that records each upstream subscription, so the test
    // can assert shareReplay collapsed the template's repeated async pipes.
    const countedFavorited = new Observable<boolean>(subscriber => {
      upstreamSubscriptions++;
      const sub = favoritedSubject.subscribe(subscriber);
      return () => sub.unsubscribe();
    });

    const favoritesServiceStub = {
      getFavoritedStatus: () => countedFavorited,
      createPopupState: () => ({
        showPopup: signal(false),
        popupPositioned: signal(false),
        closePopup: () => {},
      }),
      handleFavoriteToggle: jasmine.createSpy('handleFavoriteToggle'),
    };

    const adminModeStub = {
      adminMode: adminModeSignal,
      isSelected: () => false,
      selectItem: jasmine.createSpy('selectItem'),
      deselectItem: jasmine.createSpy('deselectItem'),
      toggleItem: jasmine.createSpy('toggleItem'),
    };

    await TestBed.configureTestingModule({
      imports: [HostComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: {} }),
        { provide: FavoritesService, useValue: favoritesServiceStub },
        { provide: FolderItemsService, useValue: { getOwnedFolderIdsContainingItem: () => of([]) } },
        { provide: AdminModeService, useValue: adminModeStub },
        { provide: EnvironmentService, useValue: { getApiUrl: () => 'https://api.test' } },
        { provide: PopupPositioningService, useValue: { createPopupState: () => ({}), cleanup: () => {} } },
        { provide: SavedListsService, useValue: {} },
        {
          provide: RecordHandlerService,
          useValue: {
            getDocumentUrl: () => '/view/uuid:doc-1',
            onNavigate: () => {},
            isRecordLocked: () => false,
          },
        },
        { provide: SolrService, useValue: { getDetailItem: () => of(null) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  const cardTitle = () => fixture.nativeElement.querySelector('.record-item-card')?.getAttribute('aria-label');

  it('renders the card for a loaded item', () => {
    expect(fixture.nativeElement.querySelector('.record-item-card')).not.toBeNull();
    expect(cardTitle()).toBe('First title');
  });

  it('reflects a replaced item input under OnPush', () => {
    host.item = { ...host.item!, id: 'uuid:doc-2', title: 'Second title' } as RecordItem;
    fixture.detectChanges();

    expect(cardTitle()).toBe('Second title');
  });

  it('reflects the loading input under OnPush', () => {
    expect(fixture.nativeElement.querySelector('.skeleton-image')).toBeNull();

    host.loading = true;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.skeleton-image')).not.toBeNull();
  });

  it('reacts to the adminMode signal under OnPush', () => {
    expect(fixture.nativeElement.querySelector('.record-item-card__selection')).toBeNull();

    adminModeSignal.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.record-item-card__selection')).not.toBeNull();
  });

  it('subscribes upstream once despite the template using the observable repeatedly', () => {
    // Without shareReplay each async pipe opened its own store subscription;
    // the template uses isItemFavorited$ six times per card.
    expect(upstreamSubscriptions).toBe(1);
  });

  it('propagates a favourite-status change to the DOM through the shared stream', () => {
    expect(fixture.nativeElement.querySelector('.favorites-button.favorited')).toBeNull();

    favoritedSubject.next(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.favorites-button.favorited')).not.toBeNull();
  });
});
