import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfessorSchedule } from './professor-schedule';

describe('ProfessorSchedule', () => {
  let component: ProfessorSchedule;
  let fixture: ComponentFixture<ProfessorSchedule>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfessorSchedule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfessorSchedule);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
