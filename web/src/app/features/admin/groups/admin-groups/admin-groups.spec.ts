import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminGroups } from './admin-groups';

describe('AdminGroups', () => {
  let component: AdminGroups;
  let fixture: ComponentFixture<AdminGroups>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminGroups]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminGroups);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
