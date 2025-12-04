import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import {ENVIRONMENT} from '../../../app.config';

@Component({
  selector: 'app-server-error-dialog',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './server-error-dialog.component.html',
  styleUrl: './server-error-dialog.component.scss'
})
export class ServerErrorDialogComponent {
  contactEmail = ENVIRONMENT.contactEmail;

  constructor(
    private dialogRef: MatDialogRef<ServerErrorDialogComponent>
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }
}
