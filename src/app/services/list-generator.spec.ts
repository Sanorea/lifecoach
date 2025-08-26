import { TestBed } from '@angular/core/testing';

import { ListGenerator } from './list-generator';

describe('ListGenerator', () => {
  let service: ListGenerator;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ListGenerator);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
