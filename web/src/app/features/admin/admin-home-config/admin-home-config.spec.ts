import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminHomeConfig } from './admin-home-config';

describe('AdminHomeConfig', () => {
  let component: AdminHomeConfig;
  let fixture: ComponentFixture<AdminHomeConfig>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminHomeConfig]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminHomeConfig);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
