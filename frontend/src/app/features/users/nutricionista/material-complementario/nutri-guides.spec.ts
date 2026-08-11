import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NutriGuides } from './nutri-guides';

describe('NutriGuides', () => {
  let component: NutriGuides;
  let fixture: ComponentFixture<NutriGuides>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NutriGuides]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NutriGuides);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
