import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-license-badge',
    standalone: true,
    imports: [],
    templateUrl: './license-badge.component.html',
    styleUrl: './license-badge.component.scss'
})
export class LicenseBadgeComponent {
    @Input() license!: string;
}
