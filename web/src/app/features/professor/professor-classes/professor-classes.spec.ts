import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfessorClasses } from './professor-classes';

describe('ProfessorClasses', () => {
  let component: ProfessorClasses;
  let fixture: ComponentFixture<ProfessorClasses>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfessorClasses]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfessorClasses);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
