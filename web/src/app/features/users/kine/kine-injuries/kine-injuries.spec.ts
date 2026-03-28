import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KineInjuries } from './kine-injuries';

describe('KineInjuries', () => {
  let component: KineInjuries;
  let fixture: ComponentFixture<KineInjuries>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KineInjuries]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KineInjuries);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
