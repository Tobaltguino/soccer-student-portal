import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentKineEvaluation } from './student-kine-evaluation';

describe('StudentKineEvaluation', () => {
  let component: StudentKineEvaluation;
  let fixture: ComponentFixture<StudentKineEvaluation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentKineEvaluation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudentKineEvaluation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
