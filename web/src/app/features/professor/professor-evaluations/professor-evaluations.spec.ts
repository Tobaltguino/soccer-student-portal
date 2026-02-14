import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfessorEvaluations } from './professor-evaluations';

describe('ProfessorEvaluations', () => {
  let component: ProfessorEvaluations;
  let fixture: ComponentFixture<ProfessorEvaluations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfessorEvaluations]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfessorEvaluations);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
