import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KineEvolutionRecord } from './kine-evolution-record';

describe('KineEvolutionRecord', () => {
  let component: KineEvolutionRecord;
  let fixture: ComponentFixture<KineEvolutionRecord>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KineEvolutionRecord]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KineEvolutionRecord);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
