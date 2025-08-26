import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailyPlan } from './daily-plan';

describe('DailyPlan', () => {
  let component: DailyPlan;
  let fixture: ComponentFixture<DailyPlan>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DailyPlan]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DailyPlan);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
