import { Component } from '@angular/core';
import {LangPickerComponent} from '../../../shared/translation/lang-picker/lang-picker.component';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  imports: [
    LangPickerComponent
  ],
  styleUrl: './header.component.scss',
})
export class HeaderComponent {

}
