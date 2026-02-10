import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigService } from '../../../core/config';

@Component({
    selector: 'app-selection-controls',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './selection-controls.html',
    styleUrl: './selection-controls.scss'
})
export class SelectionControls {
    @Output() text = new EventEmitter<void>();
    @Output() export = new EventEmitter<void>();
    @Output() share = new EventEmitter<void>();

    private configService = inject(ConfigService);

    // Selection control visibility getters
    get showText(): boolean {
        return this.configService.isSelectionControlEnabled('text');
    }

    get showExport(): boolean {
        return this.configService.isSelectionControlEnabled('export');
    }

    get showShare(): boolean {
        return this.configService.isSelectionControlEnabled('share');
    }

    onText() {
        this.text.emit();
    }

    onExport() {
        this.export.emit();
    }

    onShare() {
        this.share.emit();
    }
}
