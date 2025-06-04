import {Component, EventEmitter, inject, Input, Output, signal} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {TranslatePipe} from '@ngx-translate/core';
import {NgForOf, NgIf} from '@angular/common';

export interface DialogSection {
  key: string;
  label: string;
  icon: string;
  component?: any;
}

export interface DialogConfig {
  title: string;
  sections: DialogSection[];
  showSaveButton?: boolean;
  showCancelButton?: boolean;
  saveButtonLabel?: string;
  cancelButtonLabel?: string;
}

@Component({
  selector: 'app-sidebar-dialog-layout',
  imports: [
    TranslatePipe,
    NgForOf,
    NgIf,
  ],
  templateUrl: './sidebar-dialog-layout.component.html',
  styleUrl: './sidebar-dialog-layout.component.scss'
})
export class SidebarDialogLayoutComponent {
  @Input() config!: DialogConfig;
  @Output() save = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();
  @Output() sectionChange = new EventEmitter<string>();

  private dialogRef = inject(MatDialogRef<SidebarDialogLayoutComponent>, { optional: true });

  activeSection = signal<string>('');

  ngOnInit() {
    if (this.config.sections.length > 0) {
      this.activeSection.set(this.config.sections[0].key);
    }
  }

  setActiveSection(key: string) {
    this.activeSection.set(key);
    this.sectionChange.emit(key);
  }

  onSave() {
    this.save.emit();
  }

  onClose() {
    this.close.emit();
    this.dialogRef?.close();
  }
}
