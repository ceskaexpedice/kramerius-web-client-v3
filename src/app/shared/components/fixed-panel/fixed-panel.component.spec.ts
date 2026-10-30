import { Component, signal, viewChildren } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { FixedPanelComponent } from './fixed-panel.component';
import { FixedPanelService } from './fixed-panel.service';

@Component({
  imports: [FixedPanelComponent],
  template: `
    <button id="opener" type="button">open</button>
    <app-fixed-panel [title]="t()" [flush]="flush()" [(isOpen)]="open" (closed)="closedCount = closedCount + 1">
      <button id="inner" type="button">x</button>
      @if (nested()) {
        <app-fixed-panel title="Nested" [(isOpen)]="nestedOpen">
          <button id="nested-inner" type="button">y</button>
        </app-fixed-panel>
      }
    </app-fixed-panel>
    @if (wrappedOpen()) {
      <app-fixed-panel title="Wrapped" [(isOpen)]="wrappedOpen">
        <button id="wrapped-inner" type="button">z</button>
      </app-fixed-panel>
    }
  `
})
class HostComponent {
  readonly t = signal('Panel title');
  readonly flush = signal(false);
  readonly open = signal(false);
  readonly nested = signal(false);
  readonly nestedOpen = signal(false);
  readonly wrappedOpen = signal(false);
  closedCount = 0;
  readonly panels = viewChildren(FixedPanelComponent);
}

describe('FixedPanelComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let service: FixedPanelService;

  const panels = () => Array.from(service.container.querySelectorAll<HTMLElement>('.fixed-panel'));
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [HostComponent, TranslateModule.forRoot()] });
    service = TestBed.inject(FixedPanelService);
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    await settle();
  });

  afterEach(async () => {
    if (!fixture.componentRef.hostView.destroyed) {
      host.nestedOpen.set(false);
      host.open.set(false);
      await settle();
      fixture.destroy();
    }
    TestBed.tick();
    service.container.remove();
  });

  it('renders into the shared container when open', async () => {
    host.open.set(true);
    await settle();

    const [panel] = panels();
    expect(panel).toBeTruthy();
    expect(panel.querySelector('#inner')).toBeTruthy();

    host.open.set(false);
    await settle();

    expect(panels().length).toBe(0);
  });

  it('renders when open from the first render', async () => {
    fixture.destroy();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    host.open.set(true);
    await settle();

    const [panel] = panels();
    expect(panel).toBeTruthy();
    expect(panel.querySelector('#inner')).toBeTruthy();

    host.open.set(false);
    await settle();

    expect(panels().length).toBe(0);
  });

  it('is non-modal', async () => {
    host.open.set(true);
    await settle();

    const [panel] = panels();
    expect(panel.getAttribute('role')).toBe('region');
    expect(panel.getAttribute('aria-label')).toBe('Panel title');
    expect(panel.hasAttribute('aria-modal')).toBeFalse();
    // No header row: the title is not rendered, the close button is in the toolbar.
    expect(panel.querySelector('h2, button:not(#inner)')).toBeNull();
  });

  it('closing from the toolbar (service.closeTop) closes and emits closed', async () => {
    host.open.set(true);
    await settle();

    service.closeTop();
    await settle();

    expect(host.open()).toBeFalse();
    expect(host.closedCount).toBe(1);
  });

  it('flush drops the content padding', async () => {
    host.flush.set(true);
    host.open.set(true);
    await settle();

    expect(panels()[0].querySelector('.fixed-panel__content--flush')).not.toBeNull();
  });

  it('moves focus in on open and back to the opener on close', async () => {
    const opener = fixture.nativeElement.querySelector('#opener') as HTMLButtonElement;
    opener.focus();

    host.open.set(true);
    await settle();
    expect(panels()[0].contains(document.activeElement)).toBeTrue();

    host.open.set(false);
    await settle();
    expect(document.activeElement).toBe(opener);
  });

  it('returns focus to the opener when an @if around the panel drops it on close', async () => {
    const opener = fixture.nativeElement.querySelector('#opener') as HTMLButtonElement;
    opener.focus();
    host.wrappedOpen.set(true);
    await settle();
    expect(panels()[0].contains(document.activeElement)).toBeTrue();

    service.closeTop();
    await settle();

    expect(panels().length).toBe(0);
    expect(document.activeElement).toBe(opener);
  });

  it('restores focus safely when the opener is gone', async () => {
    const opener = fixture.nativeElement.querySelector('#opener') as HTMLButtonElement;
    opener.focus();
    host.open.set(true);
    await settle();

    opener.remove();
    host.open.set(false);
    await expectAsync(settle()).toBeResolved();

    expect(document.activeElement).toBe(document.body);
  });

  it('Escape closes only the top panel', async () => {
    host.nested.set(true);
    host.open.set(true);
    await settle();
    host.nestedOpen.set(true);
    await settle();
    expect(panels().length).toBe(2);
    const outer = panels()[0];

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle();

    expect(host.nestedOpen()).toBeFalse();
    expect(host.open()).toBeTrue();
    expect(panels()).toEqual([outer]);
    expect(outer.contains(document.activeElement)).toBeTrue();
  });

  describe('Escape meant for another popup', () => {
    let edge: HTMLElement;
    let unregister: () => void;
    const escapeOn = (target: HTMLElement) =>
      target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    beforeEach(async () => {
      edge = document.createElement('div');
      edge.innerHTML = `
        <button id="edge-trigger" type="button" aria-haspopup="menu" aria-expanded="false">menu</button>
        <button id="edge-opener" type="button" aria-haspopup="dialog" aria-expanded="false">panel</button>`;
      document.body.appendChild(edge);
      unregister = service.registerEdge(edge, 'top');
    });

    afterEach(() => {
      unregister();
      edge.remove();
    });

    it('is ignored when it comes from an edge with an expanded popup', async () => {
      host.open.set(true);
      await settle();
      const trigger = edge.querySelector<HTMLElement>('#edge-trigger')!;
      trigger.setAttribute('aria-expanded', 'true');
      escapeOn(trigger);
      await settle();
      expect(host.open()).toBeTrue();

      trigger.setAttribute('aria-expanded', 'false');
      escapeOn(trigger);
      await settle();
      expect(host.open()).toBeFalse();
    });

    it('still closes the panel when the expanded trigger is the one that opened it', async () => {
      const opener = edge.querySelector<HTMLElement>('#edge-opener')!;
      opener.focus();
      host.open.set(true);
      await settle();
      opener.setAttribute('aria-expanded', 'true');

      escapeOn(opener);
      await settle();
      expect(host.open()).toBeFalse();
    });

    it('is ignored when it comes from a modal dialog', async () => {
      host.open.set(true);
      await settle();

      const dialog = document.createElement('div');
      dialog.setAttribute('aria-modal', 'true');
      dialog.innerHTML = '<button type="button">ok</button>';
      document.body.appendChild(dialog);

      escapeOn(dialog.querySelector('button')!);
      await settle();
      expect(host.open()).toBeTrue();
      dialog.remove();
    });
  });

  it('animates in when opened on its own', async () => {
    host.open.set(true);
    await settle();
    expect(panels()[0].classList).not.toContain('fixed-panel--swap');
  });

  it('skips the entrance when it replaces a panel closed in the same task', async () => {
    host.open.set(true);
    await settle();
    await new Promise(resolve => setTimeout(resolve));
    host.open.set(false);
    host.wrappedOpen.set(true);
    await settle();
    const all = panels();
    expect(all.length).toBe(1);
    expect(all[0].querySelector('#wrapped-inner')).not.toBeNull();
    expect(all[0].classList).toContain('fixed-panel--swap');
  });

  it('nested panel resolves its enclosing panel through content projection', async () => {
    host.nested.set(true);
    await settle();

    const [outer, inner] = host.panels();
    expect((inner as unknown as { parent: FixedPanelComponent | null }).parent).toBe(outer);
    expect((outer as unknown as { parent: FixedPanelComponent | null }).parent).toBeNull();
  });

  it('closes when the enclosing panel closes', async () => {
    host.nested.set(true);
    host.open.set(true);
    await settle();
    host.nestedOpen.set(true);
    await settle();

    host.open.set(false);
    await settle();

    expect(host.nestedOpen()).toBeFalse();
    expect(panels().length).toBe(0);
  });

  it('destroying an open panel restores the page', async () => {
    host.open.set(true);
    await settle();
    expect(document.body.classList).toContain('fixed-panel-open');

    fixture.destroy();
    TestBed.tick();

    expect(panels().length).toBe(0);
    expect(document.body.classList).not.toContain('fixed-panel-open');
    expect(document.querySelector('[inert]')).toBeNull();
  });
});
