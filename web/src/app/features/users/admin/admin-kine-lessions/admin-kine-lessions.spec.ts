import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminKineLessions } from './admin-kine-lessions';

describe('AdminKineLessions', () => {
  let component: AdminKineLessions;
  let fixture: ComponentFixture<AdminKineLessions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminKineLessions]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminKineLessions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
