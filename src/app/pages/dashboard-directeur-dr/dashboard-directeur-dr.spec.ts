import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardDirecteurDr } from './dashboard-directeur-dr';

describe('DashboardDirecteurDr', () => {
  let component: DashboardDirecteurDr;
  let fixture: ComponentFixture<DashboardDirecteurDr>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardDirecteurDr]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardDirecteurDr);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
