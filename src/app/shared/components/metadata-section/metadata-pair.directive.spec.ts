import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { METADATA_PAIR_STACKED, MetadataPairDirective } from './metadata-pair.directive';

@Component({
  imports: [MetadataPairDirective],
  template: `
    <div appMetadataPair [style.width.px]="width()"
         style="display: grid; grid-template-columns: 1fr 1fr; column-gap: 8px">
      <div><span>Ročník</span></div>
      @if (second()) {
        <div><span>{{ secondText() }}</span></div>
      }
    </div>
  `
})
class HostComponent {
  readonly width = signal(400);
  readonly second = signal(true);
  readonly secondText = signal('Číslo');
}

describe('MetadataPairDirective', () => {
  const setup = () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('[appMetadataPair]') as HTMLElement;
    const directive = fixture.debugElement.children[0].injector.get(MetadataPairDirective);
    const stacked = () => {
      fixture.detectChanges();
      directive.update();
      return el.classList.contains(METADATA_PAIR_STACKED);
    };
    return { fixture, stacked };
  };

  it('keeps two columns when both fields fit their half', () => {
    const { stacked } = setup();
    expect(stacked()).toBeFalse();
  });

  it('stacks when a field would have to wrap in its half', () => {
    const { fixture, stacked } = setup();
    fixture.componentInstance.secondText.set('Sprístupnené pod licenciou, veľmi dlhý názov licencie');
    expect(stacked()).toBeTrue();
  });

  it('stacks when the pair gets too narrow', () => {
    const { fixture, stacked } = setup();
    fixture.componentInstance.width.set(60);
    expect(stacked()).toBeTrue();
  });

  it('uses the full width for a lone field', () => {
    const { fixture, stacked } = setup();
    fixture.componentInstance.second.set(false);
    expect(stacked()).toBeTrue();
  });
});
