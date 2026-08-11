import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KineViewGuides } from './kine-view-guides';

describe('KineViewGuides', () => {
  let component: KineViewGuides;
  let fixture: ComponentFixture<KineViewGuides>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KineViewGuides]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KineViewGuides);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
