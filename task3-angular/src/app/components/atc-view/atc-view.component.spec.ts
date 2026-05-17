import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AtcViewComponent } from './atc-view.component';

describe('AtcViewComponent', () => {
  let component: AtcViewComponent;
  let fixture: ComponentFixture<AtcViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AtcViewComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AtcViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
