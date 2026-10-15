import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AceptacionesLegales } from './aceptaciones-legales';

describe('AceptacionesLegales', () => {
  let component: AceptacionesLegales;
  let fixture: ComponentFixture<AceptacionesLegales>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AceptacionesLegales]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AceptacionesLegales);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
