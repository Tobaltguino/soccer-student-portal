import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KineSchedule } from './kine-schedule';

describe('KineSchedule', () => {
  let component: KineSchedule;
  let fixture: ComponentFixture<KineSchedule>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KineSchedule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KineSchedule);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
