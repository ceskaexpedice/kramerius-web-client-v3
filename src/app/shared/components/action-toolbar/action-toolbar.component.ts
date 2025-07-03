import {AfterContentInit, Component, ContentChild, ElementRef} from '@angular/core';
import {NgIf} from '@angular/common';

@Component({
  selector: 'app-action-toolbar',
  imports: [
    NgIf,
  ],
  templateUrl: './action-toolbar.component.html',
  styleUrl: './action-toolbar.component.scss'
})
export class ActionToolbarComponent implements AfterContentInit {

  @ContentChild('centerContent', { read: ElementRef }) centerContentRef?: ElementRef;
  hasCenterContent = false;

  ngAfterContentInit(): void {
    this.hasCenterContent = !!this.centerContentRef?.nativeElement?.childNodes?.length;
  }
}
