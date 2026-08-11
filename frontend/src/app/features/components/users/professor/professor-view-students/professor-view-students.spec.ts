import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfessorViewStudents } from './professor-view-students';

describe('ProfessorViewStudents', () => {
  let component: ProfessorViewStudents;
  let fixture: ComponentFixture<ProfessorViewStudents>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfessorViewStudents]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfessorViewStudents);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
