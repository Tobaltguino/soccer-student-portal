import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KineKinesiology } from './kine-kinesiology';

describe('KineKinesiology', () => {
  let component: KineKinesiology;
  let fixture: ComponentFixture<KineKinesiology>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KineKinesiology]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KineKinesiology);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
