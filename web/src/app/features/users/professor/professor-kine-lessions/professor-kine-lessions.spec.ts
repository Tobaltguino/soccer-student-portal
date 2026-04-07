import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfessorKineLessions } from './professor-kine-lessions';

describe('ProfessorKineLessions', () => {
  let component: ProfessorKineLessions;
  let fixture: ComponentFixture<ProfessorKineLessions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfessorKineLessions]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfessorKineLessions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
