import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminKineEvolution } from './admin-kine-evolution';

describe('AdminKineEvolution', () => {
  let component: AdminKineEvolution;
  let fixture: ComponentFixture<AdminKineEvolution>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminKineEvolution]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminKineEvolution);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
