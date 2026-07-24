import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActualizarMontos } from './actualizar-montos';

describe('ActualizarMontos', () => {
  let component: ActualizarMontos;
  let fixture: ComponentFixture<ActualizarMontos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActualizarMontos],
    }).compileComponents();

    fixture = TestBed.createComponent(ActualizarMontos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
