import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfessorViewGuides } from './professor-view-guides';

describe('ProfessorViewGuides', () => {
  let component: ProfessorViewGuides;
  let fixture: ComponentFixture<ProfessorViewGuides>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfessorViewGuides]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfessorViewGuides);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
