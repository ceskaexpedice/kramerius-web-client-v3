import { Component, Input, Output, EventEmitter, ElementRef, OnDestroy, afterNextRender, inject } from '@angular/core';
import { DOCUMENT, NgClass } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

export interface MobileNavItem {
    id: string;
    label: string;
    icon: string;
}

@Component({
    selector: 'app-mobile-nav-bar',
    standalone: true,
    imports: [NgClass, TranslatePipe],
    templateUrl: './mobile-nav-bar.component.html',
    styleUrl: './mobile-nav-bar.component.scss'
})
export class MobileNavBarComponent implements OnDestroy {
    /** The bar whose height is published (the newest one, during a route change). */
    private static owner: MobileNavBarComponent | null = null;

    @Input() items: MobileNavItem[] = [];
    @Input() activeId: string = '';
    /** Translation key of the nav landmark's accessible name. */
    @Input() ariaLabel = '';
    @Output() activeIdChange = new EventEmitter<string>();

    private readonly host = inject(ElementRef<HTMLElement>);
    private readonly root = inject(DOCUMENT).documentElement;
    private resizeObserver: ResizeObserver | null = null;

    constructor() {
        // The mini-player rides on top of the bar (styles.scss): publish the
        // bar's height, safe-area padding included, for it to move up by.
        afterNextRender(() => {
            MobileNavBarComponent.owner = this;
            this.resizeObserver = new ResizeObserver(() => this.publishHeight());
            this.resizeObserver.observe(this.host.nativeElement);
            this.publishHeight();
        });
    }

    ngOnDestroy(): void {
        this.resizeObserver?.disconnect();
        if (MobileNavBarComponent.owner === this) {
            MobileNavBarComponent.owner = null;
            this.root.style.removeProperty('--mobile-nav-bar-offset');
        }
    }

    selectTab(id: string) {
        this.activeIdChange.emit(id);
    }

    private publishHeight(): void {
        if (MobileNavBarComponent.owner !== this) {
            return;
        }
        // offsetHeight ignores the slide-away transform.
        this.root.style.setProperty('--mobile-nav-bar-offset', `${this.host.nativeElement.offsetHeight}px`);
    }
}
