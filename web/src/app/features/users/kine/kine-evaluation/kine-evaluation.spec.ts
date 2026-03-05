import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KineEvaluation } from './kine-evaluation';

describe('KineEvaluation', () => {
  let component: KineEvaluation;
  let fixture: ComponentFixture<KineEvaluation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KineEvaluation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KineEvaluation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
