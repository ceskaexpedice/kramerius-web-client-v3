import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';

export interface LicenseInfoDialogData {
    title: string;
    content: string;
    /**
     * True when `title`/`content` are already-resolved strings (e.g. HTML loaded from
     * a license's `messagePages`) rather than translation keys. Callers that pass raw
     * content must set this so the template renders it verbatim instead of pushing it
     * through the translate pipe.
     */
    raw?: boolean;
}

@Component({
    selector: 'app-license-info-dialog',
    imports: [TranslatePipe],
    templateUrl: './license-info-dialog.component.html',
    styleUrls: ['./license-info-dialog.component.scss', '../generic-dialog.scss']
})
export class LicenseInfoDialogComponent {
    readonly dialogRef = inject(MatDialogRef<LicenseInfoDialogComponent>);
    readonly data = inject<LicenseInfoDialogData>(MAT_DIALOG_DATA);

    onClose(): void {
        this.dialogRef.close();
    }
}
