import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {MusicPageComponent} from "./music-page.component";
import {DetailViewPageComponent} from "../detail-view-page/detail-view-page.component";

const routes: Routes = [
  {
    path: ':uuid', component: DetailViewPageComponent
  }
]

@NgModule({
  declarations: [
  ],
  imports: [
    RouterModule.forChild(routes),
  ],
  providers: [
  ]

})

export class MusicPageModule {}
