import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentKine } from './student-kine';

describe('StudentKine', () => {
  let component: StudentKine;
  let fixture: ComponentFixture<StudentKine>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentKine]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudentKine);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
