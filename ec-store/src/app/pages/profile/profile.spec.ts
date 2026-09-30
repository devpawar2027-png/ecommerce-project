import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ProfileComponent } from './profile';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let authService: AuthService;
  let profileService: ProfileService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideHttpClient(),
        provideRouter([{ path: 'login', component: class {} }]),
      ],
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    profileService = TestBed.inject(ProfileService);
    router = TestBed.inject(Router);

    // Seed mock logged-in user
    authService.currentUser.set({
      id: '123',
      name: 'Alice Smith',
      email: 'alice@example.com',
      gender: 'Female',
      mobile: '9876543210',
      address: '123 Main St',
    });

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load logged in user data from AuthService on ngOnInit', () => {
    expect(component.name).toBe('Alice Smith');
    expect(component.email).toBe('alice@example.com');
    expect(component.gender).toBe('Female');
    expect(component.mobile).toBe('9876543210');
    expect(component.address).toBe('123 Main St');
  });

  it('should switch activeTab when selectTab is called', () => {
    expect(component.activeTab).toBe('profile');
    component.selectTab('addresses');
    expect(component.activeTab).toBe('addresses');
    component.selectTab('profile');
    expect(component.activeTab).toBe('profile');
  });

  it('should update profile via ProfileService and update currentUser signal and localStorage on success', () => {
    const updateSpy = vi.spyOn(profileService, 'updateProfile').mockReturnValue(
      of({ message: 'User updated successfully' })
    );

    component.name = 'Alice Johnson';
    component.mobile = '9999988888';
    component.updateProfile();

    expect(updateSpy).toHaveBeenCalledWith('123', {
      name: 'Alice Johnson',
      email: 'alice@example.com',
      password: '',
      confirm_password: '',
      gender: 'Female',
      mobile: '9999988888',
      address: '123 Main St',
      profile_photo: '',
    });

    expect(authService.currentUser()?.name).toBe('Alice Johnson');
    expect(authService.currentUser()?.mobile).toBe('9999988888');
    expect(component.successMessage).toBe('Profile Updated Successfully');

    const stored = JSON.parse(localStorage.getItem('ec_store_current_user') || '{}');
    expect(stored.name).toBe('Alice Johnson');
  });

  it('should display error message if updateProfile API fails', () => {
    vi.spyOn(profileService, 'updateProfile').mockReturnValue(
      throwError(() => ({ error: { detail: 'Server database error' } }))
    );

    component.updateProfile();

    expect(component.errorMessage).toBe('Server database error');
  });

  it('should logout and navigate to /login when logout is called', () => {
    const logoutSpy = vi.spyOn(authService, 'logout');
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.logout();

    expect(logoutSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
