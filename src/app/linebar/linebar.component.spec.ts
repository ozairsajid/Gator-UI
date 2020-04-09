import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LinebarComponent } from './linebar.component';

describe('LinebarComponent', () => {
  let component: LinebarComponent;
  let fixture: ComponentFixture<LinebarComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LinebarComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LinebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
