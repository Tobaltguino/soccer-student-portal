import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KineInjuryTracking } from './kine-injury-tracking';

describe('KineInjuryTracking', () => {
  let component: KineInjuryTracking;
  let fixture: ComponentFixture<KineInjuryTracking>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KineInjuryTracking]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KineInjuryTracking);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
