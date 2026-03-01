import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NutriEvaluation } from './nutri-evaluation';

describe('NutriEvaluation', () => {
  let component: NutriEvaluation;
  let fixture: ComponentFixture<NutriEvaluation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NutriEvaluation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NutriEvaluation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
