import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KineEvaluationsKine } from './kine-evaluations-kine';

describe('KineEvaluationsKine', () => {
  let component: KineEvaluationsKine;
  let fixture: ComponentFixture<KineEvaluationsKine>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KineEvaluationsKine]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KineEvaluationsKine);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
