import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeworkPopup } from './homework-popup';

describe('HomeworkPopup', () => {
  let component: HomeworkPopup;
  let fixture: ComponentFixture<HomeworkPopup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeworkPopup]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeworkPopup);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
