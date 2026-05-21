import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardDecideur } from './dashboard-decideur';

describe('DashboardDecideur', () => {
  let component: DashboardDecideur;
  let fixture: ComponentFixture<DashboardDecideur>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardDecideur]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardDecideur);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
