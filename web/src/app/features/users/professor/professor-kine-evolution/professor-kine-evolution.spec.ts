import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfessorKineEvolution } from './professor-kine-evolution';

describe('ProfessorKineEvolution', () => {
  let component: ProfessorKineEvolution;
  let fixture: ComponentFixture<ProfessorKineEvolution>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfessorKineEvolution]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfessorKineEvolution);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
