import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgClass } from '@angular/common';
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
export class MobileNavBarComponent {
    @Input() items: MobileNavItem[] = [];
    @Input() activeId: string = '';
    @Output() activeIdChange = new EventEmitter<string>();

    selectTab(id: string) {
        this.activeIdChange.emit(id);
    }
}
