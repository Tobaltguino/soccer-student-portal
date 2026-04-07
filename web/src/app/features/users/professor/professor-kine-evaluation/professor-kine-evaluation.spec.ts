import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfessorKineEvaluation } from './professor-kine-evaluation';

describe('ProfessorKineEvaluation', () => {
  let component: ProfessorKineEvaluation;
  let fixture: ComponentFixture<ProfessorKineEvaluation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfessorKineEvaluation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfessorKineEvaluation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
