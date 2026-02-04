import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';

export interface LicenseInfoDialogData {
    title: string;
    content: string;
}

@Component({
    selector: 'app-license-info-dialog',
    imports: [TranslateModule],
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
