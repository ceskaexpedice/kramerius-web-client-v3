import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgForOf, NgIf } from '@angular/common';
import { Author } from '../../models/metadata.model';

export interface AuthorsDialogData {
  authors: Author[];
  onAuthorClick: (author: Author) => void;
}

@Component({
  selector: 'app-authors-dialog',
  imports: [TranslateModule, NgForOf, NgIf],
  templateUrl: './authors-dialog.component.html',
  styleUrls: ['./authors-dialog.component.scss', '../generic-dialog.scss']
})
export class AuthorsDialogComponent {
  readonly dialogRef = inject(MatDialogRef<AuthorsDialogComponent>);
  readonly data = inject<AuthorsDialogData>(MAT_DIALOG_DATA);
  private translate = inject(TranslateService);

  onClose(): void {
    this.dialogRef.close();
  }

  clickAuthor(author: Author): void {
    this.data.onAuthorClick(author);
    this.dialogRef.close();
  }

  getRole(author: Author): string {
    return author.roles?.length
      ? author.roles.map(r => this.translate.instant(`role.${r}`)).join(', ')
      : '';
  }
}
