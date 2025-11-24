import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

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
