import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardChefCooperatif } from './dashboard-chef-cooperatif';

describe('DashboardChefCooperatif', () => {
  let component: DashboardChefCooperatif;
  let fixture: ComponentFixture<DashboardChefCooperatif>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardChefCooperatif]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardChefCooperatif);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
