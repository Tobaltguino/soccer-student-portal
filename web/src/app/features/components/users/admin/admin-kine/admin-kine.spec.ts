import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminKine } from './admin-kine';

describe('AdminKine', () => {
  let component: AdminKine;
  let fixture: ComponentFixture<AdminKine>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminKine]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminKine);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
