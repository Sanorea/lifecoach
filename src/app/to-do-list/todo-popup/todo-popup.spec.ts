import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TodoPopup } from './todo-popup';

describe('TodoPopup', () => {
  let component: TodoPopup;
  let fixture: ComponentFixture<TodoPopup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TodoPopup]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TodoPopup);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
