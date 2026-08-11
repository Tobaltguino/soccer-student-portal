import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KineClasses } from './kine-classes';

describe('KineClasses', () => {
  let component: KineClasses;
  let fixture: ComponentFixture<KineClasses>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KineClasses]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KineClasses);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
