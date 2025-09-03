import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PersonalBlocker } from './personal-blocker';

describe('PersonalBlocker', () => {
  let component: PersonalBlocker;
  let fixture: ComponentFixture<PersonalBlocker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PersonalBlocker]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PersonalBlocker);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
