import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MetadataGroupComponent } from './metadata-group.component';

@Component({
  imports: [MetadataGroupComponent],
  template: `
    <app-metadata-group key="spec-group" title="Group title">
      @if (show()) { <p class="field">Field</p> }
    </app-metadata-group>
  `,
})
class HostComponent {
  show = signal(true);
}

describe('MetadataGroupComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let el: HTMLElement;

  beforeEach(() => {
    localStorage.removeItem('cdk.metadataGroupsCollapsed');
    fixture = TestBed.configureTestingModule({ imports: [HostComponent, TranslateModule.forRoot()] })
      .createComponent(HostComponent);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  afterEach(() => localStorage.removeItem('cdk.metadataGroupsCollapsed'));

  it('renders an h3 heading with a disclosure button controlling the body', () => {
    const button = el.querySelector('h3 button')!;
    const body = el.querySelector('.metadata-group__body')!;
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-controls')).toBe(body.id);
  });

  it('collapses and remembers the state', () => {
    (el.querySelector('h3 button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('h3 button')!.getAttribute('aria-expanded')).toBe('false');
    expect((el.querySelector('.metadata-group__body') as HTMLElement).hidden).toBeTrue();
    expect(JSON.parse(localStorage.getItem('cdk.metadataGroupsCollapsed')!)).toContain('spec-group');
  });

  it('hides itself when no field rendered', () => {
    const host = el.querySelector('app-metadata-group') as HTMLElement;
    expect(host.style.display).toBe('');
    fixture.componentInstance.show.set(false);
    fixture.detectChanges();
    expect(host.style.display).toBe('none');
  });
});
