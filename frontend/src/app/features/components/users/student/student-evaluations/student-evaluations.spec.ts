import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentEvaluations } from './student-evaluations';

describe('StudentEvaluations', () => {
  let component: StudentEvaluations;
  let fixture: ComponentFixture<StudentEvaluations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentEvaluations]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudentEvaluations);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
