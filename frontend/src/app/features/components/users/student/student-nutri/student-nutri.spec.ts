import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentNutri } from './student-nutri';

describe('StudentNutri', () => {
  let component: StudentNutri;
  let fixture: ComponentFixture<StudentNutri>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentNutri]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudentNutri);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
