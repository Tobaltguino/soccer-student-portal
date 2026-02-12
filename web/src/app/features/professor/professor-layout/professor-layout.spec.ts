import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfessorLayout } from './professor-layout';

describe('ProfessorLayout', () => {
  let component: ProfessorLayout;
  let fixture: ComponentFixture<ProfessorLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfessorLayout]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfessorLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
