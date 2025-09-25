import {Component, EventEmitter, inject, Input, Output, signal} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {TranslatePipe} from '@ngx-translate/core';
import {NgForOf, NgIf} from '@angular/common';

export interface DialogSection {
  key: string;
  label: string;
  icon: string;
  component?: any;
  isTitle?: boolean;
  children?: DialogSection[];
}

export interface DialogButton {
  label: string;
  action: string;
  class?: string;
  disabled?: boolean | (() => boolean);
  icon?: string;
}

export interface DialogConfig {
  title: string;
  subtitle?: string;
  sections: DialogSection[];
  showSaveButton?: boolean;
  showCancelButton?: boolean;
  saveButtonLabel?: string;
  cancelButtonLabel?: string;
  customButtons?: DialogButton[];
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
  @Output() customButtonClick = new EventEmitter<string>();

  private dialogRef = inject(MatDialogRef<SidebarDialogLayoutComponent>, { optional: true });

  activeSection = signal<string>('');

  ngOnInit() {
    if (this.config.sections.length > 0) {
      const firstSection = this.config.sections[0];
      if (firstSection.isTitle && firstSection.children?.length) {
        this.activeSection.set(firstSection.children[0].key);
      } else {
        this.activeSection.set(firstSection.key);
      }
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

  onCustomButtonClick(action: string) {
    this.customButtonClick.emit(action);
  }

  isButtonDisabled(button: DialogButton): boolean {
    if (typeof button.disabled === 'function') {
      return button.disabled();
    }
    return button.disabled || false;
  }
}
