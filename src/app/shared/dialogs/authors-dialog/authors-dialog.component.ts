import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Author } from '../../models/metadata.model';

export interface AuthorsDialogData {
  authors: Author[];
  onAuthorClick: (author: Author) => void;
}

export function buildNkpAuthorityUrl(identifier: string): string {
  const normalizedIdentifier = identifier.trim();

  const params = new URLSearchParams({
    func: 'find-c',
    local_base: 'aut',
    ccl_term: `ica=${normalizedIdentifier}`,
  });

  return `https://aleph.nkp.cz/F/?${params.toString()}`;
}

@Component({
  selector: 'app-authors-dialog',
  imports: [TranslatePipe],
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

  getNameIdentifier(author: Author): string {
    return author.identifiers?.[0]?.value ?? '';
  }

  openAuthority(identifier: string): void {
    window.open(buildNkpAuthorityUrl(identifier), '_blank', 'noopener,noreferrer');
  }
}
