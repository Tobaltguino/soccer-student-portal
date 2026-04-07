import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentKineEvolution } from './student-kine-evolution';

describe('StudentKineEvolution', () => {
  let component: StudentKineEvolution;
  let fixture: ComponentFixture<StudentKineEvolution>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentKineEvolution]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudentKineEvolution);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
