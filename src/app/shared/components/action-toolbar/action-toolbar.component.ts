import {AfterContentInit, Component, ContentChild, ElementRef, Input} from '@angular/core';
import {NgIf} from '@angular/common';

@Component({
  selector: 'app-action-toolbar',
  imports: [
    NgIf,
  ],
  templateUrl: './action-toolbar.component.html',
  styleUrl: './action-toolbar.component.scss'
})
export class ActionToolbarComponent {

  @Input() hasCenterContent = false;

}
