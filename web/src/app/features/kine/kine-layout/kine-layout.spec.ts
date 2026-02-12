import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KineLayout } from './kine-layout';

describe('KineLayout', () => {
  let component: KineLayout;
  let fixture: ComponentFixture<KineLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KineLayout]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KineLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
