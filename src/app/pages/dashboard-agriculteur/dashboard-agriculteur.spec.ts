import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardAgriculteur } from './dashboard-agriculteur';

describe('DashboardAgriculteur', () => {
  let component: DashboardAgriculteur;
  let fixture: ComponentFixture<DashboardAgriculteur>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardAgriculteur]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardAgriculteur);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
