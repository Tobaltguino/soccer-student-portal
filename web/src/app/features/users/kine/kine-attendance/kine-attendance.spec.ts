import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KineAttendance } from './kine-attendance';

describe('KineAttendance', () => {
  let component: KineAttendance;
  let fixture: ComponentFixture<KineAttendance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KineAttendance]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KineAttendance);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
