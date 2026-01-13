import { NgModule } from '@angular/core';
import { SearchPageComponent } from './search-page.component';
import { RouterModule, Routes } from '@angular/router';
import { InstitutionsSectionComponent } from './components/institutions-section/institutions-section.component';
import { AuthorsSectionComponent } from './components/authors-section/authors-section.component';
import { BooksSectionComponent } from './components/books-section/books-section.component';
import { GenresSectionComponent } from './components/genres-section/genres-section.component';
import { PeriodicalsSectionComponent } from './components/periodicals-section/periodicals-section.component';
import { MapSectionComponent } from './components/map-section/map-section.component';
import { DocumentTypesSectionComponent } from './components/document-types-section/document-types-section.component';
import { ImagesSectionComponent } from './components/images-section/images-section.component';
import { HeaderComponent } from '../../core/layout/header/header.component';
import { SearchHeroComponent } from './components/search-hero/search-hero.component';
import { FooterComponent } from '../../core/layout/footer/footer.component';
import { SearchService } from '../../shared/services/search.service';
import { CommonModule } from '@angular/common';
import { DynamicSectionComponent } from './components/dynamic-section/dynamic-section.component';

const routes: Routes = [
  {
    path: '',
    component: SearchPageComponent,
  },
];

@NgModule({
  declarations: [SearchPageComponent],
  imports: [CommonModule, RouterModule.forChild(routes), InstitutionsSectionComponent, AuthorsSectionComponent, BooksSectionComponent, GenresSectionComponent, PeriodicalsSectionComponent, MapSectionComponent, DocumentTypesSectionComponent, ImagesSectionComponent, HeaderComponent, SearchHeroComponent, FooterComponent, DynamicSectionComponent
  ],
  providers: [
    { provide: 'FilterService', useClass: SearchService }
  ]
})
export class SearchPageModule {
}
