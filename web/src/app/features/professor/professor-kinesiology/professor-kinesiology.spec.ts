import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfessorKinesiology } from './professor-kinesiology';

describe('ProfessorKinesiology', () => {
  let component: ProfessorKinesiology;
  let fixture: ComponentFixture<ProfessorKinesiology>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfessorKinesiology]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfessorKinesiology);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
