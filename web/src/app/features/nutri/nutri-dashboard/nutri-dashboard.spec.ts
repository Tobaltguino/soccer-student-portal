import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NutriDashboard } from './nutri-dashboard';

describe('NutriDashboard', () => {
  let component: NutriDashboard;
  let fixture: ComponentFixture<NutriDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NutriDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NutriDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
