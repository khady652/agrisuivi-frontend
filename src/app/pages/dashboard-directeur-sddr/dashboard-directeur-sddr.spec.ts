import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardDirecteurSddr } from './dashboard-directeur-sddr';

describe('DashboardDirecteurSddr', () => {
  let component: DashboardDirecteurSddr;
  let fixture: ComponentFixture<DashboardDirecteurSddr>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardDirecteurSddr]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardDirecteurSddr);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
