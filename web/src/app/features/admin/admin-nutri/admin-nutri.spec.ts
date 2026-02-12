import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminNutri } from './admin-nutri';

describe('AdminNutri', () => {
  let component: AdminNutri;
  let fixture: ComponentFixture<AdminNutri>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminNutri]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminNutri);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
