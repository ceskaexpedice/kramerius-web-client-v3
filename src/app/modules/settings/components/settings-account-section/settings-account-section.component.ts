import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
    selector: 'app-settings-account-section',
    standalone: true,
    imports: [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        TranslateModule
    ],
    templateUrl: './settings-account-section.component.html',
    styleUrl: './settings-account-section.component.scss'
})
export class SettingsAccountSectionComponent implements OnInit {
    @Input() expandMoreInfo = false;
    @Output() moreInfoToggle = new EventEmitter<boolean>();

    authService = inject(AuthService);
    showMoreInfo = signal(false);

    ngOnInit() {
        if (this.expandMoreInfo) {
            this.showMoreInfo.set(true);
        }
    }

    toggleMoreInfo() {
        this.showMoreInfo.update(v => !v);
        this.moreInfoToggle.emit(this.showMoreInfo());
    }

    logout() {
        this.authService.logout();
    }
}
