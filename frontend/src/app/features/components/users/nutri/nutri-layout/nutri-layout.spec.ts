import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NutriLayout } from './nutri-layout';

describe('NutriLayout', () => {
  let component: NutriLayout;
  let fixture: ComponentFixture<NutriLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NutriLayout]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NutriLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
