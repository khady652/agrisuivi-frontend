import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CarteSig } from './carte-sig';

describe('CarteSig', () => {
  let component: CarteSig;
  let fixture: ComponentFixture<CarteSig>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarteSig]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CarteSig);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
