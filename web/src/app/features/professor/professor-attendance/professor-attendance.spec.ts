import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfessorAttendance } from './professor-attendance';

describe('ProfessorAttendance', () => {
  let component: ProfessorAttendance;
  let fixture: ComponentFixture<ProfessorAttendance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfessorAttendance]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfessorAttendance);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
