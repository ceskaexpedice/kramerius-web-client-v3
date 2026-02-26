import { Component, ElementRef, inject, AfterViewInit } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import hljs from 'highlight.js';

@Component({
  selector: 'app-auth-data-dialog',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './auth-data-dialog.component.html',
  styleUrls: ['../../../../../shared/dialogs/generic-dialog.scss', './auth-data-dialog.component.scss'],
})
export class AuthDataDialogComponent implements AfterViewInit {
  private dialogRef = inject(MatDialogRef<AuthDataDialogComponent>, { optional: true });
  private elementRef = inject(ElementRef);
  data = inject<{ userJson: string }>(MAT_DIALOG_DATA);

  get userJson(): string {
    return this.data?.userJson ?? '';
  }

  ngAfterViewInit() {
    const codeBlock = this.elementRef.nativeElement.querySelector('pre code');
    if (codeBlock) {
      hljs.highlightElement(codeBlock as HTMLElement);
    }
  }

  onClose() {
    this.dialogRef?.close();
  }

  onCopy() {
    navigator.clipboard.writeText(this.userJson);
  }
}
