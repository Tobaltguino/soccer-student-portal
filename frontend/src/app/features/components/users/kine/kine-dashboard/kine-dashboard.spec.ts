import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KineDashboard } from './kine-dashboard';

describe('KineDashboard', () => {
  let component: KineDashboard;
  let fixture: ComponentFixture<KineDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KineDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KineDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
