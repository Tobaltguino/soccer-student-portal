import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfessorNutrition } from './professor-nutrition';

describe('ProfessorNutrition', () => {
  let component: ProfessorNutrition;
  let fixture: ComponentFixture<ProfessorNutrition>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfessorNutrition]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfessorNutrition);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
