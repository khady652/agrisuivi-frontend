import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphiqueProduction } from './graphique-production';

describe('GraphiqueProduction', () => {
  let component: GraphiqueProduction;
  let fixture: ComponentFixture<GraphiqueProduction>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraphiqueProduction]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GraphiqueProduction);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
