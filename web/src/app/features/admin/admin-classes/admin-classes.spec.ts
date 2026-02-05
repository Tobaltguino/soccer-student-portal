import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminClasses } from './admin-classes';

describe('AdminClasses', () => {
  let component: AdminClasses;
  let fixture: ComponentFixture<AdminClasses>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminClasses]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminClasses);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
