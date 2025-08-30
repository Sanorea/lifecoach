import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailySchedule } from './daily-schedule';

describe('DailySchedule', () => {
  let component: DailySchedule;
  let fixture: ComponentFixture<DailySchedule>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DailySchedule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DailySchedule);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
