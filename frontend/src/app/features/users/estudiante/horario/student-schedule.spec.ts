import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentSchedule } from './student-schedule';

describe('StudentSchedule', () => {
  let component: StudentSchedule;
  let fixture: ComponentFixture<StudentSchedule>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentSchedule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudentSchedule);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
