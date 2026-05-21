import { TestBed } from '@angular/core/testing';

import { Culture } from './culture';

describe('Culture', () => {
  let service: Culture;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Culture);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
