import { Component, inject, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RecordHandlerService } from '../../services/record-handler.service';

@Component({
    selector: 'app-license-badge',
    standalone: true,
    imports: [TranslateModule],
    templateUrl: './license-badge.component.html',
    styleUrl: './license-badge.component.scss'
})
export class LicenseBadgeComponent {
    @Input() license!: string;

    private recordHandler = inject(RecordHandlerService);

    get badgeType(): 'onsite' | 'dnnt' | 'public' | 'other' {
        return this.recordHandler.getLicenseBadgeType(this.license);
    }
}
