import {Component, EventEmitter, HostListener, inject, Input, Output, signal} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {NgForOf, NgIf} from '@angular/common';
import {BreakpointService} from '../../services/breakpoint.service';

export interface DialogSection {
  key: string;
  label: string;
  icon: string;
  component?: any;
  isTitle?: boolean;
  children?: DialogSection[];
  isAction?: boolean;
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
  @Output() actionClick = new EventEmitter<string>();

  private breakpointService = inject(BreakpointService);

  activeSection = signal<string>('');
  isMobile = signal<boolean>(false);
  showMobileContent = signal<boolean>(false);

  ngOnInit() {
    this.checkMobileView();
    if (this.config.sections.length > 0) {
      const firstSection = this.config.sections[0];
      if (firstSection.isTitle && firstSection.children?.length) {
        this.activeSection.set(firstSection.children[0].key);
      } else {
        this.activeSection.set(firstSection.key);
      }
    }
  }

  checkMobileView() {
    this.isMobile.set(this.breakpointService.isMobile());
    //
    // const wasMobile = this.isMobile();
    // this.isMobile.set(window.innerWidth <= 768);
    //
    // // If transitioning from mobile to desktop, reset mobile content view
    // if (wasMobile && !this.isMobile()) {
    //   this.showMobileContent.set(false);
    // }
  }

  setActiveSection(key: string) {
    this.activeSection.set(key);
    this.sectionChange.emit(key);

    // On mobile, show content view when section is selected
    if (this.isMobile()) {
      this.showMobileContent.set(true);
    }
  }

  goBackToSidebar() {
    this.showMobileContent.set(false);
  }

  getActiveSectionLabel(): string {
    const activeKey = this.activeSection();

    // Search in all sections
    for (const section of this.config.sections) {
      // Check if it's a child section
      if (section.children) {
        const child = section.children.find(c => c.key === activeKey);
        if (child) {
          return child.label;
        }
      }
      // Check if it's a regular section
      if (section.key === activeKey) {
        return section.label;
      }
    }

    return '';
  }

  onActionClick(key: string) {
    this.actionClick.emit(key);
  }

  onSave() {
    this.save.emit();
  }

  onClose() {
    this.close.emit();
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
