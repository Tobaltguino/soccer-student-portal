import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewTeachers } from './view-teachers';

describe('ViewTeachers', () => {
  let component: ViewTeachers;
  let fixture: ComponentFixture<ViewTeachers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewTeachers]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewTeachers);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
