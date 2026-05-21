import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardEnqueteur } from './dashboard-enqueteur';

describe('DashboardEnqueteur', () => {
  let component: DashboardEnqueteur;
  let fixture: ComponentFixture<DashboardEnqueteur>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardEnqueteur]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardEnqueteur);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
