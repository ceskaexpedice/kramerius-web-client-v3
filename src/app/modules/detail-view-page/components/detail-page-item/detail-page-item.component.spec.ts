import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { DetailPageItemComponent } from './detail-page-item.component';
import { EnvironmentService } from '../../../../shared/services/environment.service';
import { CdkSourceService } from '../../../../shared/services/cdk-source.service';
import { AdminModeService } from '../../../../shared/services/admin-mode.service';

/**
 * The item was switched to OnPush because a 1000-page grid made it the hottest
 * template in the app. OnPush is only safe if every way its visuals change
 * still reaches the DOM: parent-driven inputs, and the two signals its template
 * reads directly (CdkSourceService for the thumbnail URL, AdminModeService for
 * selection). These tests pin exactly that — they fail if the component stops
 * re-rendering on any of those paths.
 */
describe('DetailPageItemComponent (OnPush)', () => {

  @Component({
    standalone: true,
    imports: [DetailPageItemComponent],
    template: `
      <app-detail-page-item
        [page]="page"
        [type]="'page'"
        [pageNumber]="pageNumber"
        [isSelected]="isSelected"
        [isLocked]="isLocked"
        [localSelectionMode]="localSelectionMode"
        [localIsSelected]="localIsSelected">
      </app-detail-page-item>
    `,
  })
  class HostComponent {
    page: any = { pid: 'uuid:page-1' };
    pageNumber: string | number | null = '1';
    isSelected = false;
    isLocked = false;
    localSelectionMode = false;
    localIsSelected = false;
  }

  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let adminMode: { adminMode: any; isSelected: jasmine.Spy; selectItem: jasmine.Spy; deselectItem: jasmine.Spy; toggleItem: jasmine.Spy };
  let prefixed: ReturnType<typeof signal<string>>;

  beforeEach(async () => {
    prefixed = signal('/item/uuid:page-1/image/thumb');
    const adminModeSignal = signal(false);

    adminMode = {
      adminMode: adminModeSignal,
      isSelected: jasmine.createSpy('isSelected').and.returnValue(false),
      selectItem: jasmine.createSpy('selectItem'),
      deselectItem: jasmine.createSpy('deselectItem'),
      toggleItem: jasmine.createSpy('toggleItem'),
    };

    await TestBed.configureTestingModule({
      imports: [HostComponent, TranslateModule.forRoot()],
      providers: [
        { provide: EnvironmentService, useValue: { getApiUrl: () => 'https://api.test' } },
        {
          provide: CdkSourceService,
          useValue: {
            prefixedItemPathSignal: () => prefixed(),
            prefixedItemPath: () => '/item/uuid:page-1/image',
          },
        },
        { provide: AdminModeService, useValue: adminMode },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  const anchor = () => fixture.nativeElement.querySelector('a.page--item') as HTMLElement;
  const img = () => fixture.nativeElement.querySelector('img') as HTMLImageElement | null;

  it('reflects a changed isSelected input', () => {
    expect(anchor().classList).not.toContain('selected');

    host.isSelected = true;
    fixture.detectChanges();

    expect(anchor().classList).toContain('selected');
  });

  it('reflects a changed isLocked input', () => {
    expect(fixture.nativeElement.querySelector('.page--item__lock.locked')).toBeNull();

    host.isLocked = true;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.page--item__lock.locked')).not.toBeNull();
  });

  it('reflects a changed pageNumber input', () => {
    expect(fixture.nativeElement.querySelector('.page--number')?.textContent?.trim()).toBe('1');

    host.pageNumber = '42';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.page--number')?.textContent?.trim()).toBe('42');
  });

  it('re-renders the thumbnail URL when the CDK source signal resolves later', () => {
    expect(img()?.getAttribute('src')).toContain('/item/uuid:page-1/image/thumb');

    // The real service resolves its source from an effect after first render.
    prefixed.set('/cdk/src1/item/uuid:page-1/image/thumb');
    fixture.detectChanges();

    expect(img()?.getAttribute('src')).toContain('/cdk/src1/item/uuid:page-1/image/thumb');
  });

  it('shows the selection checkbox when admin mode turns on (signal read in template)', () => {
    expect(fixture.nativeElement.querySelector('.page--item__selection')).toBeNull();

    adminMode.adminMode.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.page--item__selection')).not.toBeNull();
  });

  it('reflects local selection state pushed from a parent (page-selection-dialog path)', () => {
    host.localSelectionMode = true;
    fixture.detectChanges();
    expect(anchor().classList).toContain('admin-mode');
    expect(anchor().classList).not.toContain('admin-selected');

    host.localIsSelected = true;
    fixture.detectChanges();

    expect(anchor().classList).toContain('admin-selected');
  });
});
