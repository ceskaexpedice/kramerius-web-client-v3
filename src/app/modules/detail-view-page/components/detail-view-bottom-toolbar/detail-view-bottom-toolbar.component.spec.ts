import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailViewBottomToolbarComponent } from './detail-view-bottom-toolbar.component';

describe('DetailViewBottomToolbarComponent', () => {
  let component: DetailViewBottomToolbarComponent;
  let fixture: ComponentFixture<DetailViewBottomToolbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailViewBottomToolbarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetailViewBottomToolbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
