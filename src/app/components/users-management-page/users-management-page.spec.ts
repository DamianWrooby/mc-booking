import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UsersManagementPage } from './users-management-page';

describe('UsersManagementPage', () => {
  let component: UsersManagementPage;
  let fixture: ComponentFixture<UsersManagementPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersManagementPage],
    }).compileComponents();

    fixture = TestBed.createComponent(UsersManagementPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
