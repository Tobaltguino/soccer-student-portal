import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentClasses } from './student-classes';

describe('StudentClasses', () => {
  let component: StudentClasses;
  let fixture: ComponentFixture<StudentClasses>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentClasses]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudentClasses);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
