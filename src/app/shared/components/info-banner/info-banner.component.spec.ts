import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InfoBannerComponent } from './info-banner.component';

describe('InfoBannerComponent', () => {
  let fixture: ComponentFixture<InfoBannerComponent>;
  let component: InfoBannerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoBannerComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(InfoBannerComponent);
    component = fixture.componentInstance;
  });

  it('renders the title, message and icon', () => {
    component.icon = 'icon-notification-2';
    component.title = 'Hello title';
    component.message = 'Hello message';
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.info-banner__icon i')?.className).toContain('icon-notification-2');
    expect(el.querySelector('.info-banner__title')?.textContent).toContain('Hello title');
    expect(el.querySelector('.info-banner__message')?.textContent).toContain('Hello message');
  });

  it('applies the variant class', () => {
    component.variant = 'primary';
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.info-banner')?.className)
      .toContain('info-banner--primary');
  });

  it('emits actionClick with the action id when a button is clicked', () => {
    const spy = jasmine.createSpy('actionClick');
    component.actions = [{ id: 'save', label: 'Save' }];
    component.actionClick.subscribe(spy);
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.info-banner__actions button')!.click();
    expect(spy).toHaveBeenCalledWith('save');
  });

  it('renders the dont-show checkbox only when dontShowId is set and emits on toggle', () => {
    const spy = jasmine.createSpy('dontShow');
    component.dontShowId = 'shared-folder-banner';
    component.dontShowAgainChange.subscribe(spy);
    fixture.detectChanges();
    const checkbox = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLInputElement>('.info-banner__dont-show input')!;
    expect(checkbox).toBeTruthy();
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    expect(spy).toHaveBeenCalledWith(true);
  });
});
