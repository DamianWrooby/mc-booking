import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateJobPage } from './create-job-page';

describe('CreateJobPage', () => {
  let component: CreateJobPage;
  let fixture: ComponentFixture<CreateJobPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateJobPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateJobPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
