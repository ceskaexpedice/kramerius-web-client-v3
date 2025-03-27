import { Component } from '@angular/core';
import {NgForOf} from '@angular/common';
import {CategoryItemComponent} from '../../../../shared/components/category-item/category-item.component';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-genres-section',
  imports: [
    NgForOf,
    CategoryItemComponent,
    TranslatePipe,
  ],
  templateUrl: './genres-section.component.html',
  styleUrl: './genres-section.component.scss'
})
export class GenresSectionComponent {

  genres = [
    { icon: 'assets/icons/genre-graphic.svg', label: 'Graphic', count: 1800 },
    { icon: 'assets/icons/genre-listy.svg', label: 'Grafické listy', count: 1320 },
    { icon: 'assets/icons/genre-mapy.svg', label: 'Historické mapy', count: 1020 },
    { icon: 'assets/icons/genre-veduty.svg', label: 'Veduty', count: 960 },
    { icon: 'assets/icons/genre-graphic.svg', label: 'Graphic', count: 1800 },
    { icon: 'assets/icons/genre-listy.svg', label: 'Grafické listy', count: 1320 },
    { icon: 'assets/icons/genre-mapy.svg', label: 'Historické mapy', count: 1020 },
    { icon: 'assets/icons/genre-veduty.svg', label: 'Veduty', count: 960 },
    { icon: 'assets/icons/genre-graphic.svg', label: 'Graphic', count: 1800 },
    { icon: 'assets/icons/genre-listy.svg', label: 'Grafické listy', count: 1320 },
    { icon: 'assets/icons/genre-mapy.svg', label: 'Historické mapy', count: 1020 },
    { icon: 'assets/icons/genre-veduty.svg', label: 'Veduty', count: 960 },
    { icon: 'assets/icons/genre-graphic.svg', label: 'Graphic', count: 1800 },
    { icon: 'assets/icons/genre-listy.svg', label: 'Grafické listy', count: 1320 },
    { icon: 'assets/icons/genre-mapy.svg', label: 'Historické mapy', count: 1020 },
    { icon: 'assets/icons/genre-veduty.svg', label: 'Veduty', count: 960 }
    // ...ďalšie
  ];

}
