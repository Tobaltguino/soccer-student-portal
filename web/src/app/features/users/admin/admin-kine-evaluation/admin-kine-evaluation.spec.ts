import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminKineEvaluation } from './admin-kine-evaluation';

describe('AdminKineEvaluation', () => {
  let component: AdminKineEvaluation;
  let fixture: ComponentFixture<AdminKineEvaluation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminKineEvaluation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminKineEvaluation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
