import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminEvaluationsCom } from './admin-evaluations';

describe('AdminEvaluations', () => {
  let component: AdminEvaluations;
  let fixture: ComponentFixture<AdminEvaluations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminEvaluations]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminEvaluations);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
