import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegularTasks } from './regular-tasks';

describe('RegularTasks', () => {
  let component: RegularTasks;
  let fixture: ComponentFixture<RegularTasks>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegularTasks]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegularTasks);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
