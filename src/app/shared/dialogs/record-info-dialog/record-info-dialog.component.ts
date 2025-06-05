import {Component, inject, OnInit, signal} from '@angular/core';
import {DialogConfig, SidebarDialogLayoutComponent} from '../sidebar-dialog-layout/sidebar-dialog-layout.component';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {Metadata} from '../../models/metadata.model';
import {NgForOf, NgIf} from '@angular/common';

@Component({
  selector: 'app-record-info-dialog',
  imports: [
    SidebarDialogLayoutComponent,
    NgIf,
    NgForOf,
  ],
  templateUrl: './record-info-dialog.component.html',
  styleUrl: './record-info-dialog.component.scss'
})
export class RecordInfoDialogComponent implements OnInit {

  dialogConfig: DialogConfig = {
    title: 'record-info-dialog-title',
    showSaveButton: false,
    showCancelButton: true,
    sections: [
      { key: 'meta', label: 'record-info-section-meta', icon: 'icon-textalign-justifycenter' }
    ]
  };

  activeSection = signal<string>('meta');

  private dialogRef = inject(MatDialogRef<RecordInfoDialogComponent>);
  data = inject<Metadata>(MAT_DIALOG_DATA);

  ngOnInit() {
    console.log('MODS Metadata:', this.data);

  }

  objectKeys = Object.keys;

  save() {
    this.dialogRef.close();
  }

  close() {
    this.dialogRef.close();
  }

  onSectionChange(section: string) {
    this.activeSection.set(section);
  }

}
