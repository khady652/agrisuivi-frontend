import { TestBed } from '@angular/core/testing';

import { Public } from './public';

describe('Public', () => {
  let service: Public;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Public);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
