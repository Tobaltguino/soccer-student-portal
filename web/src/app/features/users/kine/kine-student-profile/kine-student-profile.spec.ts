import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KineStudentProfile } from './kine-student-profile';

describe('KineStudentProfile', () => {
  let component: KineStudentProfile;
  let fixture: ComponentFixture<KineStudentProfile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KineStudentProfile]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KineStudentProfile);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
