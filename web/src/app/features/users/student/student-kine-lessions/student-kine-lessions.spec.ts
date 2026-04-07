import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentKineLessions } from './student-kine-lessions';

describe('StudentKineLessions', () => {
  let component: StudentKineLessions;
  let fixture: ComponentFixture<StudentKineLessions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentKineLessions]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudentKineLessions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
