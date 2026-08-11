import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KinePatients } from './kine-patients';

describe('KinePatients', () => {
  let component: KinePatients;
  let fixture: ComponentFixture<KinePatients>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KinePatients]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KinePatients);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
