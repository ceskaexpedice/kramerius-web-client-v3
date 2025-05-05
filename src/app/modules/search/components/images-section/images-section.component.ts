import { Component } from '@angular/core';
import {MatButton} from '@angular/material/button';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-images-section',
  imports: [
    TranslatePipe,
  ],
  templateUrl: './images-section.component.html',
  styleUrl: './images-section.component.scss'
})
export class ImagesSectionComponent {

}
