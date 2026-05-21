import { TestBed } from '@angular/core/testing';

import { Marche } from './marche';

describe('Marche', () => {
  let service: Marche;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Marche);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
