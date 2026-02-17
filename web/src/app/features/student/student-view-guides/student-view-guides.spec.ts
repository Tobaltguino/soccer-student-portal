import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentViewGuides } from './student-view-guides';

describe('StudentViewGuides', () => {
  let component: StudentViewGuides;
  let fixture: ComponentFixture<StudentViewGuides>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentViewGuides]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudentViewGuides);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
