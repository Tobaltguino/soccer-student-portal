import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KineNutrition } from './kine-nutrition';

describe('KineNutrition', () => {
  let component: KineNutrition;
  let fixture: ComponentFixture<KineNutrition>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KineNutrition]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KineNutrition);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
