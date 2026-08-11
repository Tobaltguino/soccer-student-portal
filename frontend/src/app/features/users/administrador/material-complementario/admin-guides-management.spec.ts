import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminGuidesManagement } from './admin-guides-management';

describe('AdminGuidesManagement', () => {
  let component: AdminGuidesManagement;
  let fixture: ComponentFixture<AdminGuidesManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminGuidesManagement]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminGuidesManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
