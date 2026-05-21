import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableauPrix } from './tableau-prix';

describe('TableauPrix', () => {
  let component: TableauPrix;
  let fixture: ComponentFixture<TableauPrix>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableauPrix]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableauPrix);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
