import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateJobForm } from './create-job-form';

describe('CreateJobForm', () => {
  let component: CreateJobForm;
  let fixture: ComponentFixture<CreateJobForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateJobForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateJobForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
